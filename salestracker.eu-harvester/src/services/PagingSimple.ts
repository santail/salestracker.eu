let _ = require('lodash');
let util = require("util");

import WorkerService from "./WorkerService";

let LOG = require("../../lib/services/Logger");
let parserFactory = require("../../lib/services/ParserFactory");

class PagingSimple {

    processPage(content, options) {
        let parser = parserFactory.getParser(options.site);

        LOG.info(util.format('[OK] [%s] [%s] Processing simple page. Getting offers hrefs.', options.site, options.href));

        let offers = parser.getOffers(content);

        LOG.info(util.format('[OK] [%s] [%s] Processing simple page. $d offers found.', options.site, options.href, offers.length));

        let offersHandlers = _.map(offers, offer => {
            offer = _.extend(offer, {
                'site': options.site,
                'language': parser.getMainLanguage(),
                'origin_href': offer.href
            });

            return WorkerService.scheduleOfferHarvesting(offer)
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
        let parser = parserFactory.getParser(options.site);

        let href = parser.compileNextPageHref(options.page_index);

        LOG.info(util.format('[OK] [%s] [%s] Proccessing next infinite paging page', options.site, href));

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