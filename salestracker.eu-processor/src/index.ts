const util = require('util');

import LOG from "../lib/services/Logger";
import SessionFactory from '../lib/services/SessionFactory';

import ElasticIndexer from './services/ElasticIndexer';
import DataProcessor from './services/DataProcessor';
import ImageProcessor from './services/ImageProcessor';
import CategoryProcessor from './services/CategoryProcessor';
import ContentProcessor from './services/ContentProcessor';


const worker = SessionFactory.getQueueConnection();
const elastic = SessionFactory.getElasticsearchConnection();

elastic.ping({ // test
    requestTimeout: Infinity
}, function (err) {
    if (err) {
        console.trace('elasticsearch cluster is down!');
    } else {
        console.log('Connected');

        ElasticIndexer.initializeIndexes()
            .then(() => {
                LOG.info(util.format('[OK] Processing events listener initiated'));
                
                worker.process('processContent', 10, processContent);

                worker.process('stopProcessData', 10, stopProcessData);

                worker.process('processData', 10, processData);

                worker.process('requestPicturesHarvesting', 10, harvestPictures);

                worker.process('processCategories', 10, processCategories);

                worker.process('processIndexing', 10, processIndexing);
                
                worker.process('processImage', 10, processImage);
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] Processing events listener initiation failed', err));
            });
    }
});

const processContent = (job, done) => {
    const options = job.data;

    LOG.debug(util.format('[COMPLETED] [%s] [%s] [%s] [%s] Offer content processing started', options.language, options.site, options.origin_href, options.href));

    ContentProcessor.process(options)
        .then(() => {
            LOG.debug(util.format('[COMPLETED] [%s] [%s] [%s] [%s] Offer content processing finished', options.language, options.site, options.origin_href, options.href));
            return done();
        })
        .catch(err => {
            LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Offer content processing failed', options.language, options.site, options.origin_href, options.href, err));
            return done();
        });
};

const stopProcessData = (job, done) => {
    var data = job.data;

    DataProcessor.stopProcess(data)
        .then(() => {
            LOG.debug(util.format('[COMPLETED] [%s] [%s] [%s] [%s] Offer content processing stopped', data.language, data.site, data.origin_href, data.href));
            return done();
        })
        .catch(err => {
            LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Offer content processing not stopped', data.language, data.site, data.origin_href, data.href, err));
            return done();
        });
};

const processData = (job, done) => {
    let data = job.data;

    DataProcessor.process(data)
        .then(() => {
            LOG.debug(util.format('[COMPLETED] [%s] [%s] [%s] [%s] Offer data processing finished', data.language, data.site, data.origin_href, data.href));
            return done();
        })
        .catch(err => {
            LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Offer data processing failed', data.language, data.site, data.origin_href, data.href, err));
            return done();
        });
};

const harvestPictures = (job, done) => {
    let data = job.data;

    data.process_pictures = true;

    DataProcessor.process(data)
        .then(() => {
            LOG.debug(util.format('[COMPLETED] [%s] [%s] [%s] [%s] Offer pictures harvesting requested', data.language, data.site, data.origin_href, data.href));
            return done();
        })
        .catch(err => {
            LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Offer pictures harvesting failed', data.language, data.site, data.origin_href, data.href, err));
            return done();
        });
};

const processCategories = (job, done) => {
    let data = job.data;

    CategoryProcessor.process(data)
        .then(() => {
            LOG.debug(util.format('[COMPLETED] [%s] [%s] [%s] [%s] Offer categories processing finished', data.language, data.site, data.origin_href, data.href));
            return done();
        })
        .catch(err => {
            LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Offer categories processing failed', data.language, data.site, data.origin_href, data.href, err));
            return done();
        });
};

const processIndexing = (job, done) => {
    var data = job.data;

    data.process_index = true;

    ElasticIndexer.indexOffer(data)
        .then(() => {
            LOG.debug(util.format('[COMPLETED] [%s] [%s] [%s] [%s] Offer index processing finished', data.language, data.site, data.origin_href, data.href));
            return done();
        })
        .catch(err => {
            LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Offer index processing failed', data.language, data.site, data.origin_href, data.href, err));
            return done();
        });
};

const processImage = (job, done) => {
    var data = job.data;

    ImageProcessor.process(data)
        .then(() => {
            LOG.debug(util.format('[COMPLETED] [%s] [%s] [%s] [%s] Offer pictures harvesting requested', data.language, data.site, data.origin_href, data.href));
            return done();
        })
        .catch(err => {
            LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Offer pictures harvesting failed', data.language, data.site, data.origin_href, data.href, err));
            return done();
        });
};