
export interface LinkAPI {
    getInterfaceType: () => Promise<string>,
    onNewHost: (callback : (newHost : DiscoverData) => void ) => void,
    onClientsUpdated: (callback : (newHost : Map<string,string[]>) => void ) => void,
    selectFiles: (socketName : string) => void,
    identifieMonitor: (socketName : string,id : number,state : boolean) => void,
    blackoutMonitor: (socketName : string,state : boolean) => void,
    setMonitorInterval: (socketName : string,interval : number) => void,
}

export declare global {
    interface Window {
        link: LinkAPI
    }
}

declare module 'socket.io-client/dist/socket.io.js' {
    export * from 'socket.io-client';
}