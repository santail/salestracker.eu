'use strict';

/**
 * Module dependencies.
 */
var categories = require('../controllers/categories.server.controller');

module.exports = function (app) {
  // Categories collection routes
  app.route('/api/categories')
    .get(categories.list)
    .put(categories.update)
    .post(categories.create);
};
