"use strict";

var winston = require('winston');

var Logger = new winston.Logger({
  transports: [
    new(winston.transports.Console)({
      timestamp: true,
      handleExceptions: true,
      level: 'info'
    })
  ],
  exitOnError: false
});

module.exports = Logger;