import type { BrowserWindow } from 'electron';
import {app, ipcMain,dialog } from 'electron';

import State from './state';

/*
These modules seem to only work when included with require instead of import and with seperatley including the typescript definitions.
If somebody knows a fix for this, please let me know.
*/
import type {Express} from 'express';
const express = require('express');

import type { Socket} from 'socket.io';
import {Server} from 'socket.io';

import http from 'http';

class Host extends State {

    serviceName! : string;
    servicePort! : number;
    serviceAnnouncementInterval! : number;

    socketInstance! : Server;
    expressInstance! : Express;
    httpServerInstance! : http.Server;

    clients!: Map<string,string[]>;

    constructor(_win : BrowserWindow){
        super(_win);

        this.name = 'Host';
        this.serviceName = 'MultiDisplayStreamerHost';
        this.servicePort = 5091;
        this.serviceAnnouncementInterval = 500;

        this.clients = new Map();
                
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

        return this;
    }

    override async init() : Promise<void> {
        await super.init();

        this.publishServices();

    }

    publishServices() : void{
        //new express instance
        this.expressInstance = express();
        ////alow access from any adress
        this.expressInstance.use(function(req ,res, next) {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Cache-control', 'public, max-age=31536000');
            next();
        });

        this.httpServerInstance = http.createServer(this.expressInstance);
        
        //start server for file publishing
        this.httpServerInstance.listen(this.servicePort, () => {
            console.log(`Ready and serving at ${this.servicePort}`);

            //add socket server onto out http server
            this.socketInstance = new Server(
                this.httpServerInstance, 
                { cors: 
                    { origin: '*' },
                },
            );
            this.addListeners();

            //announce server to network
            this.discoveryInstance.announce(
                this.serviceName,
                {port:this.servicePort},
                this.serviceAnnouncementInterval,
                true,
            );
        });
    }

    addListeners() : void{
        /* socket.io */
        this.socketInstance.on('connection',(socket : Socket) => {

            this.clients.set(socket.id,[]);

            console.log(this.clients);

            this.sendAvailableClientList();
            socket.on('disconnect', () => {
                this.clients.delete(socket.id);
                this.sendAvailableClientList();
            });
        });

        /* renderer */
        ipcMain.on('availableClientUpdateRequest', () => {
            this.sendAvailableClientList();
        });
        
        ipcMain.on('selectFilesForDisplayRequest', (event,socketName) => {
            this.selectFiles().then((_files : string[]) => {
                this.clients.set(socketName,_files);
                this.sendAvailableClientList();
                const publishedPaths = this.makeFilesAvailable(socketName,_files);
                
                const targetClient = this.socketInstance.to(socketName);
                targetClient.emit('filesPublished', publishedPaths);
            },() => {
                this.window.webContents.send('errorResponse','File selection failed');
            });
        });

        ipcMain.on('identifieMonitorRequest', (event,socketName,state) => {
            const targetClient = this.socketInstance.to(socketName);
            targetClient.emit('identifie', state);
        });
        ipcMain.on('blackoutMonitorRequest', (event,socketName,state) => {
            const targetClient = this.socketInstance.to(socketName);
            targetClient.emit('blackout', state);
        });
        ipcMain.on('intervalMonitorRequest', (event,socketName,interval) => {
            const targetClient = this.socketInstance.to(socketName);
            targetClient.emit('interval', interval);
        });

        /*window events*/
        this.window.on('close',() => {
            this.socketInstance.disconnectSockets(true);
        });
    }

    sendAvailableClientList() : void {
        this.window.webContents.send('availableClientUpdateResponse',this.clients);
    }

    async selectFiles() : Promise<string[]>{
        return new Promise(function(res,rej){
            dialog.showOpenDialog({properties: ['openFile','multiSelections'] }).then(function (response) {
                if (!response.canceled) {
                    res(response.filePaths);
                } else {
                    rej();
                }
            });
        });
    }

    //make an array of files available
    makeFilesAvailable(socketName : string, paths : string[]) : string[] {
        return paths.map(
            (path : string) => {
                return this.makeFileAvailable(socketName,path);
            },
        );
    }

    //make a specific file available via http
    makeFileAvailable(socketName : string, path : string) : string {
        const randomPublishName = Math.random().toString(36).substring(8);
        const servePath = `/${socketName}/${randomPublishName}`;
        this.expressInstance.get(servePath, function(req, res) {
            res.sendFile(path);
        });
        return randomPublishName;
    }
}

export default Host;