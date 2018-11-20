'use strict';

/**
 * Module dependencies.
 */
var jobs = require('../controllers/jobs.server.controller');

module.exports = function (app) {
  app.route('/api/jobs')
    .post(jobs.create);
};
