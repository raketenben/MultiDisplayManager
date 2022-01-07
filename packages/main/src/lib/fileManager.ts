import fs from 'fs';
import path from 'path';

import crypto from 'crypto';

import Store from 'electron-store';

import InstanceHelper from './instanceHelper';
import type stream from 'stream';

import events from 'events';
import type { ReadStream } from 'original-fs';

class FileManager {

    store : Store;
    files : FileEntry[];

    emitter : events.EventEmitter;

    constructor() {
        this.store = new Store({cwd: InstanceHelper.getInstanceSavePath(),name:'files'});
        this.files = JSON.parse(this.store.get('files','[]') as string);

        this.emitter = new events.EventEmitter();

        this.emitFilesUpdated();
    }

    saveFileLookup() : void {
        this.store.set('files',JSON.stringify(this.files));
    }

    getFileSavePath() : string {
        const instaceSaveFolder = InstanceHelper.getInstanceSavePath();
        const fileFolderPath = path.join(instaceSaveFolder,'displayFiles');

        //create the folder if it doesn't exist
        fs.mkdirSync(fileFolderPath,{recursive:true});

        return fileFolderPath;
    }

    async getFile(index : number) : Promise<ReadStream | null>{
        const file = this.files[index];
        if(!file?.diskname) return null;
        const fileSavePath = path.join(this.getFileSavePath(),file.diskname);
        return fs.createReadStream(fileSavePath);
    }

    //adds a file to the file folder
    async addFile(fileName: string,stream : stream.Readable) : Promise<string> {
        return new Promise((resolve,reject) => {
            const randomName = crypto.randomBytes(32).toString('hex');
            //get hash for filename
            const fileSavePath = path.join(this.getFileSavePath(),randomName);
            const writeStream = fs.createWriteStream(fileSavePath);
            stream.pipe(writeStream);

            writeStream.on('finish',() => {
                //add to lookup
                this.files.push({fileName,diskname:randomName});
                this.saveFileLookup();
                this.emitFilesUpdated();
                resolve(randomName);
            });
            writeStream.on('error',(err) => {
                reject(err);
            });
        });
    }

    async reorderFiles(from : number, to : number) : Promise<void> {
        const file = this.files[from];
        this.files.splice(from,1);
        this.files.splice(to,0,file);
        this.saveFileLookup();
        this.emitFilesUpdated();
    }

    async deleteFile(index : number) : Promise<void> {
        return new Promise((resolve,reject) => {
            const diskFileName = this.files[index]?.diskname;
            if(!diskFileName) return reject(new Error('File not found'));
            
            const fileSavePath = path.join(this.getFileSavePath(),diskFileName);
            fs.unlink(fileSavePath,(err) => {
                //remove from lookup
                this.files.splice(index,1);
                this.saveFileLookup();

                this.emitFilesUpdated();

                if(err) return reject(err);
                return resolve();
            });
        });
    }

    //gets all files in the file folder
    async getFiles() : Promise<string[]> {
        return this.files.map(f => f.fileName);
    }

    async getFilePath(i : number) : Promise<{diskPath:string,fileName:string} | null> {
        const savePath = this.getFileSavePath();
        const fileProtocol = 'file://';
        if(!this.files[i]?.diskname) return null;
        return {diskPath:`${fileProtocol}${path.join(savePath,this.files[i].diskname)}`,fileName:this.files[i].fileName};
    }

    getFileCount() : number {
        return this.files.length;
    }

    emitFilesUpdated() : void {
        this.emitter.emit('filesUpdated',this.files);
    }

}

export default FileManager;