
export interface LinkAPI {
    send: (channel: string, data: any) => void,
    on: (channel: string, func: (arg0: any) => any) => void,
}
  
declare global {
    interface Window {
        link: LinkAPI
    }
}