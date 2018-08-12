const app = require('./app');
const http = require('http');
const path = require('path');
const url = require('url');
const fs = require('fs');
const electron = require('electron');
const pref = require('./pref');
const ipcMain = require('electron').ipcMain;
const medialib = require('./medialib');
const ip = require('ip');

const port = parseInt(process.env.PORT, 10) || 6567; // A and C ascii codes.
app.set('port', port);
const server = http.createServer(app);
server.listen(port);
server.on('listening', () => {
  console.log('Listening on ', server.address());
});

let wins = {};

function createWindow(page = 'main.html') {
  if (wins[page]) {
    wins[page].focus();
    return;
  }
  let win = new electron.BrowserWindow({width: 800, height: 800})
  win.loadURL(url.format({
    pathname: path.join(__dirname, page),
    protocol: 'file:',
    slashes: true
  }))
  wins[page] = win;
  win.on('closed', () => wins[page] = null);
}

function updateGlobalSharedPref() {
  global.sharedPref = {
    'medialib-status': medialib.getStatus(),
    contentRoot: pref.getContentRoot(),
    thumbRoot: pref.getThumbRoot(),
    tvIp: pref.getTvIp(),
    tvType: pref.getTvType(),
    tvSecret: pref.getTvSecret(),
    tvInput: pref.getTvInput(),
    hostname: require('os').hostname().toLowerCase(),
    ip: ip.address(),
  };
}
updateGlobalSharedPref();

medialib.setStatusCallback((status) => {
  global.sharedPref['medialib-status'] = status;
  wins['main.html'] && wins['main.html'].webContents.send(
    'medialib-status', status);
});

electron.app.on('ready', () => createWindow())
electron.app.on('window-all-closed', electron.app.quit);

ipcMain.on('save-pref', (event, updates) => {
  pref.setContentRoot(updates.contentRoot);
  pref.setThumbRoot(updates.thumbRoot);
  pref.setTvIp(updates.tvIp);
  pref.setTvType(updates.tvType);
  pref.setTvSecret(updates.tvSecret);
  pref.setTvInput(updates.tvInput);
  updateGlobalSharedPref();
  medialib.reload();
});

ipcMain.on('autostart', (event, updates) => {
  // Removing from autostart doesn't work, API seems broken on some OSes.
  electron.app.setLoginItemSettings({openAtLogin: true});
});

ipcMain.on('medialib-init', (event, data) => {
  if (!medialib.getAllMedia().length) {
    medialib.reload();
  }
});
