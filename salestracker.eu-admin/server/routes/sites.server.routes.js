'use strict';

/**
 * Module dependencies.
 */
var sites = require('../controllers/sites.server.controller');

module.exports = function (app) {
  // Sites collection routes
  app.route('/api/sites')
    .get(sites.list)
    .put(sites.update)
    .post(sites.create);
};
