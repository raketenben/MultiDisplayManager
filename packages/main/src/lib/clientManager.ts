import crypto from 'crypto';

import Store from 'electron-store';
import InstanceHelper from './instanceHelper';

import events from 'events';
import type { RemoteService } from 'bonjour';
import RequestHelper from './requestHelper';

import forge from 'node-forge';
import type tls from 'tls';
import type https from 'https';

class ClientManager {

    emitter : events.EventEmitter;

    //certificate store
    private store : Store;
    private pairedClients : Map<string,Client>;
    private pairableClients : Map<string,Client>;
    private availableClients : Map<string,Client>;
    private clientCerts : Map<string,string>;
    private clientTokens : Map<string,string>;

    private requestHelper : RequestHelper;

    constructor () {
        this.emitter = new events.EventEmitter();

        this.store = new Store({cwd: `${InstanceHelper.getInstanceSavePath()}`,name:'pairedClients'});

        this.pairedClients = new Map(JSON.parse(this.store.get('clients','[]') as string));
        this.clientCerts = new Map(JSON.parse(this.store.get('certs','[]') as string));
        this.clientTokens = new Map(JSON.parse(this.store.get('tokens','[]') as string));

        /* reset availability of clients */
        this.pairedClients.forEach((client) => {
            client.available = false;
        });

        this.pairableClients = new Map();
        this.availableClients = new Map();

        this.requestHelper = new RequestHelper(this);
        
        this.emitPairedClientsUpdated();
    }

    private savePairedClients() : void {
        this.store.set('clients',JSON.stringify(Array.from(this.pairedClients.entries())));
    }

    private saveClientCerts() : void {
        this.store.set('certs',JSON.stringify(Array.from(this.clientCerts.entries())));
    }

    private saveClientTokens() : void {
        this.store.set('tokens',JSON.stringify(Array.from(this.clientTokens.entries())));
    }

    private emitPairedClientsUpdated() : void {
        //emit event
        this.emitter.emit('pairedClientsUpdated',this.pairedClients);
    }
    private emitPairableClientsUpdated() : void {
        //emit event
        this.emitter.emit('pairableClientsUpdated',this.pairableClients);
    }
    private emitAvailableClientsUpdated() : void {
        //emit event
        this.emitter.emit('availableClientsUpdated',this.availableClients);
    }

    getPairedClients() : Map<string,Client> {
        return this.pairedClients;
    }

    getPairableClients() : Map<string,Client> {
        return this.pairableClients;
    }

    getAvailableClients() : Map<string,Client> {
        return this.availableClients;
    }

    private async getCertFromClient(client : Client,secure = true) : Promise<string> {
        return new Promise((resolve,reject) => {
            const request = this.requestHelper.request(client,'',{},secure,(res) => {
                const cert = (res.socket as tls.TLSSocket).getPeerCertificate();
                const obj = forge.asn1.fromDer(cert.raw.toString('binary'));
                const certificate = forge.pki.certificateFromAsn1(obj);
                const pem = forge.pki.certificateToPem(certificate);
                resolve(pem);
            });
            request.on('error',(err) => {reject(err);});
            request.end();
        });
    }

    async clientFound(service : RemoteService): Promise<void> {
        const client = this.bonjourServiceToClient(service,true);
        this.availableClients.set(client.name,client);

        //check if client is already paired
        if(this.pairedClients.has(client.name)) {
            //get certificate from new client
            this.getCertFromClient(client).then((cert) => {
                //check if cert hasn't changed
                if(cert === this.clientCerts.get(client.name)) {
                    //update client info
                    this.pairedClients.set(client.name,client);
                    this.savePairedClients();

                    //emit event
                    this.emitPairedClientsUpdated();
                }
            });
        }

        this.updatePairableClients();
        
        //emit event
        this.emitPairedClientsUpdated();
        this.emitPairableClientsUpdated();
        this.emitAvailableClientsUpdated();
    }

    clientLost(service : RemoteService) : void {
        const client = this.bonjourServiceToClient(service,false);
        this.availableClients.delete(client.name);

        //update status of paired client
        if(this.pairedClients.has(client.name)) {
            const pairedClient = this.pairedClients.get(client.name);
            const condition =   pairedClient?.address === client.address && 
                                pairedClient?.port === client.port;
            
            if(condition) {
                this.pairedClients.set(client.name,client);
                this.savePairedClients();
                this.emitPairedClientsUpdated();
            }
        }

        this.updatePairableClients();

        //emit event
        this.emitPairableClientsUpdated();
        this.emitAvailableClientsUpdated();
    }

    private updatePairableClients() : void {
        const pairableClients = [...this.availableClients].filter(([,client]) => client.pairingModeActive);
        const pairableClientsNotPaired = pairableClients.filter(([,client]) => !this.pairedClients.has(client.name));
        this.pairableClients = new Map(pairableClientsNotPaired);
    }

    private bonjourServiceToClient(service : RemoteService,found : boolean) : Client {
        return {
            name:service.name,
            displayName:service.txt.displayname,
            port:service.port,
            address:service.referer.address,
            pairingModeActive: (service.txt.pairingmodeactive === 'true') ? true : false, 
            available: found,
        };
    }

    private addPairedClient(client : Client,cert : string,token : string) : void {
        //add client to store
        this.pairedClients.set(client.name,client);
        this.savePairedClients();

        //add certificate
        this.clientCerts.set(client.name,cert);
        this.saveClientCerts();

        //add token
        this.clientTokens.set(client.name,token);
        this.saveClientTokens();

        //emit event
        this.emitPairedClientsUpdated();
    }


    getPairedClientCertificate(client : Client) : string | undefined {
        return this.clientCerts.get(client.name);
    }

    getPairedClientToken(client : Client) : string | undefined {
        return this.clientTokens.get(client.name);
    }

    async pairClient(clientName : string,pairKey : string) : Promise<boolean> {
        const client = this.availableClients.get(clientName);
        if(!client) throw new Error(`Client ${clientName} not found`);

        const pair = async (resolve : (result : boolean) => void) => {
            //get ssl certificate
            const cert = await this.getCertFromClient(client,false);
    
            const certPlusKey = `${cert}${pairKey}`;
            const checkSum = crypto.createHash('sha512').update(certPlusKey).digest('hex');
            
            const options : https.RequestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(checkSum),
                },
                ca: [cert],
            };

            //send pair request
            const request = this.requestHelper.request(client,'/pair',options,true,(res) => {
                let token = '';
                res.on('data',(data) => {
                    token += data;
                });
                res.on('end',() => {
                    console.log(`Pairing token: ${token}`,res.statusCode);
                    if(res.statusCode === 200) {
                        this.addPairedClient(client,cert,token);
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                });

            });
            request.write(checkSum);
            request.end();
        };

        return new Promise(pair);
    }

    async unpairClient(clientName : string) : Promise<boolean> {
        const client = this.availableClients.get(clientName);
        if(!client) throw new Error(`Client ${clientName} not found`);

        //remove client from store
        this.pairedClients.delete(client.name);
        this.savePairedClients();

        //remove certificate
        this.clientCerts.delete(client.name);
        this.saveClientCerts();

        //emit event
        this.emitPairedClientsUpdated();
        return true;
    }
}

export default ClientManager;