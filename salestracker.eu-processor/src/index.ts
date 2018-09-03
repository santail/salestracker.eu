var elasticsearch = require('elasticsearch');
var util = require('util');

var LOG = require("../lib/services/Logger");
var SessionFactory = require('../lib/services/SessionFactory');

var worker = SessionFactory.getQueueConnection();

var elastic = new elasticsearch.Client({
    host: process.env.ELASTICSEARCH_URL || 'http://127.0.0.1:9200',
    log: 'error'
});;

LOG.info(util.format('[STATUS] [OK] [%s] Initializing indexes'));

elastic.indices.create({
    index: 'salestracker'
}, function (err, resp, status) {
    if (err) {
        LOG.error(util.format('[STATUS] [Failure] Initializing indexes failed', err));
    } else {
        LOG.info(util.format('[STATUS] [OK] Initializing indexes succeeded', resp, status));
    }
});

worker.process('processData', 10, function (job, done) {
    var offer = job.data;

    SessionFactory.getDbConnection().offers.save(offer, function (err, saved) {
        if (err) {
            LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Saving offer failed', offer.site, offer.id, err));
            return done(err);
        }

        if (!saved) {
            LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Saving offer failed', offer.site, offer.id, err));
            return done(new Error('DB save query failed'));
        }

        LOG.info(util.format('[STATUS] [OK] [%s] Offer saved %s', offer.site, offer.url));

        delete offer._id;
        delete offer.pictures;

        elastic.index({
            index: 'salestracker',
            type: 'offers',
            body: offer
        }, function (err, resp) {
            if (err) {
                LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Indexing offer failed', offer.site, offer.id, err));
                return done(err);
            }

            LOG.info(util.format('[STATUS] [OK] [%s] Offer indexed %s', offer.site, offer.url));
            return done(null, resp);
        });
    });
});