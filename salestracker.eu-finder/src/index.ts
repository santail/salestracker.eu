var mongojs = require('mongojs');
var util = require('util');

var LOG = require('../lib/services/Logger');
var SessionFactory = require("../lib/services/SessionFactory");

var start = Date.now();
var db = SessionFactory.getDbConnection();
var worker = SessionFactory.getQueueConnection();


setInterval(function () {
    var now = Date.now();

    SessionFactory.getDbConnection().wishes.findOne({}, function (err, foundWish) {
        if (err) {
            LOG.error(util.format('[STATUS] [Failure] Checking wish failed', err));
        } else if (foundWish) {
            SessionFactory.getDbConnection().wishes.update({
                _id: mongojs.ObjectId(foundWish._id)
            }, {
                $set: {
                    checked: new Date().toISOString()
                }
            }, function (err, updatedWish) {
                if (err) {
                    // TODO Mark somehow wish that was not marked as processed
                    LOG.error(util.format('[STATUS] [Failure] [%s] Wish check time update failed', foundWish.content, err));
                    return;
                }

                if (!updatedWish) {
                    LOG.error(util.format('[STATUS] [Failure] [%s] Wish check time update failed', foundWish.content, err));
                } else {
                    LOG.info(util.format('[STATUS] [OK] [%s] Wish check time updated', foundWish.content));
                }
            });
        } else {
            LOG.info(util.format('[STATUS] [OK] No unprocessed wishes found'));
        };
    });

}, 1000);