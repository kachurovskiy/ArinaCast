const Bravia = require('bravia');
const pref = require('./pref');

class Tv {
  constructor() {
    this.bravia_ = {send: () => Promise.resolve()}; // noop impl.
    if (pref.getTvType() == 'bravia' && pref.getTvIp() && pref.getTvSecret()) {
      this.bravia_ = new Bravia(pref.getTvIp(), 80, pref.getTvSecret());
    }
  }

  on() {
    const result = this.bravia_.send('WakeUp');
    if (pref.getTvInput()) {
      this.setInput_();
      // Sometimes TV is busy turning on and ignores the first request.
      setTimeout(() => this.setInput_(), 3000);
    }
    return result;
  }

  setInput_() {
    return this.bravia_.send(pref.getTvInput());
  }

  off() {
    return this.bravia_.send('Sleep');
  }

  volumeUp() {
    return this.bravia_.send('VolumeUp');
  }

  volumeDown() {
    return this.bravia_.send('VolumeDown');
  }
};

module.exports = new Tv();
