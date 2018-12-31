const electron = require('electron');
const ipcMain = require('electron').ipcMain;
const path = require('path');
const pref = require('./pref');
const request = require('request');
const url = require('url');
const child_process = require('child_process');
const vlcCommand = require('vlc-command');

class Player {
  constructor() {
    this.imgWindow_ = null;
    this.currentMedia_ = null;
    this.vlcProcess_ = null;
    ipcMain.on('img-ready', () => this.sendPlayImg_());
  }
  
  getCurrentMedia() {
    return this.currentMedia_;
  }
  
  play(media) {
    if (this.currentMedia_ == media) {
      return Promise.resolve();
    }
    this.currentMedia_ = media;
    if (!media) {
      this.stopVlc_();
      this.hideImg_();
      return Promise.resolve();
    }
    if (media.kind == 'i') {
      this.sendPlayImg_();
      this.stopVlc_();
      return Promise.resolve();
    } else if (media.kind == 'v') {
      this.hideImg_();
      if (!this.vlcProcess_) {
        return new Promise((resolve, reject) => {
          vlcCommand((err, cmd) => {
            if (err) {
              reject('Could not find vlc command path');
              return;
            }
            this.vlcProcess_ = child_process.spawn(cmd, [
              '--fullscreen',
              '--no-video-title',
              '--qt-minimal-view',
              '--play-and-pause',
              // Without this on Windows 10 taskbar may appear on top.
              '--video-on-top',
              // Without this Google Photos Movies are 2 times louder than
              // normal smartphone videos
              '--audio-filter', 'equalizer:normvol',
              '--mouse-hide-timeout', '0',
              '--extraintf', 'http',
              '--http-port', '6568',
              media.path
            ]);
            this.vlcProcess_.on('close', (code) => {
              this.vlcProcess_ = null;
            });
            resolve();
          })
        });
      } else {
        return this.vlccmd_(
          '?command=in_play&input=' + encodeURIComponent(media.path));
      }
    } else {
      return Promise.reject('Unknown kind: ' + media);
    }
  }
  
  sendPlayImg_() {
    const imgMedia = this.currentMedia_ && this.currentMedia_.kind == 'i' ?
      this.currentMedia_ : null;
    this.getImgWindow_().send('img', imgMedia ? imgMedia.path : '');
  }

  hideImg_() {
    if (this.imgWindow_) {
      setTimeout(() => this.imgWindow_.minimize(), 0);
    }
  }

  vlccmd_(cmd) {
    return new Promise((resolve, reject) => {
      request.get(
        'http://localhost:6568/requests/status.xml' + cmd,
        (err, res, json) => {
          if (err) {
            reject('VLC command failed: ' + err);
          } else {
            resolve();
          }
        });
    });
  }

  getImgWindow_() {
    if (this.imgWindow_) {
      this.imgWindow_.focus();
      return this.imgWindow_;
    }
    this.imgWindow_ = new electron.BrowserWindow({
      fullscreen: true,
      frame: false,
      alwaysOnTop: true,
      backgroundColor: '#000000',
    })
    this.imgWindow_.loadURL(url.format({
      pathname: path.join(__dirname, 'img.html'),
      protocol: 'file:',
      slashes: true,
    }))
    this.imgWindow_.on('closed', () => this.imgWindow_ = null);
    this.imgWindow_.focus();
    return this.imgWindow_;
  }

  stopVlc_() {
    if (this.vlcProcess_) {
      this.vlccmd_('?command=pl_stop');
    }
  }
  
  close() {
    if (this.imgWindow_) {
      this.imgWindow_.close();
    }
    if (this.vlcProcess_) {
      this.vlcProcess_.kill();
      this.vlcProcess_ = null;
    }
  }
};

module.exports = new Player();
