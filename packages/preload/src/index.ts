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


const linkApi : LinkAPI = {
    send: (channel: string, data: any) => {
        // whitelist channels
        const validChannels = ['interfaceTypeRequest','availableHostRequest'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    on: (channel: string, callback : (...arg0: any[]) => any) => {
        const validChannels = ['interfaceTypeResponse','availableHostResponse'];
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on(channel, (event, ...args) => {
                console.log(channel);
                callback(...args);
            });
        }
    },
};

contextBridge.exposeInMainWorld('link', linkApi);

export interface LinkAPI {
    send: (channel: string, data: any) => void,
    on: (channel: string, func: (arg0: any) => any) => void,
}
  
declare global {
    interface Window {
        link: LinkAPI
    }
}