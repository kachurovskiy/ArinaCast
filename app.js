const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');

const api = require('./api');
const app = express();
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', api);
app.use(function(req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});
app.use(function(err, req, res, next) {
  res.status(err.status || 500).send(err.message);
});

module.exports = app;
