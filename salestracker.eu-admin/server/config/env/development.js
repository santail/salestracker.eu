'use strict';

module.exports = {
  db: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/goodlooking',
    options: {
      user: '',
      pass: ''
    },
    // Enable mongoose debug mode
    debug: process.env.MONGODB_DEBUG || false
  },
  livereload: true
};
