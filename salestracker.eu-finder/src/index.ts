import { withStatement } from "babel-types";

var _ = require('lodash');
var mongojs = require('mongojs');
var util = require('util');

var LOG = require('../lib/services/Logger');
var SessionFactory = require("../lib/services/SessionFactory");


var db = SessionFactory.getDbConnection();
var worker = SessionFactory.getQueueConnection();
var elastic = SessionFactory.getElasticsearchConnection();

setInterval(function () {
    var now = Date.now();

    SessionFactory.getDbConnection().wishes.findOne({}, function (err, foundWish) {
        if (err) {
            LOG.error(util.format('[STATUS] [Failure] Checking wish failed', err));
        } else if (foundWish) {
            
            elastic.search({
                index: 'salestracker',
                type: 'offers',
                body: {
                    query: {
                        term: {
                            'translations.rus.title': foundWish.content
                        }
                    }
                }
            }, function (err, response) {
                if (err) {
                    LOG.error(util.format('[STATUS] [Failure] [%s] Offers search failed', foundWish.content, err));
                }
                else {
                    let notification = {
                        wish: foundWish,
                        offers: _.map(response.hits.hits, function (offer) {
                            return offer._source;
                        })
                    };

                    worker.create('sendNotification', notification)
                        .attempts(3).backoff({
                            delay: 60 * 1000,
                            type: 'exponential'
                        })
                        .removeOnComplete(true)
                        .save(function (err) {
                            if (err) {
                                LOG.error(util.format('[STATUS] [FAILED] Notification processing schedule failed', notification, err));
                            }

                            LOG.debug(util.format('[STATUS] [OK] Notification processing scheduled'));
                        });
                }
           
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
            });
        } else {
            LOG.info(util.format('[STATUS] [OK] No unprocessed wishes found'));
        };
    });

}, 10000);