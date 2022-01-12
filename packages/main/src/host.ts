import type { BrowserWindow } from 'electron';
import {app, ipcMain,dialog } from 'electron';

import State from './state';

import ClientManager from './lib/clientManager';
import RequestHelper from './lib/requestHelper';

import type { RemoteService } from 'bonjour';
import type bonjour from 'bonjour';

const FormData = require('form-data');

import fs from 'fs';

class Host extends State {

    clientManager : ClientManager;
    requestHelper : RequestHelper;

    browser! : bonjour.Browser;

    constructor(_win : BrowserWindow){
        super(_win);

        this.name = 'Host';

        this.clientManager = new ClientManager();
        this.requestHelper = new RequestHelper(this.clientManager);
                
        const isSingleInstance = app.requestSingleInstanceLock();
        if (!isSingleInstance) {
          app.quit();
          process.exit(0);
        }

        app.on('second-instance', () => {
            // Someone tried to run a second instance, we should focus our window.
            if (_win) {
                if (_win.isMinimized()) _win.restore();
                _win.focus();
            }
        });

        if(import.meta.env.MODE === 'production') this.window.maximize();

        return this;
    }

    override async init() : Promise<void> {
        await super.init();

        /* init bonjour browser*/
        this.browser = this.bonjourInstance.find({type:this.baseServiceName});
        this.browser.on('up',this.handleServiceFound.bind(this));
        this.browser.on('down',this.handleServiceLost.bind(this));

        this.declareListener();
    }

    handleServiceFound(service : RemoteService) : void{
        this.clientManager.clientFound(service);
    }

    handleServiceLost(service : RemoteService) : void{
        this.clientManager.clientLost(service);
    }

    declareListener() : void {
        ipcMain.handle('updateClientInterval',(event,clientName : string,value : number) => {
            return new Promise((resolve,reject) => {
                const path = `/api/interval/${value}`;
                const request = this.requestHelper.request(clientName,path,{method:'POST'},true,(res) => {
                    resolve(res.statusCode === 200);
                });
                request.on('error',reject);
                request.end();
            });
        });

        ipcMain.handle('updateClientBlackout',(event,clientName : string,value : boolean) => {
            return new Promise((resolve,reject) => {
                const path = `/api/blackout/${value.toString()}`;
                const request = this.requestHelper.request(clientName,path,{method:'POST'},true,(res) => {
                    resolve(res.statusCode === 200);
                });
                request.on('error',reject);
                request.end();
            });
        });

        ipcMain.handle('updateClientIdentifie',(event,clientName : string,value : number) => {
            return new Promise((resolve,reject) => {
                const path = `/api/identifie/${value.toString()}`;
                const request = this.requestHelper.request(clientName,path,{method:'POST'},true,(res) => {
                    resolve(res.statusCode === 200);
                });
                request.on('error',reject);
                request.end();
            });
        });

        ipcMain.handle('pairClient',async (e,{clientName,key}) : Promise<boolean> => {
            return await this.clientManager.pairClient(clientName,key);
        });
        ipcMain.handle('unpairClient',async (e,clientName) : Promise<boolean> => {
            return await this.clientManager.unpairClient(clientName);
        });

        ipcMain.handle('getClientStatus',async (e,clientName : string) : Promise<boolean> => {
            let client = this.clientManager.getPairedClients().get(clientName);
            if(!client) client = this.clientManager.getAvailableClients().get(clientName);
            if(!client) return false;
            return this.checkClientAvailable(client);
        });

        ipcMain.handle('getClientInterval',async (e,clientName : string) : Promise<number | null> => {
            return await this.getClientInterval(clientName);
        });

        ipcMain.handle('getClientFiles',async (e,clientName : string) : Promise<null | string[]> => {
            try {
                return await this.getClientFiles(clientName);
            } catch(e){
                console.error(e);
                return null;
            }
        });

        ipcMain.handle('reorderClientFiles',async (e,clientName : string,oldIndex : number,newIndex : number) : Promise<boolean> => {
            try {
                return await this.reorderClientFiles(clientName,oldIndex,newIndex);
            } catch(e){
                console.error(e);
                return false;
            }
        });

        ipcMain.handle('deleteClientFile',async (e,clientName : string,index : number) : Promise<boolean> => {
            try {
                return await this.deleteClientFile(clientName,index);
            } catch(e){
                console.error(e);
                return false;
            }
        });

        ipcMain.handle('uploadClientFiles',async (e,clientName : string) : Promise<boolean> => {
            try {
                return await this.uploadFilesToClient(clientName);
            } catch(e){
                console.error(e);
                return false;
            }
        });

        //send list of available clients
        ipcMain.on('updateAvailableClients',(e) => {
            e.reply('availableClientsUpdated',this.clientManager.getAvailableClients());
        });

        //send list of paired clients
        ipcMain.on('updatePairableClients',(e) => {
            e.reply('pairableClientsUpdated',this.clientManager.getPairableClients());
        });
        
        //send connected clients
        ipcMain.on('updatePairedClients',(e) => {
            e.reply('pairedClientsUpdated',this.clientManager.getPairedClients());
        });

        this.clientManager.emitter.on('availableClientsUpdated',(clients) => {
            this.window.webContents.send('availableClientsUpdated',clients);
        });
        this.clientManager.emitter.on('pairedClientsUpdated',(clients) => {
            this.window.webContents.send('pairedClientsUpdated',clients);
        });
        this.clientManager.emitter.on('pairableClientsUpdated',(clients) => {
            this.window.webContents.send('pairableClientsUpdated',clients);
        });
    }

    async checkClientAvailable(client : Client) : Promise<boolean> {
        return new Promise((resolve) => {
            const request = this.requestHelper.request(client,'/',{},false,(res) => {
                resolve(res.statusCode === 200);
            });
            request.on('error',() => {
                resolve(false);
            });
            request.end();
        });
    }

    async getClientInterval(clientName : string) : Promise<number | null> {
        return new Promise((resolve) => {
            const request = this.requestHelper.request(clientName,'/api/interval',{},false,(res) => {
                if(res.statusCode === 200){
                    res.on('data',(data) => {
                        resolve(parseFloat(data.toString()));
                    });
                } else {
                    resolve(null);
                }
            });
            request.on('error',() => resolve(null));
            request.end();
        });
    }

    async getClientFiles(clientName : string) : Promise<string[]> {
        return new Promise((resolve,reject) => {
            const request = this.requestHelper.request(clientName,'/api/files',{},true,(res) => {
                let data = '';
                res.on('data',(chunk) => {
                    data += chunk;
                });
                res.on('end',() => {
                    if(res.statusCode === 200) {
                        return resolve(JSON.parse(data));
                    } else {
                        return reject(new Error('Could not get client files'));
                    }
                });
            });
            request.on('error',(e) => {
                return reject(e);
            });
            request.end();
        });
    }

    async reorderClientFiles(clientName : string,oldIndex : number,newIndex : number) : Promise<boolean> {
        return new Promise((resolve,reject) => {
            const path = `/api/files/reorder/${oldIndex}/${newIndex}`;
            const request = this.requestHelper.request(clientName,path,{method:'POST'},true,(res) => {
                if(res.statusCode === 200) {
                    return resolve(true);
                } else {
                    return reject(new Error('Could not reorder client files'));
                }
            });
            request.on('error',(e) => {
                return reject(e);
            });
            request.end();
        });
    }

    async deleteClientFile(clientName : string,index:number) : Promise<boolean> {
        return new Promise((resolve,reject) => {
            const path = `/api/files/${index}`;
            const request = this.requestHelper.request(clientName,path,{method:'DELETE'},true,(res) => {
                if(res.statusCode === 200) {
                    return resolve(true);
                } else {
                    return reject(new Error('Could not delete client file'));
                }
            });
            request.on('error',(e) => {
                return reject(e);
            });
            request.end();
        });
    }

    async uploadFilesToClient(clientName : string) : Promise<boolean> {
        return new Promise((resolve,reject) => {
            this.selectFiles().then((files) => {
                let uploaded = 0;
                const formData = new FormData();
                for(const file of files) {
                    formData.append('files',fs.createReadStream(file));
                }
                const options = {
                    method:'POST',
                    headers:formData.getHeaders(),
                };
                const request = this.requestHelper.request(clientName,'/api/files',options,true,(res) => {
                    if(res.statusCode === 200) {
                        return resolve(true);
                    } else {
                        return reject(new Error('Could not upload files to client'));
                    }
                });
                request.on('error',reject);

                formData.on('data',(chunk : Buffer) => {
                    formData.getLength((e : Error,length : number) => {
                        uploaded += chunk.length;
                        const progress = Math.round((uploaded / length)*1000)/10;
                        this.window.webContents.send(`uploadProgressEvent-${clientName}`,progress);
                    });
                });
                
                formData.pipe(request);


            }).catch((e) => {
                reject(e);
            });
        });
    }

    async selectFiles() : Promise<string[]>{
        return new Promise(function(res,rej){
            const fileTypes = [
                {name:'Media', extensions:['jpg','jpeg','png','apng','avif','gif','svg','webp','mp4','mkv','mov','webm','wmv','mpg','mpeg']},
                {name:'Images', extensions:['jpg','jpeg','png','apng','avif','gif','svg','webp']},
                {name:'Video', extensions:['mp4','mkv','mov','webm','wmv','mpg','mpeg']},
                {name:'All Files', extensions:['*']},
            ];
            dialog.showOpenDialog({properties:['openFile','multiSelections'],filters: fileTypes }).then(function (response) {
                if (!response.canceled) {
                    res(response.filePaths);
                } else {
                    rej(new Error('No files selected'));
                }
            });
        });
    }
}

export default Host;