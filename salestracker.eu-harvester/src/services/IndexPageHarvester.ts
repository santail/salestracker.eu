var async = require('async');
var _ = require('lodash');
var util = require("util");

import Crawler from "./Crawler";
import WorkerService from "./WorkerService";

var LOG = require("../../lib/services/Logger");
var ParserFactory = require("../../lib/services/ParserFactory");


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
                if (options.hierarchy) { // if this is initial index page containing first level of hierarchical catalog links
                    this._processHierarchicalIndexes(options, content, processIndexPageFinished);
                } else if (parser.config.paging) {
                    this._processPaginatedIndexes(options, content, processIndexPageFinished);
                } else {
                    this._processSimpleIndexes(options, content, processIndexPageFinished);
                }
            }
        });
    };

    private _processHierarchicalIndexes = (options, content, processPaginatedIndexesFinished) => {
        var parser = ParserFactory.getParser(options.site);

        var hierarchicalIndexPages = parser.getHierarchicalIndexPages(options, content);

        if (!hierarchicalIndexPages.length) {
            WorkerService.scheduleIndexPageProcessing({
                'site': options.site,
                'href': options.href
            }, processPaginatedIndexesFinished);
        } 
        else {
            var nextHierarchyLevel = options.hierarchy + 1;

            var categorizedIndexesHandlers = _.map(hierarchicalIndexPages, (href) => {
                var config = {
                    'site': options.site,
                    'href': href
                } as any;

                if (!_.isUndefined(parser.config.hierarchy['level-' + nextHierarchyLevel]) || parser.config.hierarchy!!.pattern) {
                    config.hierarchy = nextHierarchyLevel;
                }

                return (categorizedIndexHandlerFinished) => WorkerService.scheduleIndexPageProcessing(config, categorizedIndexHandlerFinished);
            });

            async.series(categorizedIndexesHandlers, function (err, results) {
                if (err) {
                    LOG.error(util.format('[STATUS] [Failure] [%s] Pages processing not scheduled', options.site, err));
                    return processPaginatedIndexesFinished(err);
                }

                LOG.info(util.format('[STATUS] [OK] [%s] Pages processing scheduled', options.site));
                return processPaginatedIndexesFinished(null, results);
            });
        }
    }

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

    private _processSimpleIndexes = function (options, content, processSimpleIndexesFinished) {
        LOG.info(util.format('[STATUS] [OK] [%s] No paging found', options.site));
        LOG.info(util.format('[STATUS] [OK] [%s] Processing offers', options.site));

        return processSimpleIndexesFinished(null, content);
    };
}

export default new IndexPageHarvester();