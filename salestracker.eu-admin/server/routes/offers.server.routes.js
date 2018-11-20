'use strict';

/**
 * Module dependencies.
 */
var offers = require('../controllers/offers.server.controller');

module.exports = function (app) {
  // Offers collection routes
  app.route('/api/offers')
    .get(offers.list)
    .post(offers.create);

  // Single offer routes
  app.route('/api/offers/:offerId')
    .get(offers.read)
    .put(offers.update)
    .delete(offers.delete);

  // Finish by binding the offer middleware
  app.param('offerId', offers.offerByID);
};
