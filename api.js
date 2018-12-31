const medialib = require('./medialib');
const express = require('express');
const os = require('os');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const router = express.Router();
const easyimage = require('easyimage');
const tmp = require('tmp');
const pref = require('./pref');
const player = require('./player');
const tv = require('./tv');
const child_process = require('child_process');

function sendOk(res) {
  res.status(200).send('{"status":"OK"}');
}

function sendErr(res, msg) {
  console.error(msg);
  res.status(500).send(JSON.stringify({status: msg}));
}

function sendResizedFile(path, thumbPath, res) {
  if (!fs.existsSync(path)) {
    sendErr(res, 'Not found where expected: ' + path);
    return;
  }
  console.log('Started resizer', path);

  easyimage.thumbnail({
    src: path,
    dst: thumbPath,
    width: 300,
    height: 300,
    quality: 90,
  }).then(() => {
    cache(res);
    console.log('Finished resizer', path);
    res.sendFile(thumbPath, {}, () => {});
  }).catch((e) => {
    cache(res);
    console.log('Resizer error: ', e);
    res.sendFile(path, {}, () => {});
  });
}

router.get('/media/get/:hash', function(req, res, next) {
  const hash = req.params.hash;
  const media = medialib.get(hash);
  if (!media) {
    res.status(404).send('Not found');
    return;
  }
  cache(res);
  res.sendFile(media.path);
});

router.get('/media/years', function(req, res, next) {
  res.json(medialib.getAllYears());
});

router.get('/media/list', function(req, res, next) {
  const year = req.query.year;
  const kind = req.query.kind;
  let allMedia = null;
  if (year) {
    allMedia = medialib.getAllMediaInYear(year);
  } else {
    allMedia = medialib.getAllMedia();
  }
  const result = [];
  for (let media of allMedia) {
    if (!kind || media.kind == kind) {
      result.push(media.json());
    }
  }
  res.json({
    media: result,
    tvSupported: pref.getTvType() && pref.getTvIp() && !!pref.getTvSecret(),
  });
});

router.get('/media/preview/:hash', function(req, res, next) {
  const hash = req.params.hash;
  const media = medialib.get(hash);
  if (!media) {
    res.status(404).send('Not found');
    return;
  }

  const thumbName = media.hash + '.jpg';
  const thumbPath = path.join(pref.getThumbRoot(), thumbName);
  if (fs.existsSync(thumbPath)) {
      cache(res);
      res.sendFile(thumbPath);
      return;        
  }

  if (media.kind == 'i') {
    sendResizedFile(media.path, thumbPath, res);
  } else if (media.kind == 'v') {
    let filenames = null;
    console.log('starting ffmpeg', media.path);
    const proc = new ffmpeg(media.path)
      .on('filenames', function(fn) {
        filenames = fn;
      })
      .on('end', function() {
        console.log('finished ffmpeg', filenames);
        screenshotPath = path.join(os.tmpdir(), filenames[0]);
        sendResizedFile(screenshotPath, thumbPath, res);
      })
      .on('error', function(err) {
        sendErr(res, 'ffmpeg error: ' + err);
      })
      .screenshots({
        count: 1,
        filename: String(media.hash),
      }, os.tmpdir());
  } else {
    sendErr(res, 'unknown kind: ' + media);
  }
});

router.post('/media/tv/on', function(req, res, next) {
  tv.on()
    .then(() => sendOk(res))
    .catch((error) => sendErr(res, 'Error turning on: ' + error));
});

router.post('/media/tv/off', function(req, res, next) {
  tv.off()
    .then(() => {
      sendOk(res);
      child_process.exec('rundll32.exe powrprof.dll,SetSuspendState 0,1,0');
    })
    .catch((error) => sendErr(res, 'Error turning off: ' + error));
});

router.post('/media/tv/volume/up', function(req, res, next) {
  tv.volumeUp()
    .then(() => sendOk(res))
    .catch((error) => sendErr(res, 'Error changing volume: ' + error));
});

router.post('/media/tv/volume/down', function(req, res, next) {
  tv.volumeDown()
    .then(() => sendOk(res))
    .catch((error) => sendErr(res, 'Error changing volume: ' + error));
});

router.post('/media/play/offset/:offset', function(req, res, next) {
  const offset = Math.round(Number(req.params.offset));
  if (!offset) {
    res.status(404).send('Bad offset');
    return;
  }
  playMediaAtOffset(offset, req, res, next);
});

function playMediaAtOffset(offset, req, res, next) {
  const allMedia = medialib.getAllMedia();
  if (!allMedia || !allMedia.length) {
    res.status(404).send('No media');
    return;
  }
  let newIndex = allMedia.length - 1;
  let currentMedia = player.getCurrentMedia();
  if (currentMedia) {
    newIndex = currentMedia.index + offset;
    if (newIndex >= allMedia.length) {
      newIndex = allMedia.length - 1;
    } else if (newIndex < 0) {
      newIndex = 0;
    }
  }
  player.play(allMedia[newIndex])
    .then(() => sendOk(res))
    .catch((error) => sendErr(res, 'Error playing: ' + error));
}

router.post('/media/play/:hash', function(req, res, next) {
  const hash = req.params.hash;
  const media = medialib.get(hash);
  if (!media) {
    res.status(404).send('Not found');
    return;
  }
  player.play(media)
    .then(() => sendOk(res))
    .catch((error) => sendErr(res, 'Error playing: ' + error));;
});

router.post('/media/close', function(req, res, next) {
  player.close();
  sendOk(res);
});

function cache(res) {
  if (!res.getHeader('Cache-Control') || !res.getHeader('Expires')) {
    res.setHeader("Cache-Control", "public, max-age=34560000");
    res.setHeader("Expires", new Date(Date.now() + 34560000000).toUTCString());
  }
}

module.exports = router;
