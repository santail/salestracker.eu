var Promise = require('promise');
var util = require("util");

import ImageHarvester from "./ImageHarvester";
import IndexPageHarvester from "./IndexPageHarvester";
import OfferHarvester from "./OfferHarvester";
import PagingHarvester from "./PagingHarvester";

var LOG = require("../../lib/services/Logger");
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
    if (!options.should_cleanup) {
      return Promise.resolve();
    }

    LOG.info(util.format('[OK] [%s] Cleanup started', options.site));

    return new Promise((fulfill, reject) => {
      this._db.offers.remove({
        'site': options.site
      }, (err) => {
        if (err) reject(err);
        else {
          if (options.cleanup_uploads) {
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
  public harvestSite = (options) => {
    LOG.info(util.format('[OK] [%s] Site processing started', options.site));

    return new Promise((fulfill, reject) => {
      IndexPageHarvester.processFirstPage(options, (err, offers) => {
        if (err) {
          LOG.error(util.format('[ERROR] [%s] Gathering offers failed', options.site, err));
          return reject(err);
        }

        LOG.info(util.format('[OK] [%s] Gathering offers finished', options.site));
        return fulfill(offers);
      });
    });
  };

  /*
   *
   */
  public harvestIndexPage = (options, callback) => {
    LOG.info(util.format('[OK] [%s] [%s] Index page processing started', options.site, options.href));

    IndexPageHarvester.harvestIndexPage(options, (err, offers) => {
      if (err) {
        LOG.error(util.format('[ERROR] [%s] Index page processing failed', options.site, err));
        return callback(err);
      }

      LOG.info(util.format('[OK] [%s] Index page processing finished', options.site));
      return callback(null, offers);
    });
  }

  /*
   *
   */
  public harvestPage = (options, callback) => {
    LOG.info(util.format('[OK] [%s] Page processing %s of %s started', options.site, options.page_index, options.total_pages));

    return PagingHarvester.harvestPage(options, callback);
  };

  /*
   *
   */
  public harvestOffer = (options, callback) => {
    LOG.info(util.format('[OK] [%s] Offer processing started %s', options.site, options.href));

    return OfferHarvester.harvestOffer(options, callback);
  };

  /*
   *
   */
  public harvestPicture = (options) => {
    LOG.info(util.format('[OK] [%s] Image processing started %s', options.site, options.href));

    return ImageHarvester.harvestImage(options);
  };

};

export default new Harvester();