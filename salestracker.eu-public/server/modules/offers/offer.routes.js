'use strict';

/**
 * Module dependencies.
 */
var policy = require('./offer.policy'),
  controller = require('./offer.controller');

module.exports = function (app) {
  app.route('/api/offers').all(policy.isAllowed)
    .get(controller.list)
    .post(controller.create);

  app.route('/api/offers/:offerId').all(policy.isAllowed)
    .get(controller.read)
    .put(controller.update)
    .delete(controller.delete);

  app.param('offerId', controller.offerByID);
};
