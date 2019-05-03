const _ = require('lodash');
const util = require("util");

import Crawler from "./Crawler";
import WorkerService from "./WorkerService";
import PagingSimple from "./PagingSimple";

import LOG from "../../lib/services/Logger";
import ParserFactory from '../../lib/services/ParserFactory';


class IndexPageHarvester {

    public processFirstPage = (options, callback) => {
        const parser = ParserFactory.getParser(options.site);

        options.language = parser.getMainLanguage();

        if (parser.config.hierarchy) {
            options.hierarchy = 1;
        }

        if (parser.config.has_index_page) {
            this._processSiteWithIndexPage(options, callback);
        } else {
            this._processSiteWithoutIndexPage(options, callback);
        }
    };

    private _processSiteWithIndexPage(options, callback) {
        const parser = ParserFactory.getParser(options.site);

        options.href = parser.config.index_page;

        this.harvestIndexPage(options, (err, offers) => {
            if (err) {
                LOG.error(util.format('[ERROR] [%s] Site index page harvesting failed', options.site, err));
                return callback(err);
            }

            LOG.info(util.format('[OK] [%s] Site index page harvesting finished', options.site));
            return callback(null, offers);
        });
    }

    private _processSiteWithoutIndexPage(options, callback) {
        const parser = ParserFactory.getParser(options.site);

        const href = parser.compileNextPageHref();

        LOG.info(util.format('[OK] [%s] [%s] Fetching first page', options.site, href));

        if (!parser.config.paging) {
            LOG.info(util.format('[OK] [%s] No paging found', options.site));
            return callback();
        }

        let config = {
            'site': options.site,
            'href': href,
            'page_index': 1
        } as any;

        if (!parser.config.paging.finite) {
            config.infinite_pagination = true;
        }

        WorkerService.schedulePageProcessing(config, 1000)
            .then(() => {
                LOG.info(util.format('[OK] [%s] [%s] Next infinite pagination page harvesting scheduled', options.site, href));
                return callback();
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] [%s] Next infinite pagination page harvesting not scheduled', options.site, href, err));
                return callback(err);
            });
    }

    public harvestIndexPage = (options, callback) => {
        LOG.info(util.format('[OK] [%s] [%s] Fetching index page', options.site, options.href));

        const parser = ParserFactory.getParser(options.site);

        if (parser.config.payload) {
            options.payload = parser.config.payload;
        }

        const crawler = new Crawler();
        crawler.request({
            url: options.href,
            json: parser.config.json,
            headers: parser.config.headers,
            payload: options.payload,
            onError: (err) => {
                LOG.error(util.format('[ERROR] [%s] [%s] Fetching index page failed', options.site, options.href, err));
                return callback();
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

    private _processHierarchicalIndexPage = (options, content, callback) => {
        const parser = ParserFactory.getParser(options.site);
        const hierarchicalIndexPages = parser.getHierarchicalIndexPages(options, content);

        if (hierarchicalIndexPages.length) {
            this._processHierarchicalPageWithCategories(options, hierarchicalIndexPages, callback);
        } else {
            this._processHierarchicalPageWithOffers(options, callback);
        }
    };

    private _processHierarchicalPageWithCategories(options, hrefs, callback) {
        const parser = ParserFactory.getParser(options.site);

        LOG.info(util.format('[OK] [%s] [%s] Next hiearchical page reached. Process as index page.', options.site, options.href));

        const nextHierarchyLevel = options.hierarchy + 1;

        const categorizedIndexesHandlers = _.map(hrefs, href => {
            const config = {
                'site': options.site,
                'href': href
            } as any;

            if (!_.isUndefined(parser.config.hierarchy['level-' + nextHierarchyLevel]) || parser.config.hierarchy!!.pattern) {
                config.hierarchy = nextHierarchyLevel;
            }

            return WorkerService.scheduleIndexPageProcessing(config)
                .then(() => {
                    LOG.info(util.format('[OK] [%s] [%s] Next hiearchical page harvesting scheduled', options.site, href));
                })
                .catch(err => {
                    LOG.error(util.format('[ERROR] [%s] [%s] Next hiearchical page harvesting not scheduled', options.site, href, err));
                });
        });

        Promise.all(categorizedIndexesHandlers)
            .then(() => {
                LOG.info(util.format('[OK] [%s] Pages processing scheduled', options.site));
                return callback();
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] Pages processing not scheduled', options.site, err));
                return callback(err);
            });
    }

    private _processHierarchicalPageWithOffers(options, callback) {
        LOG.info(util.format('[OK] [%s] [%s] Lowest hiearchical page reached. Process as index page.', options.site, options.href));

        WorkerService.scheduleIndexPageProcessing({
                'site': options.site,
                'href': options.href
            })
            .then(() => {
                LOG.info(util.format('[OK] [%s] [%s] Lowest hiearchical page harvesting scheduled', options.site, options.href));
                return callback();
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] [%s] Lowest hiearchical page harvesting not scheduled', options.site, options.href, err));
                return callback(err);
            });
    }

    private _startPaginatedIndexPageProcessing = (options, content, callback) => {
        const parser = ParserFactory.getParser(options.site);

        LOG.info(util.format('[OK] [%s] Paging found', options.site));

        if (parser.config.paging.finite) {
            this._processFinitePaginationIndexPage(options, content, callback);
        } else {
            this._processInfinitePaginationIndexPage(options, callback);
        }
    };

    private _processFinitePaginationIndexPage(options, content, callback): any {
        const parser = ParserFactory.getParser(options.site);
        const pagingParams = parser.compilePagingParameters(content, options);

        LOG.info(util.format('[OK] [%s] Next finite pagination page processing started', options.site));

        let paginatedIndexesHandlers = [];

        if (parser.config.payload) {
            paginatedIndexesHandlers = _.map(pagingParams.payloads, (payload, index) => {
                return WorkerService.schedulePageProcessing({
                        'site': options.site,
                        'href': payload.href,
                        'payload': payload.payload,
                        'page_index': index + 1,
                        'total_pages': pagingParams.payloads.length
                    }, 1000)
                    .then(() => {
                        LOG.info(util.format('[OK] [%s] [%s] Next finite pagination page harvesting scheduled', options.site, payload.href));
                    })
                    .catch(err => {
                        LOG.error(util.format('[ERROR] [%s] [%s] Next finite pagination page harvesting not scheduled', options.site, payload.href, err));
                    });
            });
        } else {
            paginatedIndexesHandlers = _.map(pagingParams.pages, (href, index) => {
                return WorkerService.schedulePageProcessing({
                        'site': options.site,
                        'href': href,
                        'page_index': index + 1,
                        'total_pages': pagingParams.pages.length
                    }, 1000)
                    .then(() => {
                        LOG.info(util.format('[OK] [%s] [%s] Next finite pagination page harvesting scheduled', options.site, href));
                    })
                    .catch(err => {
                        LOG.error(util.format('[ERROR] [%s] [%s] Next finite pagination page harvesting not scheduled', options.site, href, err));
                    });
            });
        }

        Promise.all(paginatedIndexesHandlers)
            .then(() => {
                LOG.info(util.format('[OK] [%s] Pages processing scheduled', options.site));
                return callback();
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] Pages processing not scheduled', options.site, err));
                return callback(err);
            })
    };

    private _processInfinitePaginationIndexPage(options: any, callback: any): any {
        const parser = ParserFactory.getParser(options.site);
        const href = parser.compileNextPageHref();

        LOG.info(util.format('[OK] [%s] [%s] Next infinite pagination page processing started', options.site, href));

        WorkerService.schedulePageProcessing({
                'site': options.site,
                'href': href,
                'page_index': 1,
                'infinite_pagination': true
            }, 1000)
            .then(() => {
                LOG.info(util.format('[OK] [%s] [%s] Next infinite pagination page harvesting scheduled', options.site, href));
                return callback();
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] [%s] Next infinite pagination page harvesting not scheduled', options.site, href, err));
                return callback(err);
            });
    };

    private _startSimpleIndexPageProcessing = function (options, content, callback) {
        LOG.info(util.format('[OK] [%s] [%s] Simple page without paging processing started', options.site, options.href));

        PagingSimple.processPage(content, options)
            .then(() => {
                LOG.info(util.format('[OK] [%s] Offers processing scheduled', options.site));
                return callback();
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] Offers processing not scheduled', options.site, err));
                return callback(err);
            });
    };
}

export default new IndexPageHarvester();