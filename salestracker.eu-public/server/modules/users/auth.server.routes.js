'use strict';

/**
 * Module dependencies.
 */
var passport = require('passport');

module.exports = function (app) {
  // User Routes
  var controller = require('./users.controller');

  // Setting up the users password api
  app.route('/api/auth/forgot').post(controller.forgot);
  app.route('/api/auth/reset/:token').get(controller.validateResetToken);
  app.route('/api/auth/reset/:token').post(controller.reset);

  // Setting up the users authentication api
  app.route('/api/auth/signup').post(controller.signup);
  app.route('/api/auth/signin').post(controller.signin);
  app.route('/api/auth/signout').get(controller.signout);

  // Setting the facebook oauth routes
  app.route('/api/auth/facebook').get(controller.oauthCall('facebook', {
    scope: ['email']
  }));
  app.route('/api/auth/facebook/callback').get(controller.oauthCallback('facebook'));

  // Setting the twitter oauth routes
  app.route('/api/auth/twitter').get(controller.oauthCall('twitter'));
  app.route('/api/auth/twitter/callback').get(controller.oauthCallback('twitter'));

  // Setting the google oauth routes
  app.route('/api/auth/google').get(controller.oauthCall('google', {
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  }));
  app.route('/api/auth/google/callback').get(controller.oauthCallback('google'));

  // Setting the linkedin oauth routes
  app.route('/api/auth/linkedin').get(controller.oauthCall('linkedin', {
    scope: [
      'r_basicprofile',
      'r_emailaddress'
    ]
  }));
  app.route('/api/auth/linkedin/callback').get(controller.oauthCallback('linkedin'));

  // Setting the github oauth routes
  app.route('/api/auth/github').get(controller.oauthCall('github'));
  app.route('/api/auth/github/callback').get(controller.oauthCallback('github'));

  // Setting the paypal oauth routes
  app.route('/api/auth/paypal').get(controller.oauthCall('paypal'));
  app.route('/api/auth/paypal/callback').get(controller.oauthCallback('paypal'));
};
