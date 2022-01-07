type Service = {
    name: string,
    interval: number,
    data: {
        displayName: string,
        port: number,
    },
    available: boolean,
    local: boolean,
    addr: string,
}

type FileEntry = {
    fileName: string,
    diskname: string,
}

type Client = {
    name: string,
    displayName: string,
    port: number,
    address: string,
    pairingModeActive: boolean,
    available: boolean,
}

type PairedClientCert = {
    name: string,
    certificate: string,
}