import type { BrowserWindow} from 'electron';
import { ipcMain} from 'electron';
import State from './state';

import forge from 'node-forge';
import https from 'https';

import express from 'express';

import CertificateManager from './lib/certificateManager';
import FileManager from './lib/fileManager';

import Store from 'electron-store';
import InstanceHelper from './lib/instanceHelper';

import crypto from 'crypto';

import type bonjour from 'bonjour';

import multiparty from 'multiparty';

import mime from 'mime-types';

const randomstring = require('randomstring');

class Client extends State {

    store! : Store;

    serverInstance! : https.Server;
    expressInstance! : express.Application;

    fileManager : FileManager;
    fileIndex : number;
    timeout: null | NodeJS.Timeout;

    pairingKey! : string;

    pairingMode : boolean;
    port : number;

    interval : number;
    blackout: boolean;
    identifie: number;

    authTokens : string[];

    bonjourService! : bonjour.Service | null;

    constructor(_win : BrowserWindow){
        super(_win);
        
        this.pairingMode = false || process.argv.includes('--pairing');
        this.port = 0;

        this.name = 'Client';

        this.store = new Store({cwd: InstanceHelper.getInstanceSavePath(),name:'client'});

        this.fileManager = new FileManager();
        this.fileIndex = 0;
        this.timeout = null;

        this.bonjourService = null;

        this.authTokens = this.store.get('authTokens',[]) as string[];

        this.interval = this.store.get('interval',5) as number;
        this.blackout = false;
        this.identifie = 0;

        //Set window to kiosk mode
        if(import.meta.env.MODE !== 'development') _win.setKiosk(true);

        return this;
    }

    override async init() : Promise<void> {
        await super.init();
        
        this.window.on('close',async (e) =>{
            if(this.bonjourService?.published){
                e.preventDefault();
                this.bonjourService?.stop(() => {
                    this.window.close();
                });
            }
        });

        //get certificate
        const cert = CertificateManager.getCertificate();
        const priavteKey = forge.pki.privateKeyToPem(CertificateManager.getCertificateKeys().privateKey);

        const serverOptions = {
            key: priavteKey,
            cert: cert,
        };

        //generate pairing key
        this.newPairingKey();

        //server
        this.expressInstance = express();
        this.serverInstance = https.createServer(serverOptions,this.expressInstance);

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
                        this.displaySucessfullyPaired();
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

        const api = express.Router();
        this.expressInstance.use('/api',api);

        //key check
        api.use((req, res, next) => {
            //TODO: add api key check
            const token = req.headers.authorization?.split(' ')[1] || null;
            if(!token) return res.status(401).send('Unauthorized');
            if(!this.authTokens.includes(token)) return res.status(401).send('Unauthorized');
            next();
        });

        api.get('/',(req,res) => {
            res.send('OK');
        });
        
        api.post('/interval/:value',(req,res) => {
            //TODO: blanks screen
            this.interval = parseFloat(req.params.value);
            res.status(200).send('OK');
        });

        api.post('/blackout/:state',(req,res) => {
            //TODO: blanks screen
            this.blackout = (req.params.state === 'true');
            res.status(200).send('OK');
            this.window.webContents.send('blackoutUpdated',this.blackout);
        });

        api.post('/identifie/:value',(req,res) => {
            //TODO: identifie screen
            this.identifie = parseInt(req.params.value);
            res.status(200).send('OK');
            this.window.webContents.send('identifieUpdated',this.identifie);
        });
        
        api.post('/name',(req,res) => {
            this.store.set('displayName',req.body.displayName);
            res.send('OK');
        });

        api.get('/files',async (req,res) => {
            res.header('Content-Type', 'application/json');
            const files = await this.fileManager.getFiles();
            res.json(files);
        });

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

        api.delete('/files/:index',(req,res) => {
            if(req.params.index){
                this.fileManager.deleteFile(parseInt(req.params.index));
                res.send('OK');
            }else{
                res.status(400).send('Invalid parameters');
            }
            //TODO: add files
        });

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

        ipcMain.handle('getDisplayName',() => {
            return this.getDisplayName();
        });
        ipcMain.handle('setDisplayName',(e,name : string) => {
            this.setDisplayName(name);
            this.updateAnnouncement();
            return true;
        });

        ipcMain.handle('getPairingKey',() => {
            return (this.pairingMode) ? this.pairingKey : null;
        });

        ipcMain.handle('changePassword',(e,oldPassword,newPassword) => {
            if(this.checkPassword(oldPassword)){
                this.setPassword(newPassword);
                return true;
            }else{
                return false;
            }
        });

        ipcMain.handle('lock',() => {
            this.pairingMode = false;
            this.updateAnnouncement();
        });

        ipcMain.handle('unlock',(e,password) => {
            if(this.checkPassword(password)){
                this.pairingMode = true;
                this.updateAnnouncement();
                return true;
            }else{
                return false;
            }
        });

        ipcMain.on('updateBlackout',(e) => {
            e.reply('blackoutUpdated',this.blackout);
        });
        ipcMain.on('updateIdentifie',(e) => {
            e.reply('identifieUpdated',this.identifie);
        });

        ipcMain.on('updateDisplayFile',async () => {
            this.updateDisplayFile();
        });

        this.fileManager.emitter.on('filesUpdated',async () => {
            this.nextFile();
            this.updateDisplayFile();
        });

        ipcMain.handle('imageLoaded',() => {
            this.timeout = setTimeout(this.nextFile.bind(this),this.interval * 1000);
        });

        ipcMain.handle('loadError',() => {
            this.nextFile();
        });

        ipcMain.handle('videoFinished',() => {
            this.nextFile();
        });

        this.updateDisplayFile();

        this.serverInstance.listen(0,this.serverReady.bind(this));
    }

    nextFile() : void{
        if(this.timeout) clearTimeout(this.timeout);
        this.fileIndex++;
        if(this.fileIndex >= this.fileManager.getFileCount()) this.fileIndex = 0;
        this.updateDisplayFile();
    }

    async updateDisplayFile() : Promise<void> {
        const filePath = await this.fileManager.getFilePath(this.fileIndex);
        if(!filePath) return;
        const mimeType = mime.lookup(filePath.fileName);
        if(!mimeType) return this.nextFile();
        const isImage = mimeType.startsWith('image/') ? true : (mimeType.startsWith('video/') ? false : undefined);
        this.window.webContents.send('displayFileUpdated',filePath.diskPath,isImage);
    }

    publishService() : void {
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

    updateAnnouncement() : void {
        if(this.bonjourService){
            this.bonjourService.stop(() => {
                this.publishService();
            });
        }
    }

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

    getRandomInstanceIdentifier() : string {
        const instanceIdentifier = this.store.get('instanceIdentifier',null) as string | null;
        if(instanceIdentifier === null) {
            const newInstanceIdentifier = randomstring.generate(8);
            this.store.set('instanceIdentifier',newInstanceIdentifier);
            return newInstanceIdentifier;
        }
        return instanceIdentifier;
    }

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

    setPassword(password : string) : void {
        const passwordHash = crypto.createHash('sha512').update(password).digest('hex');
        this.store.set('passwordHash',passwordHash);
    }

    checkPassword(password : string) : boolean {
        const passwordHash = this.store.get('passwordHash',null) as string | null;
        if(passwordHash === null) return true;
        return (passwordHash === crypto.createHash('sha512').update(password).digest('hex'));
    }

    getServiceName() : string {
        const instanceIdentifier = this.getRandomInstanceIdentifier();
        const serviceName = `${this.baseServiceName}-${instanceIdentifier}`;
        return serviceName;
    }

    serverReady() : void {
        const address = this.serverInstance.address();
        if(address && typeof(address) != 'string'){
            this.port = address.port;

            this.publishService();
        }
    }

    displaySucessfullyPaired() : void {
        this.window.webContents.send('displaySucessfullyPaired');
    }
}

export default Client;