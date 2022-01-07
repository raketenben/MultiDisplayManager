import forge from 'node-forge';

import Store from 'electron-store';
import InstanceHelper from './instanceHelper';

class CertificateManager {

    //certificate store
    static store : Store = new Store({cwd: InstanceHelper.getInstanceSavePath(),name:'certificates'});

    private static generateKeys() : forge.pki.KeyPair{
        return forge.pki.rsa.generateKeyPair(2048);
    }

    static getCertificateKeys() : forge.pki.KeyPair{
        const privateKeyPem : string =this.store.get('certificatePrivateKey') as string;
        const publicKeyPem : string = this.store.get('certificatePublicKey') as string;
        if(!privateKeyPem || !publicKeyPem || process.argv.includes('--reset-keys')){
            const keys = this.generateKeys();
            this.store.set('certificatePrivateKey',forge.pki.privateKeyToPem(keys.privateKey));
            this.store.set('certificatePublicKey',forge.pki.publicKeyToPem(keys.publicKey));
            return keys;
        }else{
            const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
            const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
            return {privateKey,publicKey};
        }
    } 

    private static generateCertificate(privateKey : forge.pki.PrivateKey,publicKey : forge.pki.PublicKey) : string {
        const cert = forge.pki.createCertificate();
        cert.publicKey = publicKey;
        cert.serialNumber = '01';
        cert.validity.notBefore = new Date();
        cert.validity.notAfter = new Date();
        cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear()+100);

        const attrs = [
            {
                shortName: 'OU',
                value: 'MultiDisplayStreamer',
            },
        ];

        cert.setIssuer(attrs);
        cert.setSubject(attrs);

        cert.sign(privateKey);

        return forge.pki.certificateToPem(cert);
    }

    static getCertificate() : string {
        let certificate = this.store.get('certificate',null) as string | null;
        if(certificate === null || process.argv.includes('--reset-keys')){
            const keys = this.getCertificateKeys();
            certificate = this.generateCertificate(keys.privateKey,keys.publicKey);
            this.store.set('certificate',certificate);
        }
        return certificate;
    }
    
}

export default CertificateManager;