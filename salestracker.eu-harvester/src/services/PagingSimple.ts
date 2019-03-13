const _ = require('lodash');
const util = require("util");

import LOG from "../../lib/services/Logger";
import ParserFactory from '../../lib/services/ParserFactory';

import WorkerService from "./WorkerService";


class PagingSimple {

    processPage(content, options) {
        let parser = ParserFactory.getParser(options.site);

        LOG.info(util.format('[OK] [%s] [%s] [%s] Processing simple paging page. Getting offers hrefs.', options.language, options.site, options.href));

        let offers = parser.getOffers(content);

        LOG.info(util.format('[OK] [%s] [%s] [%s] Processing simple paging page. %d offers found.', options.language, options.site, options.href, offers.length));

        let offersHandlers = _.map(offers, offer => {
            offer = _.extend(offer, {
                'site': options.site,
                'language': parser.getMainLanguage(),
                'origin_href': offer.href
            } as any);

            return WorkerService.scheduleOfferHarvesting(offer)
                .then(() => {
                    LOG.info(util.format('[OK] [%s] [%s] [%s] Offer harvesting scheduled', options.language, options.site, offer.href));
                })
                .catch(err => {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] Offer harvesting not scheduled', options.language, options.site, offer.href, err));
                });
        });

        if (options.infinite_pagination) {
            if (process.env.NODE_ENV === 'development' && process.env.PAGING_PAGES_LIMIT && parseInt(process.env.PAGING_PAGES_LIMIT, 10) === options.page_index) {
                LOG.info(util.format('[OK] [DEVELOPMENT] [%s] Last infinite paging page found. Stop processing.', options.site));
            } else if (_.isEmpty(offers) || _.last(offers).href === options.last_processed_offer) {
                LOG.info(util.format('[OK] [%s] [%s] Last infinite paging page found. Stop processing.', options.language, options.site));
            }
            else {
                offersHandlers.push(this._proceedWithNextInfinitePage(offers, options));
            }
        }

        return Promise.all(offersHandlers);
    }

    private _proceedWithNextInfinitePage(offers, options) {
        let parser = ParserFactory.getParser(options.site);

        let href = parser.compileNextPageHref(options.page_index);

        LOG.info(util.format('[OK] [%s] [%s] Proccessing next infinite paging page', options.site, href));

        return WorkerService.schedulePageProcessing({
                'site': options.site,
                'href': href,
                'page_index': options.page_index + 1,
                'infinite_pagination': true,
                'last_processed_offer': _.last(offers).href
            }, 10000)
            .then(() => {
                LOG.info(util.format('[OK] [%s] [%s] Next infinite pagination page harvesting scheduled', options.site, href));
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] [%s] Next infinite pagination page harvesting not scheduled', options.site, href, err));
            });
    }
}

export default new PagingSimple();