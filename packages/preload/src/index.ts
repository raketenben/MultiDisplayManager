import {contextBridge, ipcRenderer} from 'electron';

const apiKey = 'electron';
/**
 * @see https://github.com/electron/electron/issues/21437#issuecomment-573522360
 */
const api: ElectronApi = {
  versions: process.versions,
};

/**
 * The "Main World" is the JavaScript context that your main renderer code runs in.
 * By default, the page you load in your renderer executes code in this world.
 *
 * @see https://www.electronjs.org/docs/api/context-bridge
 */
contextBridge.exposeInMainWorld(apiKey, api);


const linkApi = {
    //inmterface Type
    getInterfaceType: async function() : Promise<string> {
        return new Promise(function(res){
            ipcRenderer.send('interfaceTypeRequest',true);
            ipcRenderer.once('interfaceTypeResponse',(event,type) => {
                res(type);
            });
        });
    },
    onNewHost: function(callback : (newHost : DiscoverData) => void) : void {
        ipcRenderer.send('availableHostUpdateRequest', true);
        ipcRenderer.on('availableHostUpdateResponse',(event,host : DiscoverData) => {
            callback(host);
        });
    },
    onClientsUpdated: function(callback : (newHost : Map<string,string[]>) => void) : void {
        ipcRenderer.send('availableClientUpdateRequest', true);
        ipcRenderer.on('availableClientUpdateResponse',(event,client : Map<string,string[]>) => {
            callback(client);
        });
    },
    selectFiles: function(socketName : string) : void {
        ipcRenderer.send('selectFilesForDisplayRequest',socketName);
    },
    identifieMonitor: function(socketName : string, id : number,state : boolean) : void {
        ipcRenderer.send('identifieMonitorRequest',socketName,(state) ? id : 0);
    },
    blackoutMonitor: function(socketName : string,state : boolean) : void {
        ipcRenderer.send('blackoutMonitorRequest',socketName,state);
    },
    setMonitorInterval: function(socketName : string,interval : number) : void {
        ipcRenderer.send('intervalMonitorRequest',socketName,interval);
    },
};

contextBridge.exposeInMainWorld('link', linkApi);

interface DiscoverData {
    addr: string,
    data:{
        port: number,
    }
}
