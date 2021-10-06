import type { BrowserWindow} from 'electron';
import { ipcMain } from 'electron';

//const bonjour = require('bonjour');
import bonjour from 'bonjour';
import type { Bonjour } from 'bonjour';

class State{
    window! : BrowserWindow;
    bonjourInstance! : Bonjour;
    name!: string;

    constructor(_win : BrowserWindow){
        this.window = _win;

        this.bonjourInstance = bonjour();

        //event for roting to the correct interface
        ipcMain.on('interfaceTypeRequest', () => {
            this.window.webContents.send('interfaceTypeResponse',this.name);
        });

        return this;
    }
}

export default State;