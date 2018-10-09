'use strict';

module.exports = function (app) {
  // User Routes
  var controller = require('./users.controller');

  // Setting up the users profile api
  app.route('/api/users/me').get(controller.me);
  app.route('/api/users').put(controller.update);
  app.route('/api/users/accounts').delete(controller.removeOAuthProvider);
  app.route('/api/users/password').post(controller.changePassword);
  app.route('/api/users/picture').post(controller.changeProfilePicture);

  // Finish by binding the user middleware
  app.param('userId', controller.userByID);
};
