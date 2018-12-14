'use strict';

/**
 * Module dependencies.
 */
var jobs = require('../controllers/jobs.server.controller');

module.exports = function (app) {
  app.route('/api/jobs/process/site')
    .post(jobs.processSite);

  app.route('/api/jobs/process/offer/content')
    .post(jobs.processContent);

  app.route('/api/jobs/process/offer/data')
    .post(jobs.processData);

  app.route('/api/jobs/process/offer/pictures')
    .post(jobs.processPictures)
    .delete(jobs.stopProcessPictures);

  app.route('/api/jobs/process/offer/categories')
    .post(jobs.processCategories);

  app.route('/api/jobs/index/offer')
    .post(jobs.processIndexing);
};