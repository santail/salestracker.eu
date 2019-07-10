const _ = require('lodash');
const util = require("util");

import Crawler from "./Crawler";
import WorkerService from "./WorkerService";
import PagingSimple from "./PagingSimple";

import LOG from "../../lib/services/Logger";
import ParserFactory from '../../lib/services/ParserFactory';


class IndexPageHarvester {

    public processFirstPage = (options) => {
        const parser = ParserFactory.getParser(options.site);

        options.language = parser.getMainLanguage();

        if (parser.config.hierarchy) {
            options.hierarchy = 1;
        }

        LOG.info(util.format('[OK] [%s] [%s] Site first page processing started', options.language, options.site));

        if (parser.config.has_index_page) {
            return this._processSiteWithIndexPage(options);
        } else {
            return this._processSiteWithoutIndexPage(options);
        }
    };

    private _processSiteWithIndexPage(options) {
        const parser = ParserFactory.getParser(options.site);

        options.href = parser.config.index_page;

        LOG.info(util.format('[OK] [%s] [%s] [%s] Site first page containing index processing started', options.language, options.site, options.href));

        return this.harvestIndexPage(options)
            .then(() => {
                LOG.info(util.format('[OK] [%s] [%s] [%s] Site first page containing index processing finished', options.language, options.site, options.href));
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] [%s] [%s] Site first page containing index processing failed', options.language, options.site, options.href, err));
            });
    }

    private _processSiteWithoutIndexPage(options) {
        const parser = ParserFactory.getParser(options.site);

        const href = parser.compileNextPageHref();

        LOG.info(util.format('[OK] [%s] [%s] Fetching first page', options.site, href));

        if (!parser.config.paging) {
            LOG.info(util.format('[OK] [%s] No paging found', options.site));
            return Promise.resolve();
        }

        let config = {
            'site': options.site,
            'href': href,
            'page_index': 1
        } as any;

        if (!parser.config.paging.finite) {
            config.infinite_pagination = true;
        }

        return WorkerService.schedulePageProcessing(config, 1000)
            .then(() => {
                LOG.info(util.format('[OK] [%s] [%s] Next infinite pagination page harvesting scheduled', options.site, href));
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] [%s] Next infinite pagination page harvesting not scheduled', options.site, href, err));
            });
    }

    public harvestIndexPage = (options) => {
        LOG.info(util.format('[OK] [%s] [%s] Fetching index page', options.site, options.href));

        const parser = ParserFactory.getParser(options.site);

        if (parser.config.payload) {
            options.payload = parser.config.payload;
        }

        const crawler = new Crawler();

        return new Promise((resolve, reject) => {
            crawler.request({
                url: options.href,
                json: parser.config.json,
                headers: parser.config.headers,
                payload: options.payload,
                onError: err => {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] Fetching index page failed', options.language, options.site, options.href, err));
                    return reject(err);
                },
                onSuccess: (content) => {
                    if (options.hierarchy) { // if this is initial index page containing first level of hierarchical catalog links
                        return this._processHierarchicalIndexPage(options, content)
                            .then(() => {
                                LOG.info(util.format('[OK] [%s] [%s] [%s] Index page with hierarchy processing finished', options.language, options.site, options.href));
                                return resolve();
                            })
                            .catch(err => {
                                LOG.error(util.format('[ERROR] [%s] [%s] [%s] Index page with hierarchy processing failed', options.language, options.site, options.href, err));
                                return reject();
                            });
                    } else if (parser.config.paging) {
                        return this._startPaginatedIndexPageProcessing(options, content)
                            .then(() => {
                                LOG.info(util.format('[OK] [%s] [%s] [%s] Index page with paging processing finished', options.language, options.site, options.href));
                                return resolve();
                            })
                            .catch(err => {
                                LOG.error(util.format('[ERROR] [%s] [%s] [%s] Index page with paging processing failed', options.language, options.site, options.href, err));
                                return reject();
                            });
                    } else {
                        return this._startSimpleIndexPageProcessing(options, content)
                            .then(() => {
                                LOG.info(util.format('[OK] [%s] [%s] [%s] Index page with no hierarchy and paging processing finished', options.language, options.site, options.href));
                                return resolve();
                            })
                            .catch(err => {
                                LOG.error(util.format('[ERROR] [%s] [%s] [%s] Index page with no hierarchy and paging processing failed', options.language, options.site, options.href, err));
                                return reject();
                            });
                    }
                }
            });
        });
    };

    private _processHierarchicalIndexPage = (options, content) => {
        LOG.info(util.format('[OK] [%s] [%s] Index page with hierarchy processing started', options.site, options.href));

        const parser = ParserFactory.getParser(options.site);
        const hierarchicalIndexPages = parser.getHierarchicalIndexPages(options, content);

        if (hierarchicalIndexPages.length) {
            return this._processHierarchicalPageWithCategories(options, hierarchicalIndexPages);
        } else {
            return this._processHierarchicalPageWithOffers(options);
        }
    };

    private _processHierarchicalPageWithCategories(options, hrefs) {
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

        return Promise.all(categorizedIndexesHandlers)
            .then(() => {
                LOG.info(util.format('[OK] [%s] Hierarhical index pages processing scheduled', options.site));
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] Hierarhical index pages processing not scheduled', options.site, err));
            });
    }

    private _processHierarchicalPageWithOffers(options) {
        LOG.info(util.format('[OK] [%s] [%s] Lowest hiearchical page reached. Process as index page.', options.site, options.href));

        return WorkerService.scheduleIndexPageProcessing({
            'site': options.site,
            'href': options.href
        })
        .then(() => {
            LOG.info(util.format('[OK] [%s] [%s] Lowest hiearchical page harvesting scheduled', options.site, options.href));
        })
        .catch(err => {
            LOG.error(util.format('[ERROR] [%s] [%s] Lowest hiearchical page harvesting not scheduled', options.site, options.href, err));
        });
    }

    private _startPaginatedIndexPageProcessing = (options, content) => {
        const parser = ParserFactory.getParser(options.site);

        LOG.info(util.format('[OK] [%s] Paging found', options.site));

        if (parser.config.paging.finite) {
            return this._processFinitePaginationIndexPage(options, content);
        } else {
            return this._processInfinitePaginationIndexPage(options);
        }
    };

    private _processFinitePaginationIndexPage(options, content): any {
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

        return Promise.all(paginatedIndexesHandlers)
            .then(() => {
                LOG.info(util.format('[OK] [%s] Finite pagination pages processing scheduled', options.site));
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] Finite pagination pages processing not scheduled', options.site, err));
            })
    };

    private _processInfinitePaginationIndexPage(options: any): any {
        const parser = ParserFactory.getParser(options.site);
        const href = parser.compileNextPageHref();

        LOG.info(util.format('[OK] [%s] [%s] Next infinite pagination page processing started', options.site, href));

        return WorkerService.schedulePageProcessing({
            'site': options.site,
            'href': href,
            'page_index': 1,
            'infinite_pagination': true
        }, 1000)
        .then(() => {
            LOG.info(util.format('[OK] [%s] [%s] Next infinite pagination page harvesting scheduled', options.site, href));
        })
        .catch(err => {
            LOG.error(util.format('[ERROR] [%s] [%s] Next infinite pagination page harvesting not scheduled', options.site, href, err));
        });
    };

    private _startSimpleIndexPageProcessing = function (options, content) {
        LOG.info(util.format('[OK] [%s] [%s] Simple page without paging processing started', options.site, options.href));

        return PagingSimple.processPage(content, options)
            .then(() => {
                LOG.info(util.format('[OK] [%s] [%s] Simple page without paging processing finished', options.site, options.href));
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] [%s] Simple page without paging processing failed', options.site, options.href, err));
            });
    };
}

export default new IndexPageHarvester();