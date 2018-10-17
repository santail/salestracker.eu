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
            }, function (err, response, status) {
                if (err) {
                    LOG.error(util.format('[STATUS] [Failure] [%s] Offers search failed', foundWish.content, err));
                }
                else {
                    _.each(response.hits.hits, function (foundOffer) {
                        console.log(foundOffer._source.translations.rus.title, status);
                    })
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