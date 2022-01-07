import type { ClientRequest, IncomingMessage } from 'http';
import type PairManager from './clientManager';
import https from 'https';
import type { Certificate } from 'electron';

type IdentityChecker = (servername: string, _cert: Certificate) => Error | undefined;

class requestHelper {

    pairManager : PairManager;

    constructor(_pairManager : PairManager) {
        this.pairManager = _pairManager;
    }

    checkServerIdentity(servername : string, _cert : Certificate) : Error | undefined {
        if((_cert?.subject as unknown as {OU:string})?.OU === 'MultiDisplayStreamer'){
            return undefined;
        }
        return Error('Invalid certificate');
    }

    request(_client : string | Client, _path: string, options?: https.RequestOptions, secure = true, callback?: ((res: IncomingMessage) => void) | undefined) : ClientRequest {
        const client = typeof _client === 'string' ? this.pairManager.getPairedClients().get(_client) : _client;
        if(!client) throw new Error('Client not found');

        const clientCert = this.pairManager.getPairedClientCertificate(client) || '';
        const clientToken = this.pairManager.getPairedClientToken(client) || '';

        options = options || {};
        options.host = client.address;
        options.port = client.port;
        options.path = _path;

        options.rejectUnauthorized = secure;
        if(secure) options.ca = (Array.isArray(options.ca)) ? [...options.ca,...clientCert] : [options?.ca || '',clientCert];
        if(secure) (options as {checkServerIdentity : IdentityChecker}).checkServerIdentity = this.checkServerIdentity;

        if(clientToken !== '') {
            options.headers = options.headers || {};
            options.headers['Authorization'] = `Bearer ${clientToken}`;
        }

        return https.request(options,callback);
    }
}

export default requestHelper;