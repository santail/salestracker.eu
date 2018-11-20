'use strict';

/**
 * Module dependencies.
 */
var config = require('../config'),
    chalk = require('chalk'),
    path = require('path'),
    mongoose = require('mongoose');

mongoose.Promise = global.Promise;

// Load the mongoose models
module.exports.loadModels = function () {
    // Globbing model files
    config.files.server.models.forEach(function (modelPath) {
        require(path.resolve(modelPath));
    });
};

// Initialize Mongoose
module.exports.connect = function (cb) {
    var _this = this;

    require('mongoose-middleware').initialize(mongoose);

    mongoose.connect(process.env.MONGODB_URI, function (err) {
        // Log Error
        if (err) {
            console.error(chalk.red('Could not connect to MongoDB!'));
            console.log(err);
        } else {

            // Enabling mongoose debug mode if required
            mongoose.set('debug', process.env.MONGODB_DEBUG || false);

            // Call callback FN
            if (cb) cb(mongoose);
        }
    });
};

module.exports.disconnect = function (cb) {
    mongoose.disconnect(function (err) {
        console.info(chalk.yellow('Disconnected from MongoDB.'));
        cb(err);
    });
};
