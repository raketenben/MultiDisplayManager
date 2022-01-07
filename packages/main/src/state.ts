import type { BrowserWindow} from 'electron';

import bonjour from 'bonjour';

class State{

    window! : BrowserWindow;
    name!: string;

    bonjourInstance : bonjour.Bonjour;

    baseServiceName! : string;

    constructor(_win : BrowserWindow){
        this.window = _win;
        
        this.baseServiceName = 'multi-display-streamer';

        this.bonjourInstance = bonjour();

        return this;
    }

    async init() : Promise<void> {
        this.window.webContents.send('interfaceTypeResponse',this.name);
    }
}

export default State;