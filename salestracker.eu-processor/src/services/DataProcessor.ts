var _ = require('lodash');
var path = require('path');
var slugify = require('slugify');
var util = require('util');
import { URL } from 'url';

var LOG = require("../../lib/services/Logger");
var parserFactory = require("../../lib/services/ParserFactory");
var SessionFactory = require('../../lib/services/SessionFactory');

import ElasticIndexer from './ElasticIndexer';
import WorkerService from './WorkerService';


// should not process pictures if development environment and switched off

class DataProcessor {

    process = (data, done): any => {
        var parser = parserFactory.getParser(data.site);

        done();
    }

}

export default new DataProcessor();