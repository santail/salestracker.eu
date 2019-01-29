var _ = require('lodash');
var util = require("util");

import WorkerService from "./WorkerService";

var LOG = require("../../lib/services/Logger");
var parserFactory = require("../../lib/services/ParserFactory");

class PagingSimple {

    processPage(content, options) {
        var parser = parserFactory.getParser(options.site);
        var offers = parser.getOffers(content);

        var offersHandlers = _.map(offers, offer => {
            return WorkerService.scheduleOfferHarvesting(_.extend(offer, {
                'site': options.site,
                'language': parser.getMainLanguage()
            }), 0)
                .then(() => {
                    LOG.info(util.format('[OK] [%s] [%s] Offer harvesting scheduled', options.site, offer.href));
                })
                .catch(err => {
                    LOG.error(util.format('[ERROR] [%s] [%s] Offer harvesting not scheduled', options.site, offer.href), err);
                });
        });

        if (options.infinite_pagination) {
            offersHandlers.push(this._proceedWithNextInfinitePage(offers, options));
        }

        return Promise.all(offersHandlers);
    }

    private _proceedWithNextInfinitePage(offers, options) {
        var parser = parserFactory.getParser(options.site);

        if (process.env.NODE_ENV === 'development' && process.env.PAGING_PAGES_LIMIT && parseInt(process.env.PAGING_PAGES_LIMIT, 10) === options.page_index) {
            LOG.info(util.format('[OK] [%s] Last infinite paging page found. Stop processing.', options.site));
            return Promise.resolve();
        }

        LOG.info(util.format('[OK] [%s] Proccessing next infinite paging page', options.site));

        if (_.isEmpty(offers) || _.last(offers).href === options.last_processed_offer) {
            LOG.info(util.format('[OK] [%s] Last infinite paging page found. Stop processing.', options.site));
            return Promise.resolve();
        }

        var href = parser.compileNextPageHref(options.page_index);

        LOG.info(util.format('[OK] [%s] Next infinite paging page processing scheduled', options.site));

        return WorkerService.schedulePageProcessing({
                'site': options.site,
                'href': href,
                'page_index': options.page_index + 1,
                'infinite_pagination': true,
                'last_processed_offer': _.last(offers).href
            })
            .then(() => {
                LOG.info(util.format('[OK] [%s] [%s] Next infinite pagination page harvesting scheduled', options.site, href));
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] [%s] Next infinite pagination page harvesting not scheduled', options.site, href), err);
            });
    }
}

export default new PagingSimple();