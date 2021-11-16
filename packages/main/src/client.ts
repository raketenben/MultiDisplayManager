import type { RemoteService } from 'bonjour';
import type { BrowserWindow } from 'electron';
import State from './state';

class Client extends State {

    constructor(_win : BrowserWindow){
        super(_win);
        
        this.name = 'Client';

        //Maximize window for client
        _win.maximize();
        _win.setFullScreen(true);
        _win.setKiosk(true);

        return this;
    }

    override async init() : Promise<void> {
        await super.init();
        
        //announce server to network
        this.discoveryInstance.on('available',(name,data) => {
            if(name == 'MultiDisplayStreamerHost')
                this.hostFound(data);
        });
    }

    hostFound(service : RemoteService) : void {
        console.log(service);
        this.window.webContents.send('availableHostUpdateResponse',service);
    }
}

export default Client;