'use strict';

/**
 * Module dependencies.
 */
var policy = require('./admin.server.policy'),
  controller = require('./admin.server.controller');

module.exports = function (app) {
  // User route registration first. Ref: #713
  require('./users.routes.js')(app);

  // Users collection routes
  app.route('/api/users')
    .get(policy.isAllowed, controller.list);

  // Single user routes
  app.route('/api/users/:userId')
    .get(policy.isAllowed, controller.read)
    .put(policy.isAllowed, controller.update)
    .delete(policy.isAllowed, controller.delete);

  // Finish by binding the user middleware
  app.param('userId', controller.userByID);
};
