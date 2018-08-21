'use strict';

/**
 * Module dependencies.
 */
var wishesPolicy = require('../policies/wishes.server.policy'),
  wishes = require('../controllers/wishes.server.controller');

module.exports = function (app) {
  // Wishes collection routes
  app.route('/api/wishes').all(wishesPolicy.isAllowed)
    .get(wishes.list)
    .post(wishes.create);

  // Single wish routes
  app.route('/api/wishes/:wishId').all(wishesPolicy.isAllowed)
    .get(wishes.read)
    .put(wishes.update)
    .delete(wishes.delete);

  // Finish by binding the wish middleware
  app.param('wishId', wishes.wishByID);
};
