import type { BrowserWindow } from 'electron';

import State from './state';

/*
These modules seem to only work when included with require instead of import and with seperatley including the typescript definitions.
If somebody knows a fix for this, please let me know.
*/
import type {Express} from 'express';
const express = require('express');

import type {Server} from 'socket.io';
const io = require('socket.io');

import http from 'http';

class Host extends State {

    httpServerInstance! : http.Server;
    socketInstance! : Server;
    appPort! : number;

    constructor(_win : BrowserWindow){
        super(_win);

        this.name = 'Host';
        this.appPort = 5091;

        this.publishServices();

        return this;
    }

    publishServices() : void{
        //new express instance
        const expressInstance : Express = express();
        ////alow access from any adress
        expressInstance.use(function(req ,res, next) {
            res.header('Access-Control-Allow-Origin', '*');
            next();
        });

        this.httpServerInstance = http.createServer(expressInstance);

        
        //start server for file publishing
        this.httpServerInstance.listen(this.appPort, () => {
            console.log(`Ready and serving at ${this.appPort}`);

            //add socket server onto out http server
            this.socketInstance = io(
                this.httpServerInstance, 
                { cors: 
                    { origin: '*' },
                },
            );

            //announce server to network
            this.bonjourInstance.publish({
                name:'MultiDisplayStreamer',
                type:'MultiDisplayHost',
                port:this.appPort,
            });
        });
    }
}

export default Host;