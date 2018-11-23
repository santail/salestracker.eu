var async = require('async');
var _ = require('lodash');
var util = require("util");

import Crawler from "./Crawler";
import WorkerService from "./WorkerService";

var LOG = require("../../lib/services/Logger");
var parserFactory = require("../../lib/services/ParserFactory");


class PagingHarvester {
    public harvestPage = (options, callback) => {
        var parser = parserFactory.getParser(options.site);

        var crawler = new Crawler();
        crawler.request({
          url: options.href,
          json: parser.config.json,
          headers: parser.config.headers,
          payload: options.payload,
          onError: (err) => {
            LOG.error(util.format('[ERROR] [%s] [%s] Fetching page failed', options.site, options.href, err));
            return callback(err);
          },
          onSuccess: (content) => {
            var offers = [];
    
            try {
              offers = parser.getOffers(content);
            } catch (err) {
              content = null;
    
              LOG.error(util.format('[ERROR] [%s] Offers processing not scheduled', options.site, err));
              return callback(new Error('Offers processing not scheduled: ' + err.message));
            }
    
            var offersHandlers = _.map(offers, function (offer) {
              return function (offerHandlerFinished) {
                content = null;
    
                WorkerService.scheduleOfferProcessing(_.extend({
                  'site': options.site,
                  'language': parser.getMainLanguage()
                }, offer), offerHandlerFinished);
              };
            });
    
            async.series(offersHandlers, function (err, results) {
              if (err) {
                LOG.error(util.format('[ERROR] [%s] Offers processing not scheduled', options.site, err));
                return callback(err);
              }
    
              LOG.info(util.format('[OK] [%s] Offers processing scheduled', options.site));
              return callback(null, results);
            });
    
            if (options.infinite_pagination) {
              if (process.env.NODE_ENV === 'development' && process.env.PAGING_PAGES_LIMIT && parseInt(process.env.PAGING_PAGES_LIMIT, 10) === options.page_index) {
                return callback(null);
              }
    
              LOG.info(util.format('[OK] [%s] Proccessing next infinite paging page', options.site));
    
              if (_.isEmpty(offers) || _.last(offers).href === options.last_processed_offer) {
                LOG.info(util.format('[OK] [%s] Last infinite paging page found. Stop processing.', options.site));
                return callback(null);
              }
    
              var href = parser.compileNextPageHref(options.page_index);
    
              LOG.info(util.format('[OK] [%s] Next infinite paging page processing scheduled', options.site));
    
              WorkerService.schedulePageProcessing({
                'site': options.site,
                'href': href,
                'page_index': options.page_index + 1,
                'infinite_pagination': true,
                'last_processed_offer': _.last(offers).href
              }, callback);
            }
          }
        });
    }
}

export default new PagingHarvester();