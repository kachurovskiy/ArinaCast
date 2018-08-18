const fs = require('fs');
const path = require('path');
const Media = require('./media');
const pref = require('./pref');
const recursive = require('recursive-readdir');

const imgs = ['jpg', 'jpeg', 'png', 'gif', 'tiff', 'tif'];
const vids = ['mp4', 'mts', 'mkv', 'avi', 'wmv', 'mov', 'm4v', '3gp', 'mpg', 'm2ts'];
const supportedExtensions = imgs.concat(vids);
const ignoredExtensions = ['db'];

function mediaComparator(a, b) {
  if (a.relativeDir < b.relativeDir) {
    return -1;
  } else if (a.relativeDir > b.relativeDir) {
    return 1;
  }
  return a.time - b.time; // Chronological.
}

class MediaLib {
  constructor() {
    this.reloading_ = false;
    this.allMedia_ = [];
    this.hashMap_ = {};
    this.yearMap_ = {};
    this.status_ = 'Not initialized';

    this.filePathMap_ = {};
  }

  setStatusCallback(value) {
    this.statusCallback_ = value;
  }

  getStatus() {
    return this.status_;
  }

  setStatus(value) {
    if (this.status_ == value) {
      return;
    }
    this.status_ = value;
    if (this.statusCallback_) {
      this.statusCallback_(value);
    }
  }

  reload() {
    if (this.reloading_) {
      return;
    }
    this.allMedia_ = [];
    this.hashMap_ = {};
    this.yearMap_ = {};
    if (!pref.getContentRoot()) {
      this.setStatus('No content root specified');
      return;
    }
    this.setStatus('Checking whether content root exists...');
    this.root_ = path.resolve(pref.getContentRoot());
    if (!fs.existsSync(this.root_)) {
      this.setStatus('Content root doesn\'t exist: ' + this.root_);
      return;
    }
    this.reloading_ = true;
    this.setStatus('Reloading...');
    recursive(this.root_, this.reloadFiles_.bind(this));
  }

  reloadFiles_(err, allFiles) {
    this.setStatus(
      (err ? 'Some errors reported. ' : '') +
      'Processing ' + allFiles.length + ' files...');
    const statsKind = {i: 0, v: 0};
    const statsSkipped = {};
    let statsPending = 0;
    let mainCycleOver = false;
    for (let file of allFiles) {
      let extension = path.extname(file).toLowerCase() || 'without extension';
      if (extension.charAt(0) == '.') {
        extension = extension.slice(1);
      }
      if (supportedExtensions.indexOf(extension) >= 0) {
        const cachedMedia = this.filePathMap_[path.normalize(file)];
        if (cachedMedia) {
          statsKind[cachedMedia.kind]++;
          this.addMedia_(cachedMedia);
        } else {
          statsPending++;
          fs.stat(file, (err, stats) => {
            if (stats) {
              const media = new Media(
                file,
                path.normalize(file).slice(path.normalize(this.root_).length),
                extension,
                imgs.indexOf(extension) >= 0 ? 'i' : 'v',
                new Date(stats.mtime).getTime());
              statsKind[media.kind]++;
              this.addMedia_(media);
              this.filePathMap_[path.normalize(file)] = media;
            }
            statsPending--;
            if (!statsPending && mainCycleOver) {
              this.finishReload_(statsKind, statsSkipped);
            }
          });
        }
      } else if (ignoredExtensions.indexOf(extension) == -1) {
        if (statsSkipped[extension]) {
          statsSkipped[extension]++;
        } else {
          statsSkipped[extension] = 1;
        }
      }
    }
    if (!statsPending) {
      this.finishReload_(statsKind, statsSkipped);
    }
    mainCycleOver = true;
  }
  
  addMedia_(media) {
    this.allMedia_.push(media);
    this.hashMap_[media.hash] = media;
    if (!this.yearMap_[media.year]) {
      this.yearMap_[media.year] = [media];
    } else {
      this.yearMap_[media.year].push(media);
    }
  }

  finishReload_(statsKind, statsSkipped) {
    if (!this.reloading_) {
      throw new Error('Unexpected finishReload_ call');
    }
    this.allMedia_.sort(mediaComparator);
    for (let year in this.yearMap_) {
      this.yearMap_[year].sort(mediaComparator);
    }
    for (let i = 0; i < this.allMedia_.length; i++) {
      this.allMedia_[i].index = i;
    }
    this.reloading_ = false;
    this.setStatus("Photos: " + statsKind.i + ", videos: " + statsKind.v +
      ", skipped files by type: " + JSON.stringify(statsSkipped));
    this.updateWatcher_();
  }

  get(hash) {
    return this.hashMap_[hash];
  }

  getAllMediaInYear(year) {
    return this.yearMap_[year];
  }

  getAllYears() {
    const years = [];
    for (let year in this.yearMap_) {
      years.push(year);
    }
    return years.sort().reverse();
  }

  getAllMedia() {
    return this.allMedia_;
  }

  updateWatcher_() {
    if (this.watcher_) {
      this.watcher_.close();
    }
    this.watcher_ = fs.watch(this.root_, {recursive: true}, () => {
      if (this.reloadTimeoutId_) {
        clearTimeout(this.reloadTimeoutId_);
        this.reloadTimeoutId_ = 0;
      }
      this.reloadTimeoutId_ = setTimeout(() => this.reload(), 10*1000);
    });
  }
};
module.exports = new MediaLib();
