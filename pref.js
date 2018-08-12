const store = require('data-store')('ArinaCast');
const path = require('path');

class Pref {
  constructor() {
    this.contentRoot_ = store.get('contentRoot');
    this.thumbRoot_ = store.get('thumbRoot');
    this.tvIp_ = store.get('tvIp');
    this.tvType_ = store.get('tvType');
    this.tvSecret_ = store.get('tvSecret');
    this.tvInput_ = store.get('tvInput');
  }

  getContentRoot() {
    return this.contentRoot_;
  }

  setContentRoot(value) {
    store.set('contentRoot', value);
    this.contentRoot_ = value;
  }

  getThumbRoot() {
    return this.thumbRoot_;
  }

  setThumbRoot(value) {
    store.set('thumbRoot', value);
    this.thumbRoot_ = value;
  }

  getTvIp() {
    return this.tvIp_;
  }

  setTvIp(value) {
    store.set('tvIp', value);
    this.tvIp_ = value;
  }

  getTvType() {
    return this.tvType_;
  }

  setTvType(value) {
    store.set('tvType', value);
    this.tvType_ = value;
  }

  getTvSecret() {
    return this.tvSecret_;
  }

  setTvSecret(value) {
    store.set('tvSecret', value);
    this.tvSecret_ = value;
  }

  getTvInput() {
    return this.tvInput_;
  }

  setTvInput(value) {
    store.set('tvInput', value);
    this.tvInput_ = value;
  }
};

module.exports = new Pref();
