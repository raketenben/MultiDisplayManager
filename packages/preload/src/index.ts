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

    /* host specific */
    onAvailableClients: function(callback : (updatedClients : Map<string,Client>) => void) : void {
        ipcRenderer.send('updateAvailableClients',true);
        ipcRenderer.on('availableClientsUpdated',(event,clients : Map<string,Client>) => {
            callback(clients);
        });
    },
    onPairableClients: function(callback : (updatedClients : Map<string,Client>) => void) : void {
        ipcRenderer.send('updatePairableClients',true);
        ipcRenderer.on('pairableClientsUpdated',(event,clients : Map<string,Client>) => {
            callback(clients);
        });
    },
    onPairedClients: function(callback : (updatedClients : Map<string,Client>) => void) : void {
        ipcRenderer.send('updatePairedClients',true);
        ipcRenderer.on('pairedClientsUpdated',(event,clients : Map<string,Client>) => {
            callback(clients);
        });
    },


    getFiles: function(hostName : string) : Promise<string[]> {
        return ipcRenderer.invoke('getFiles',hostName);
    },
    pairClient: function(clientName : string,key : string) : Promise<void> {
        return ipcRenderer.invoke('pairClient',{clientName, key});
    },
    unpairClient: function(clientName : string) : Promise<void> {
        return ipcRenderer.invoke('unpairClient',clientName);
    },
    getClientStatus: function(clientName : string) : Promise<boolean | null> {
        return ipcRenderer.invoke('getClientStatus',clientName);
    },
    getClientFiles: function(clientName : string) : Promise<string[] | null> {
        return ipcRenderer.invoke('getClientFiles',clientName);
    },
    reorderClientFiles: function(clientName : string,oldIndex : number,newIndex : number) : Promise<boolean> {
        return ipcRenderer.invoke('reorderClientFiles',clientName,oldIndex,newIndex); 
    },
    deleteClientFile: function(clientName : string,index : number) : Promise<boolean> {
        return ipcRenderer.invoke('deleteClientFile',clientName,index); 
    },
    uploadClientFiles: function(clientName : string) : Promise<boolean> {
        return ipcRenderer.invoke('uploadClientFiles',clientName);
    },
    onUploadProgress: function(clientName : string,callback: (value : number) => void) : void {
        ipcRenderer.on(`uploadProgressEvent-${clientName}`,(event,value) => {callback(value);});
    },

    updateClientInterval: function(clientName : string,interval : number) : Promise<boolean> {
        return ipcRenderer.invoke('updateClientInterval',clientName,interval);
    },
    updateClientBlackout: function(clientName : string,blackout : boolean) : Promise<boolean> {
        return ipcRenderer.invoke('updateClientBlackout',clientName,blackout);
    },
    updateClientIdentifie: function(clientName : string,identifie : number) : Promise<boolean> {
        return ipcRenderer.invoke('updateClientIdentifie',clientName,identifie);
    },

    /*client specific*/
    lock: function() : Promise<void> {
        return ipcRenderer.invoke('lock');
    },
    unlock: function(password: string) : Promise<boolean> {
        return ipcRenderer.invoke('unlock',password);
    },
    changePassword: function(oldPassword: string,newPassword: string) : Promise<boolean> {
        return ipcRenderer.invoke('changePassword',oldPassword,newPassword);
    },
    getPairingKey: function(client : string) : Promise<string> {
        return ipcRenderer.invoke('getPairingKey',client);
    },
    getDisplayName: function(client : string) : Promise<string> {
        return ipcRenderer.invoke('getDisplayName',client);
    },
    setDisplayName: function(client : string) : Promise<string> {
        return ipcRenderer.invoke('setDisplayName',client);
    },

    onBlackoutUpdated: function(callback : (blackout : boolean) => void) : void {
        ipcRenderer.send('updateBlackout',true);
        ipcRenderer.on('blackoutUpdated',(event,blackout : boolean) => {
            callback(blackout);
        });
    },
    onIdentifieUpdated: function(callback : (identifie : number) => void) : void {
        ipcRenderer.send('updateIdentifie',true);
        ipcRenderer.on('identifieUpdated',(event,identifie : number) => {
            callback(identifie);
        });
    },

    onDisplayFileUpdated: function(callback : (path : string,isImage : boolean) => void) : void {
        ipcRenderer.send('updateDisplayFile',true);
        ipcRenderer.on('displayFileUpdated',(event,path : string,isImage : boolean) => {
            callback(path,isImage);
        });
    },

    onDisplaySucessfullyPaired: function(callback : () => void) : void {
        ipcRenderer.on('displaySucessfullyPaired',() => {
            callback();
        });
    },

    imageLoaded: function() : Promise<void> {
        return ipcRenderer.invoke('imageLoaded');
    },
    loadError: function() : Promise<void> {
        return ipcRenderer.invoke('loadError');
    },
    videoFinished: function() : Promise<void> {
        return ipcRenderer.invoke('videoFinished');
    },
};

contextBridge.exposeInMainWorld('link', linkApi);
