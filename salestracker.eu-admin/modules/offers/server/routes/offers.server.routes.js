'use strict';

/**
 * Module dependencies.
 */
var offersPolicy = require('../policies/offers.server.policy'),
  offers = require('../controllers/offers.server.controller');

module.exports = function (app) {
  // Offers collection routes
  app.route('/api/offers')
    .all(offersPolicy.isAllowed)
    .get(offers.list)
    .post(offers.create);

  // Single offer routes
  app.route('/api/offers/:offerId').all(offersPolicy.isAllowed)
    .get(offers.read)
    .put(offers.update)
    .delete(offers.delete);

  // Finish by binding the offer middleware
  app.param('offerId', offers.offerByID);
};
