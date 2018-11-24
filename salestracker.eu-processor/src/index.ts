var util = require('util');


var LOG = require("../lib/services/Logger");
var SessionFactory = require('../lib/services/SessionFactory');

import ElasticIndexer from './services/ElasticIndexer';
import OfferProcessor from './services/OfferProcessor';
import ImageProcessor from './services/ImageProcessor';
import CategoryProcessor from './services/CategoryProcessor';

var worker = SessionFactory.getQueueConnection();
var elastic = SessionFactory.getElasticsearchConnection();

elastic.ping({ // test
    requestTimeout: Infinity
}, function (err) {
    if (err) {
        console.trace('elasticsearch cluster is down!');
    } else {
        console.log('Connected');

        ElasticIndexer.initializeIndexes()
            .then(function () {
                LOG.info(util.format('[OK] Initializing indexes succeeded'));

                worker.process('processData', 10, function (job, done) {
                    var data = job.data;

                    OfferProcessor.process(data, done);
                });

                worker.process('processImage', 10, function (job, done) {
                    var data = job.data;

                    ImageProcessor.process(data, done);
                });

                worker.process('processCategories', 10, function (job, done) {
                    var data = job.data;

                    CategoryProcessor.process(data, done);
                });
            })
            .catch(function (err) {
                LOG.error(util.format('[ERROR] Initializing indexes failed', err));
            });
    }
});