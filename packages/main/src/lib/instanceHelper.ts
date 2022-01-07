import {app} from 'electron';
import path from 'path';

import fs from 'fs'; 

class InstanceHelper {
    private static getInstanceSubName() : string {
        const args = process.argv;
        const regex = new RegExp('--savename=([a-zA-Z0-9-]+)');
        for (let i = 0; i < args.length; i++) {
            const match = regex.exec(args[i]);
            if(match) return match[1];
        }
        return 'default';
    }

    static getInstanceSavePath() : string {
        const userDataPath = app.getPath('userData');
        const fileFolderPath = path.join(userDataPath,'instances',this.getInstanceSubName());

        //create the folder if it doesn't exist
        fs.mkdirSync(fileFolderPath,{recursive:true});

        return fileFolderPath;
    }
}

export default InstanceHelper;