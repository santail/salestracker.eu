'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
  mongoose = require('mongoose'),
  Offer = mongoose.model('Offer'),
  errorHandler = require('../core/errors.server.controller');

/**
 * Create a offer
 */
exports.create = function (req, res) {
  var offer = new Offer(req.body);
  offer.user = req.user;

  offer.save(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(offer);
    }
  });
};

/**
 * Show the current offer
 */
exports.read = function (req, res) {
  res.json(req.offer);
};

/**
 * Update a offer
 */
exports.update = function (req, res) {
  var offer = req.offer;

  offer.title = req.body.title;
  offer.content = req.body.content;

  offer.save(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(offer);
    }
  });
};

/**
 * Delete an offer
 */
exports.delete = function (req, res) {
  var offer = req.offer;

  offer.remove(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(offer);
    }
  });
};

/**
 * List of Offers
 */
exports.list = function (req, res) {
  Offer.find().sort('-created').populate('user', 'displayName').exec(function (err, offers) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(offers);
    }
  });
};

/**
 * Offer middleware
 */
exports.offerByID = function (req, res, next, id) {

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send({
      message: 'Offer is invalid'
    });
  }

  Offer.findById(id).populate('user', 'displayName').exec(function (err, offer) {
    if (err) {
      return next(err);
    } else if (!offer) {
      return res.status(404).send({
        message: 'No offer with that identifier has been found'
      });
    }
    req.offer = offer;
    next();
  });
};
