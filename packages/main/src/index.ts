import {app, BrowserWindow} from 'electron';
import {join} from 'path';
import {URL} from 'url';

import {autoUpdater} from 'electron-updater';


import fs from 'fs';
import InstanceHelper from './lib/instanceHelper';

import Client from './client';
import Host from './host';

import * as shutdown from 'electron-shutdown-command';

let appState : Client | Host;
let mainWindow: BrowserWindow | null;


const createWindow = async () => {
  mainWindow = new BrowserWindow({
    show: false, // Use 'ready-to-show' event to show window
    webPreferences: {
      devTools: (import.meta.env.MODE === 'development'),
      webSecurity: (import.meta.env.MODE !== 'development'),
      nativeWindowOpen: true,
      preload: join(__dirname, '../../preload/dist/index.cjs'),
    },
  });
  mainWindow.setMenuBarVisibility(false);


  /**
   * If you install `show: true` then it can cause issues when trying to close the window.
   * Use `show: false` and listener events `ready-to-show` to fix these issues.
   *
   * @see https://github.com/electron/electron/issues/25012
   */
   mainWindow.on('ready-to-show', () => {
    mainWindow?.show();

    if (import.meta.env.MODE === 'development') {
      mainWindow?.webContents.openDevTools();
    }
  });

  /**
   * URL for main window.
   * Vite dev server for development.
   * `file://../renderer/index.html` for production and test
   */
  const pageUrl = import.meta.env.MODE === 'development' && import.meta.env.VITE_DEV_SERVER_URL !== undefined
    ? import.meta.env.VITE_DEV_SERVER_URL
    : new URL('../renderer/dist/index.html', 'file://' + __dirname).toString();


  await mainWindow.loadURL(pageUrl);

  appState = (process.argv.includes('--viewer')) ? new Client(mainWindow) : new Host(mainWindow);

  await appState.init();

};

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

//enable hardware video decoding
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
}

app.whenReady()
  .then(createWindow)
  .catch((e) => console.error('Failed create window:', e));

// Install "Vue.js devtools"
if (import.meta.env.MODE === 'development') {
  app.whenReady()
    .then(() => import('electron-devtools-installer'))
    .then(({default: installExtension, VUEJS3_DEVTOOLS}) => installExtension(VUEJS3_DEVTOOLS, {
      loadExtensionOptions: {
        allowFileAccess: true,
      }, 
    }))
    .catch(e => console.error('Failed install extension:', e));
}

// Auto-updates
if (import.meta.env.PROD) {
  if(!process.argv.includes('--viewer')){
    autoUpdater.checkForUpdatesAndNotify();
  }else{
    autoUpdater.autoDownload = true;
    autoUpdater.checkForUpdates();
    autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
      console.log('Update downloaded');
      console.log(releaseNotes,releaseName);

      if(process.argv.includes('--rebootAfterUpdate')) shutdown.reboot({timerseconds:60});

      if(process.env.DESKTOPINTEGRATION === 'AppImageLauncher') {
        process.env.APPIMAGE = process.env.ARGV0;
      }

      autoUpdater.quitAndInstall(true,process.argv.includes('--restartAfterUpdate'));
    });
  }
} 

//error logging
process.on('uncaughtException', function (error) {
  const errorFilePath = join(InstanceHelper.getInstanceSavePath(),'error.log');
  const data = `${new Date().toISOString()} ${error.message}\n${error.stack}\n\n`;
  fs.appendFileSync(errorFilePath,data);
});