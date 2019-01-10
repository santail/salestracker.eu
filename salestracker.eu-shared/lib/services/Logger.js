"use strict";

var winston = require('winston');

let Logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
  ],
  exitOnError: false, // do not exit on handled exceptions
});

module.exports = Logger;