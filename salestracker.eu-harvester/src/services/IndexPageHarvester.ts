var async = require('async');
var _ = require('lodash');
var util = require("util");

import Crawler from "./Crawler";
import WorkerService from "./WorkerService";

var LOG = require("../../lib/services/Logger");
var ParserFactory = require("../../lib/services/ParserFactory");


class IndexPageHarvester {

    public processFirstPage = (options, callback) => {
        var parser = ParserFactory.getParser(options.site);
        var indexPage = parser.config.index_page;

        options.language = parser.getMainLanguage();
        
        if (parser.config.hierarchy) {
            options.hierarchy = 1;
        }

        if (parser.config.has_index_page) {
            options.href = indexPage.replace(/{search_criteria}/g, options.search); // TODO add default paging parameters

            this.harvestIndexPage(options, (err, offers) => {
                if (err) {
                    LOG.error(util.format('[ERROR] [%s] Gathering offers failed', options.site, err));
                    return callback(err);
                }

                LOG.info(util.format('[OK] [%s] Gathering offers finished', options.site));
                return callback(null, offers);
            });
        } 
        else {
            options.href = parser.compileNextPageHref(); // TODO add default paging parameters

            this._processNextPage(options, (err, offers) => {
                if (err) {
                    LOG.error(util.format('[ERROR] [%s] Gathering offers failed', options.site, err));
                    return callback(err);
                }

                LOG.info(util.format('[OK] [%s] Gathering offers finished', options.site));
                return callback(null, offers);
            });
        }
    };

    public harvestIndexPage = (options, callback) => {
        LOG.info(util.format('[OK] [%s] [%s] Fetching index page', options.site, options.href));

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
                LOG.error(util.format('[ERROR] [%s] [%s] Fetching index page failed', options.site, options.href, err));
                return callback(err);
            },
            onSuccess: (content) => {
                if (options.hierarchy) { // if this is initial index page containing first level of hierarchical catalog links
                    this._processHierarchicalIndexPage(options, content, callback);
                } else if (parser.config.paging) {
                    this._startPaginatedIndexPageProcessing(options, content, callback);
                } else {
                    this._startSimpleIndexPageProcessing(options, content, callback);
                }
            }
        });
    };

    public _processNextPage = (options, callback) => {
        LOG.info(util.format('[OK] [%s] [%s] Fetching next page', options.site, options.href));

        var parser = ParserFactory.getParser(options.site);

        if (parser.config.paging) {
            if (parser.config.paging.finit) {
                WorkerService.schedulePageProcessing({
                    'site': options.site,
                    'href': parser.compileNextPageHref(),
                    'page_index': 1
                }, callback);
            } 
            else {
                WorkerService.schedulePageProcessing({
                    'site': options.site,
                    'href': parser.compileNextPageHref(),
                    'page_index': 1,
                    'infinite_pagination': true
                }, callback);
            }
        } 
        else {
            LOG.info(util.format('[OK] [%s] No paging found', options.site));

            return callback();
        }
    };

    private _processHierarchicalIndexPage = (options, content, callback) => {
        var parser = ParserFactory.getParser(options.site);
        var hierarchicalIndexPages = parser.getHierarchicalIndexPages(options, content);

        if (hierarchicalIndexPages.length) {
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
                    LOG.error(util.format('[ERROR] [%s] Pages processing not scheduled', options.site, err));
                    return callback(err);
                }

                LOG.info(util.format('[OK] [%s] Pages processing scheduled', options.site));
                return callback(null, results);
            });
        } 
        else {
            WorkerService.scheduleIndexPageProcessing({
                'site': options.site,
                'href': options.href
            }, callback);
        }
    }

    private _startPaginatedIndexPageProcessing = (options, content, callback) => {
        var parser = ParserFactory.getParser(options.site);

        LOG.info(util.format('[OK] [%s] Paging found', options.site));

        if (parser.config.paging.finit) {
            this._processFinitePagination(options, content, callback);
        } else {
            this._processInfinitePagination(options, callback);
        }

        content = null;
    };

    private _processFinitePagination(options, content, callback): any {
        var parser = ParserFactory.getParser(options.site);
        var pagingParams = parser.compilePagingParameters(content, options);

        var paginatedIndexesHandlers = [];

        if (parser.config.payload) {
            paginatedIndexesHandlers = _.map(pagingParams.payloads, (payload, index) => {
                return (paginatedIndexHandlerFinished) => WorkerService.schedulePageProcessing({
                    'site': options.site,
                    'href': payload.href,
                    'payload': payload.payload,
                    'page_index': index + 1,
                    'total_pages': pagingParams.payloads.length
                }, paginatedIndexHandlerFinished);
            });
        } 
        else {
            paginatedIndexesHandlers = _.map(pagingParams.pages, (href, index) => {
                return (paginatedIndexHandlerFinished) => WorkerService.schedulePageProcessing({
                    'site': options.site,
                    'href': href,
                    'page_index': index + 1,
                    'total_pages': pagingParams.pages.length
                }, paginatedIndexHandlerFinished);
            });
        }

        async.series(paginatedIndexesHandlers, function (err, results) {
            if (err) {
                LOG.error(util.format('[ERROR] [%s] Pages processing not scheduled', options.site, err));
                return callback(err);
            }

            LOG.info(util.format('[OK] [%s] Pages processing scheduled', options.site));
            return callback(null, results);
        });
    };

    private _processInfinitePagination(options: any, callback: any): any {
        var parser = ParserFactory.getParser(options.site);
        var href = parser.compileNextPageHref();

        LOG.info(util.format('[OK] [%s] Next page processing scheduled', options.site));

        WorkerService.schedulePageProcessing({
            'site': options.site,
            'href': href,
            'page_index': 1,
            'infinite_pagination': true
        }, callback);
    };

    private _startSimpleIndexPageProcessing = function (options, content, processSimpleIndexesFinished) {
        LOG.info(util.format('[OK] [%s] No paging found', options.site));
        LOG.info(util.format('[OK] [%s] Processing offers', options.site));

        return processSimpleIndexesFinished(null, content);
    };
}

export default new IndexPageHarvester();