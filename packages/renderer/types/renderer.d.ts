
export interface LinkAPI {
    getInterfaceType: () => Promise<string>,

    /* host specific */
    getFiles: (hostName : string) => Promise<string[]>,
    pairClient: (clientName : string,key : string) => Promise<boolean>,
    unpairClient: (clientName : string) => Promise<boolean>,
    getClientStatus: (clientName : string) => Promise<boolean | null>,
    getClientFiles: (clientName : string) => Promise<string[] | null>,
    reorderClientFiles: (clientName : string,oldIndex : number,newIndex : number) => Promise<boolean> ,
    deleteClientFile: (clientName : string,index : number) => Promise<boolean>,
    uploadClientFiles: (clientName : string) => Promise<boolean>,
    
    onUploadProgress: (clientName : string,callback: (value : number) => void) => void

    onAvailableClients: (callback : (newClients : Map<string,Client>) => void ) => void,
    onPairableClients: (callback : (newClients : Map<string,Client>) => void ) => void,
    onPairedClients: (callback : (newClients : Map<string,Client>) => void ) => void,

    updateClientBlackout: (clientName : string,blackout : boolean) => Promise<boolean>,
    updateClientIdentifie: (clientName : string,identifie : number) => Promise<boolean>,
    updateClientInterval: (clientName : string,interval : number) => Promise<boolean>,

    /*client specific*/
    lock: () => Promise<void>,
    unlock: (password: string) => Promise<boolean>,
    changePassword: (passwordOld: string,passwordNew: string) => Promise<boolean>,
    getPairingKey: () => Promise<string>,
    getDisplayName: () => Promise<string>,
    setDisplayName: (name: string) => Promise<boolean>,

    onIntervalUpdated: (callback : (interval : number) => void ) => void,
    onBlackoutUpdated: (callback : (blackout : boolean) => void ) => void,
    onIdentifieUpdated: (callback : (identifie : number) => void ) => void,

    onDisplayFileUpdated: (callback : (files : string,isImage : boolean) => void ) => void,
    onDisplaySucessfullyPaired: (callback : () => void) => void,

    imageLoaded: () => void,
    loadError: () => void,
    videoFinished: () => void,
}

type Client = {
    name: string;
    displayName: string;
    port: number;
    address: string;
    pairingModeActive: boolean;
    available: boolean;
}

export declare global {
    interface Window {
        link: LinkAPI
    }
}

declare module 'socket.io-client/dist/socket.io.js' {
    export * from 'socket.io-client';
}