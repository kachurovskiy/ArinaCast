const crypto = require('crypto');

const yearRegex = /(^|\/|\\)([0-9]{4})(\/|\\)/;

class Media {
  constructor(path, relativePath, extension, kind, time) {
    this.path = path;
    this.relativePath = relativePath;
    this.extension = extension;
    this.kind = kind;
    this.hash = crypto.createHash('md5').update(relativePath).digest('hex');
    this.time = time;
    let date = new Date(time);
    this.year = this.getYearFromPath() || String(date.getFullYear());
  }

  json() {
    return {
      hash: this.hash,
      relativePath: this.relativePath,
      kind: this.kind,
      extension: this.extension,
      year: this.year,
      index: this.index,
    };
  }
  
  getYearFromPath() {
    const matches = yearRegex.exec(this.relativePath);
    const year = Number(matches[2]);
    if (year && year > 0) {
      return matches[2];
    }
    return undefined;
  }
  
  toString() {
    return "Media " + this.path + " kind " + this.kind + " hash " + this.hash;
  }
}

module.exports = Media;