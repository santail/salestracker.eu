'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash')._;
var franc = require('franc');
var mongoose = require('mongoose');

var Wish = mongoose.model('Wish');
var errorHandler = require('../core/errors.server.controller');

/**
 * Create a wish
 */
exports.create = function (req, res) {
  var wish = new Wish(req.body);

  const detectionResult = franc.all(req.body.content, {whitelist: ['rus', 'eng', 'est']})

  const language = _.maxBy(detectionResult, function(result) {
    return result[1];
  });

  wish.contacts = {
    email: req.body.email,
    phone: req.body.phone
  };

  if (language && language[0] !== 'und') {
    wish.locale = language[0];
  }

  wish.expires = new Date(new Date().getTime() + 1 * 30 * 24 * 60 * 60 * 1000); // expires in one month
  
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

  wish.contacts = {
    email: req.body.email,
    phone: req.body.phone
  }

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
