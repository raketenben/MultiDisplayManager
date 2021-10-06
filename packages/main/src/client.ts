import type { BrowserWindow } from 'electron';
import State from './state';

class Client extends State {

    constructor(_win : BrowserWindow){
        super(_win);

        this.name = 'Viewer';

        

        return this;
    }
}

export default Client;