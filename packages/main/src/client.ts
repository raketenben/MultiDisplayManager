import type { BrowserWindow} from 'electron';
import { ipcMain} from 'electron';
import {app} from 'electron';

import State from './state';

import Store from 'electron-store';

import forge from 'node-forge';

import https from 'https';
import express from 'express';
import type bonjour from 'bonjour';

import CertificateManager from './lib/certificateManager';
import InstanceHelper from './lib/instanceHelper';
import FileManager from './lib/fileManager';

import multiparty from 'multiparty';
import mime from 'mime-types';

import crypto from 'crypto';

const randomstring = require('randomstring');

class Client extends State {

    store! : Store;

    fileManager : FileManager;

    timeout: null | NodeJS.Timeout;
    fileIndex : number;

    interval : number;
    identifie: number;
    blackout: boolean;

    pairingMode : boolean;

    pairingKey! : string;
    authTokens : string[];

    bonjourService! : bonjour.Service | null;
    serverInstance! : https.Server;
    expressInstance! : express.Application;

    port! : number;

    constructor(_win : BrowserWindow){
        super(_win);

        this.name = 'Client';
        
        this.store = new Store({cwd: InstanceHelper.getInstanceSavePath(),name:'client'});

        this.fileManager = new FileManager();

        this.timeout = null;
        this.fileIndex = 0;

        this.interval = this.store.get('interval',5) as number;
        this.identifie = 0;
        this.blackout = false;

        this.pairingMode = false || process.argv.includes('--pairing');

        this.bonjourService = null;

        this.authTokens = this.store.get('authTokens',[]) as string[];

        //Set window to kiosk mode
        if(import.meta.env.MODE !== 'development') _win.setKiosk(true);

        return this;
    }

    override async init() : Promise<void> {
        await super.init();
        
        app.on('before-quit',() => {
            if(this.bonjourService?.published){
                this.bonjourService?.stop(() => {
                    this.window.close();
                });
            }
        });

        await this.handleRenderer();
        
        await this.updateDisplayFile();

        await this.initServerInstance();

        this.fileManager.emitter.on('filesUpdated',async () => {
            this.updateDisplayFile();
        });

        //generate pairing key
        this.newPairingKey();
    }

    async handleRenderer() : Promise<void> {

        /* display name*/
        ipcMain.handle('getDisplayName',() => {
            return this.getDisplayName();
        });

        ipcMain.handle('setDisplayName',(e,name : string) => {
            this.setDisplayName(name);
            this.updateBonjourService();
            return true;
        });

        //get pairing key
        ipcMain.handle('getPairingKey',() => {
            return (this.pairingMode) ? this.pairingKey : null;
        });


        /* handle password check */
        ipcMain.handle('unlock',(e,password) => {
            if(this.checkPassword(password)){
                this.pairingMode = true;
                this.updateBonjourService();
                return true;
            }else{
                return false;
            }
        });

        ipcMain.handle('lock',() => {
            this.pairingMode = false;
            this.updateBonjourService();
        });

        /* password change */
        ipcMain.handle('changePassword',(e,oldPassword,newPassword) => {
            if(this.checkPassword(oldPassword)){
                this.setPassword(newPassword);
                return true;
            }else{
                return false;
            }
        });

        /* utility function update */
        ipcMain.on('updateBlackout',(e) => {
            e.reply('blackoutUpdated',this.blackout);
        });

        ipcMain.on('updateIdentifie',(e) => {
            e.reply('identifieUpdated',this.identifie);
        });

        /* send current display file on init*/
        ipcMain.on('updateDisplayFile',async () => {
            this.updateDisplayFile();
        });

        /* media events*/
        ipcMain.handle('imageLoaded',() => {
            this.timeout = setTimeout(this.nextFile.bind(this),this.interval * 1000);
        });

        ipcMain.handle('loadError',() => {
            this.nextFile();
        });

        ipcMain.handle('videoFinished',() => {
            this.nextFile();
        });
    }

    async initServerInstance() : Promise<void> {
        //get certificate
        const cert = CertificateManager.getCertificate();
        const priavteKey = forge.pki.privateKeyToPem(CertificateManager.getCertificateKeys().privateKey);

        const serverOptions = {
            key: priavteKey,
            cert: cert,
        };

        //server
        this.expressInstance = express();
        this.serverInstance = https.createServer(serverOptions,this.expressInstance);

        /*simple reponse for availability checks*/
        this.expressInstance.get('/',(req,res) => {
            res.send('OK');
        });

        this.expressInstance.post('/pair',(req,res) => {
            if(this.pairingMode){
                let data = '';
                req.on('data', chunk => {
                data += chunk;
                });
                req.on('end', () => {
                    if(this.checkPairingSum(data)){
                        //generater auth token
                        const authToken = this.newRandomAuthToken();
                        this.authTokens.push(authToken);
                        this.storeAuthTokens();

                        //close pairing mode
                        this.window.webContents.send('displaySucessfullyPaired');

                        //generate new pairing key
                        this.newPairingKey();

                        //send auth token
                        res.send(authToken);
                    }else{
                        res.status(401).send('Invalid key');
                    }
                });
            }else{
                res.status(403).send('Pairing mode disabled');
            }
        });

        /* auth for commands */
        const api = express.Router();
        this.expressInstance.use('/api',api);

        //key check
        api.use((req, res, next) => {
            //get token
            const token = req.headers.authorization?.split(' ')[1] || null;
            if(!token) return res.status(401).send('Unauthorized');
            
            //check if token is valid
            if(!this.authTokens.includes(token)) return res.status(401).send('Unauthorized');
            
            //continue
            next();
        });

        api.get('/',(req,res) => {
            res.send('OK');
        });

        /* change client name*/
        //unused
        /*api.post('/name',(req,res) => {
            this.store.set('displayName',req.body.displayName);
            res.send('OK');
        });*/

        api.get('/interval',(req,res) => {
            res.json(this.interval);
        });

        /* commands */
        api.post('/interval/:value',(req,res) => {
            this.interval = parseFloat(req.params.value);
            this.storeInterval();
            res.status(200).send('OK');
        });

        api.post('/identifie/:value',(req,res) => {
            this.identifie = parseInt(req.params.value);
            res.status(200).send('OK');
            this.window.webContents.send('identifieUpdated',this.identifie);
        });

        api.post('/blackout/:state',(req,res) => {
            this.blackout = (req.params.state === 'true');
            res.status(200).send('OK');
            this.window.webContents.send('blackoutUpdated',this.blackout);
        });

        //get list of files
        api.get('/files',async (req,res) => {
            res.header('Content-Type', 'application/json');
            const files = await this.fileManager.getFiles();
            res.json(files);
        });

        //file uplaod
        api.post('/files',(req,res) => {
            const form : multiparty.Form = new multiparty.Form();
            form.on('part',(part) => {
                this.fileManager.addFile(part.filename,part);
            });
            form.parse(req);
            form.on('close', function() {
                res.status(200).end();
            });
        });

        //change order of files
        api.post('/files/reorder/:old/:new',(req,res) => {
            if(req.params.old && req.params.new){
                const from = parseInt(req.params.old);
                const to = parseInt(req.params.new);
                this.fileManager.reorderFiles(from,to);
                res.send('OK');
            }else{
                res.status(400).send('Invalid parameters');
            }
        });

        //delete file
        api.delete('/files/:index',(req,res) => {
            if(req.params.index){
                this.fileManager.deleteFile(parseInt(req.params.index));
                res.send('OK');
            }else{
                res.status(400).send('Invalid parameters');
            }
        });

        this.serverInstance.listen(0,this.serverReady.bind(this));
    }
    
    async serverReady() : Promise<void> {
        const address = this.serverInstance.address();
        if(address && typeof(address) != 'string'){
            this.port = address.port;

            this.announceBonjourService();
        }
    }

    /* display file management */
    nextFile() : void{
        if(this.timeout) clearTimeout(this.timeout);
        this.fileIndex++;
        if(this.fileIndex >= this.fileManager.getFileCount()) this.fileIndex = 0;
        this.updateDisplayFile();
    }

    async updateDisplayFile() : Promise<void> {
        if(this.fileManager.getFileCount() < 1) 
            return this.window.webContents.send('displayFileUpdated',undefined,undefined);

        const filePath = await this.fileManager.getFilePath(this.fileIndex);
        if(!filePath) 
            return this.nextFile();

        const mimeType = mime.lookup(filePath.fileName);
        if(!mimeType) 
            return this.nextFile();

        const isImage = mimeType.startsWith('image/') ? true : (mimeType.startsWith('video/') ? false : undefined);
        this.window.webContents.send('displayFileUpdated',filePath.diskPath,isImage);
    }

    /* network service broadcast */
    announceBonjourService() : void {
        this.bonjourService = this.bonjourInstance.publish({
            name: this.getServiceName(),
            type: this.baseServiceName,
            port: this.port,
            protocol: 'tcp',
            txt: {
                'displayname': this.getDisplayName(),
                'pairingmodeactive': this.pairingMode.toString(),
            },
        });
    }

    updateBonjourService() : void {
        if(this.bonjourService){
            this.bonjourService.stop(() => {
                this.announceBonjourService();
            });
        }
    }

    /* interval*/
    storeInterval() : void {
        this.store.set('interval',this.interval);
    }

    /* auth token*/
    newRandomAuthToken() : string {
        return crypto.randomBytes(64).toString('hex');
    }

    storeAuthTokens() : void {
        this.store.set('authTokens',this.authTokens);
    }

    newPairingKey() : void {
        const pairingKey = randomstring.generate({
            length: 6,
            charset: 'numeric',
        });
        this.pairingKey = pairingKey;
    }

    checkPairingSum(sum : string) : boolean {
        const cert = CertificateManager.getCertificate();
        const certPlusKey = `${cert}${this.pairingKey}`;
        const checkSum = crypto.createHash('sha512').update(certPlusKey).digest('hex');
        return (sum === checkSum);
    }

    /* instance identifier */
    getRandomInstanceIdentifier() : string {
        const instanceIdentifier = this.store.get('instanceIdentifier',null) as string | null;
        if(instanceIdentifier === null) {
            const newInstanceIdentifier = randomstring.generate(8);
            this.store.set('instanceIdentifier',newInstanceIdentifier);
            return newInstanceIdentifier;
        }
        return instanceIdentifier;
    }

    /* display name*/
    getDisplayName() : string {
        const displayName = this.store.get('displayName',null) as string | null;
        if(displayName === null) {
            return this.getRandomInstanceIdentifier();
        }
        return displayName;
    }

    setDisplayName(name : string) : void {
        this.store.set('displayName',name);
    }

    /* password */
    setPassword(password : string) : void {
        const passwordHash = crypto.createHash('sha512').update(password).digest('hex');
        this.store.set('passwordHash',passwordHash);
    }

    checkPassword(password : string) : boolean {
        const passwordHash = this.store.get('passwordHash',null) as string | null;
        if(passwordHash === null) return true;
        return (passwordHash === crypto.createHash('sha512').update(password).digest('hex'));
    }

    /* service name*/
    getServiceName() : string {
        const instanceIdentifier = this.getRandomInstanceIdentifier();
        const serviceName = `${this.baseServiceName}-${instanceIdentifier}`;
        return serviceName;
    }

}

export default Client;