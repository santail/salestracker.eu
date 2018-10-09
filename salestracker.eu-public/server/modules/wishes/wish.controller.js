'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
  mongoose = require('mongoose'),
  Wish = mongoose.model('Wish'),
  errorHandler = require('../core/errors.server.controller');

/**
 * Create a wish
 */
exports.create = function (req, res) {
  var wish = new Wish(req.body);
  wish.user = req.user;

  wish.save(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(wish);
    }
  });
};

/**
 * Show the current wish
 */
exports.read = function (req, res) {
  res.json(req.wish);
};

/**
 * Update a wish
 */
exports.update = function (req, res) {
  var wish = req.wish;

  wish.title = req.body.title;
  wish.content = req.body.content;

  wish.save(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(wish);
    }
  });
};

/**
 * Delete an wish
 */
exports.delete = function (req, res) {
  var wish = req.wish;

  wish.remove(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(wish);
    }
  });
};

/**
 * List of Wishs
 */
exports.list = function (req, res) {
  Wish.find().sort('-created').populate('user', 'displayName').exec(function (err, wishes) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(wishes);
    }
  });
};

/**
 * Wish middleware
 */
exports.wishByID = function (req, res, next, id) {

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send({
      message: 'Wish is invalid'
    });
  }

  Wish.findById(id).populate('user', 'displayName').exec(function (err, wish) {
    if (err) {
      return next(err);
    } else if (!wish) {
      return res.status(404).send({
        message: 'No wish with that identifier has been found'
      });
    }
    req.wish = wish;
    next();
  });
};
