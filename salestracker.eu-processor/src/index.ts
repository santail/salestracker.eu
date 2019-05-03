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
            .then(function () {
                LOG.info(util.format('[OK] Initializing indexes succeeded'));
                
                worker.process('processContent', 10, function (job, done) {
                    const data = job.data;

                    ContentProcessor.process(data, done);
                });

                worker.process('stopProcessData', 10, function (job, done) {
                    var data = job.data;

                    data.process_pictures = true;
                    data.process_categories = true;
                    data.process_index = true;

                    DataProcessor.stopProcess(data, done);
                });

                worker.process('processData', 10, function (job, done) {
                    let data = job.data;

                    DataProcessor.process(data, done);
                });

                worker.process('requestPicturesHarvesting', 10, function (job, done) {
                    let data = job.data;

                    data.process_pictures = true;

                    DataProcessor.process(data, done);
                });

                worker.process('processCategories', 10, function (job, done) {
                    let data = job.data;

                    CategoryProcessor.process(data, done);
                });

                worker.process('processIndexing', 10, function (job, done) {
                    var data = job.data;

                    data.process_index = true;

                    ElasticIndexer.indexOffer(data, done);
                });
                
                worker.process('processImage', 10, function (job, done) {
                    var data = job.data;

                    ImageProcessor.process(data, done);
                });
            })
            .catch(function (err) {
                LOG.error(util.format('[ERROR] Initializing indexes failed', err));
            });
    }
});