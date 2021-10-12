import type { BrowserWindow} from 'electron';

import {Discovery} from 'udp-discovery';

class State{
    window! : BrowserWindow;
    discoveryInstance! : Discovery;
    name!: string;

    constructor(_win : BrowserWindow){
        this.window = _win;

        this.discoveryInstance = new Discovery();

        return this;
    }

    async init() : Promise<void> {
        this.window.webContents.send('interfaceTypeResponse',this.name);
    }
}

export default State;