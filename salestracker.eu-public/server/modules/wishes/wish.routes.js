'use strict';

/**
 * Module dependencies.
 */
var policy = require('./wish.policy'),
  controller = require('./wish.controller');

module.exports = function (app) {
  app.route('/api/wishes').all(policy.isAllowed)
    .get(controller.list)
    .post(controller.create);

  app.route('/api/wishes/:wishId').all(policy.isAllowed)
    .get(controller.read)
    .put(controller.update)
    .delete(controller.delete);

  app.param('wishId', controller.wishByID);
};
