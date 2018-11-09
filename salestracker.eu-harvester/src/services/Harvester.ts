var _ = require('lodash');
var async = require('async');
var Promise = require('promise');
var util = require("util");

import Crawler from "./Crawler";
import ImageHarvester from "./ImageHarvester";
import IndexPageHarvester from "./IndexPageHarvester";
import OfferPageHarvester from "./OfferPageHarvester";

var LOG = require("../../lib/services/Logger");
var parserFactory = require("../../lib/services/ParserFactory");
var SessionFactory = require("../../lib/services/SessionFactory");


class Harvester {
  private _db: any;

  constructor() {
    this._db = SessionFactory.getDbConnection();
  }

  /*
   *
   */
  public cleanupSite = (options) => {
    if (!options.shouldCleanup) {
      return Promise.resolve();
    }

    LOG.info(util.format('[STATUS] [OK] [%s] Cleanup started', options.site));

    return new Promise((fulfill, reject) => {
      this._db.offers.remove({
        'site': options.site
      }, (err) => {
        if (err) reject(err);
        else {
          if (options.cleanupUploads) {
            ImageHarvester.cleanUploadedImages(options.site); // TODO Wrap to promise
          }

          fulfill()
        };
      });
    });
  };

  /*
   *
   */
  public processSite = (options) => {
    LOG.info(util.format('[STATUS] [OK] [%s] Site processing started', options.site));

    var parser = parserFactory.getParser(options.site),
      indexPage = parser.config.indexPage,
      language = parser.getMainLanguage();

    options = _.extend(options, {
      'href': indexPage.replace(/{search_criteria}/g, options.search), // TODO add default paging parameters
      'language': language
    });

    return new Promise((fulfill, reject) => {
      IndexPageHarvester.processIndexPage(options, (err, offers) => {
        if (err) {
          LOG.error(util.format('[STATUS] [Failure] [%s] Gathering offers failed', options.site, err));
          return reject(err);
        }

        LOG.info(util.format('[STATUS] [OK] [%s] Gathering offers finished', options.site));
        return fulfill(null, offers);
      });
    });
  };

  /*
   *
   */
  public processPage = (options, processPageFinished) => {
    LOG.info(util.format('[STATUS] [OK] [%s] Page processing %s of %s started', options.site, options.pageIndex, options.totalPages));

    var parser = parserFactory.getParser(options.site);

    var crawler = new Crawler();
    crawler.request({
      url: options.href,
      json: parser.config.json,
      headers: parser.config.headers,
      payload: options.payload,
      onError: (err) => {
        LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Fetching page failed', options.site, options.href, err));
        return processPageFinished(err);
      },
      onSuccess: (content) => {
        var offers = [];

        try {
          offers = parser.getOffers(content);
        } catch (err) {
          content = null;

          LOG.error(util.format('[STATUS] [Failure] [%s] Offers processing not scheduled', options.site, err));
          return processPageFinished(new Error('Offers processing not scheduled: ' + err.message));
        }

        var offersHandlers = _.map(offers, function (offer) {
          return function (offerHandlerFinished) {
            content = null;

            var jobConfig = _.extend({
              'site': options.site,
              'language': parser.getMainLanguage()
            }, offer);

            SessionFactory.getQueueConnection().create('processOffer', jobConfig)
              .attempts(3).backoff({
                delay: 60 * 1000,
                type: 'exponential'
              })
              .removeOnComplete(true)
              .save(function (err) {
                if (err) {
                  LOG.error(util.format('[STATUS] [FAILED] [%s] %s Offer processing schedule failed', options.site, offer.href, err));
                  return offerHandlerFinished(err);
                }

                LOG.debug(util.format('[STATUS] [OK] [%s] %s Offer processing scheduled', options.site, offer.href));
                return offerHandlerFinished(null);
              });
          };
        });

        async.series(offersHandlers, function (err, results) {
          if (err) {
            LOG.error(util.format('[STATUS] [Failure] [%s] Offers processing not scheduled', options.site, err));
            return processPageFinished(err);
          }

          LOG.info(util.format('[STATUS] [OK] [%s] Offers processing scheduled', options.site));
          return processPageFinished(null, results);
        });
      }
    });
  };

  /*
   *
   */
  public processOffer = (options, processOfferFinished) => {
    LOG.debug(util.format('[STATUS] [OK] [%s] Offer processing started %s', options.site, options.href));

    return OfferPageHarvester.processOfferPage(options, processOfferFinished);
  };

  /*
   *
   */
  public processImage = (options, processImageFinished) => {
    LOG.debug(util.format('[STATUS] [OK] [%s] Image processing started %s', options.site, options.href));

    return ImageHarvester.processImage(options, processImageFinished);
  };

};

export default new Harvester();