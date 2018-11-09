var async = require('async');
var _ = require('lodash');
var util = require("util");

import Crawler from "./Crawler";
import WorkerService from "./WorkerService";

var LOG = require("../../lib/services/Logger");
var ParserFactory = require("../../lib/services/ParserFactory");
var SessionFactory = require("../../lib/services/SessionFactory");


class IndexPageHarvester {

    public processIndexPage = (options, processIndexPageFinished) => {
        LOG.info(util.format('[STATUS] [OK] [%s] [%s] Fetching index page', options.site, options.href));

        var parser = ParserFactory.getParser(options.site);

        if (parser.config.payload) {
            options.payload = parser.config.payload.replace(/{search_criteria}/g, options.search);
        }

        var crawler = new Crawler();
        crawler.request({
            url: options.href,
            json: parser.config.json,
            headers: parser.config.headers,
            payload: options.payload,
            onError: (err) => {
                LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Fetching index page failed', options.site, options.href, err));
                return processIndexPageFinished(err);
            },
            onSuccess: (content) => {
                if (parser.config.paging) {
                    this._processPaginatedIndexes(options, content, processIndexPageFinished);
                } else {
                    this._processSimpleIndexes(options, content, processIndexPageFinished);
                }
            }
        });
    };

    private _processPaginatedIndexes = (options, content, processPaginatedIndexesFinished) => {
        var parser = ParserFactory.getParser(options.site);
        var pagingParams = parser.getPagingParameters(content, options);

        content = null;

        LOG.info(util.format('[STATUS] [OK] [%s] Paging found', options.site));

        var paginatedIndexesHandlers = [];

        if (!parser.config.payload) {
            paginatedIndexesHandlers = _.map(pagingParams.pages, (href, index) => {
                return (paginatedIndexHandlerFinished) => WorkerService.schedulePageProcessing({
                    'site': options.site,
                    'href': href,
                    'pageIndex': index + 1,
                    'totalPages': pagingParams.pages.length
                }, paginatedIndexHandlerFinished);
            });
        } else {
            paginatedIndexesHandlers = _.map(pagingParams.payloads, (payload, index) => {
                return (paginatedIndexHandlerFinished) => WorkerService.schedulePageProcessing({
                    'site': options.site,
                    'href': payload.href,
                    'payload': payload.payload,
                    'pageIndex': index + 1,
                    'totalPages': pagingParams.payloads.length
                }, paginatedIndexHandlerFinished);
            });
        }

        async.series(paginatedIndexesHandlers, function (err, results) {
            if (err) {
                LOG.error(util.format('[STATUS] [Failure] [%s] Pages processing not scheduled', options.site, err));
                return processPaginatedIndexesFinished(err);
            }

            LOG.info(util.format('[STATUS] [OK] [%s] Pages processing scheduled', options.site));
            return processPaginatedIndexesFinished(null, results);
        });
    };

    private _processSimpleIndexes = function (config, content, processSimpleIndexesFinished) {
        LOG.info(util.format('[STATUS] [OK] [%s] No paging found', config.site));
        LOG.info(util.format('[STATUS] [OK] [%s] Processing offers', config.site));

        return processSimpleIndexesFinished(null, content);
    };
}

export default new IndexPageHarvester();