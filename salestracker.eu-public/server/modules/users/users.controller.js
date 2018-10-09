'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash');

/**
 * Extend user's controller
 */
module.exports = _.extend(
  require('./users.authentication.controller'),
  require('./users.authorization.controller'),
  require('./users.password.controller'),
  require('./users.profile.controller')
);
