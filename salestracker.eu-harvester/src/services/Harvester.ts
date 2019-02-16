var _ = require('lodash');
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
  private _elastic: any;

  constructor() {
    this._db = SessionFactory.getDbConnection();
    this._elastic = SessionFactory.getElasticsearchConnection();
  }

  /*
   *
   */
  public cleanupSite = (options) => {
    if (!options.should_cleanup) {
      return Promise.resolve();
    }

    LOG.info(util.format('[OK] [%s] Cleanup started', options.site));

    let promises = [
      this._clearDatabase(options),
      this._clearIndex(options)
    ];

    return Promise.all(promises);
  };

  private _clearDatabase(options) {
    try {
      this._db.offers.remove({
        'site': options.site
      });

      LOG.info(util.format('[OK] [%s] Database clean-up finished', options.site));
      return Promise.resolve();
    } catch (err) {
      LOG.error(util.format('[ERROR] [%s] Database clean-up failed', options.site), err);
      return Promise.reject();
    }
  }

  private _clearIndex(options) {
    let promises = _.map(['est', 'eng', 'rus'], language => {
      LOG.info(util.format('[OK] [%s] [%s] Clearing index', options.site, language));

      const index = 'salestracker-' + language;

      return this._elastic.deleteByQuery({
        index: index,
        type: 'offers',
        body: {
          query: {
            term: { site: options.site }
          }
        }
      })
        .then(() => {
          LOG.info(util.format('[OK] [%s] [%s] Index clean-up finished', options.site, index));
        })
        .catch(err => {
          LOG.error(util.format('[ERROR] [%s] [%s] Index clean-up failed', options.site, index), err);
        });
    });

    return Promise.all(promises);
  }

  /*
   *
   */
  public harvestSite = (options) => {
    LOG.info(util.format('[OK] [%s] Site processing started', options.site));

    return new Promise((fulfill, reject) => {
      IndexPageHarvester.processFirstPage(options, (err, offers) => {
        if (err) {
          LOG.error(util.format('[ERROR] [%s] First page processing failed', options.site, err));
          return reject(err);
        }

        LOG.info(util.format('[OK] [%s] Processing first page finished', options.site));
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
    LOG.info(util.format('[OK] [%s] Page harvesting %s of %s started', options.site, options.page_index, options.total_pages));

    return PagingHarvester.harvestPage(options, callback);
  };

  /*
   *
   */
  public harvestOffer = (options, callback) => {
    LOG.info(util.format('[OK] [%s] [%s] Offer page harvesting started', options.site, options.href));

    return OfferHarvester.harvestOffer(options, callback);
  };

  /*
   *
   */
  public harvestPicture = (options) => {
    LOG.info(util.format('[OK] [%s] [%s] [%s] Image harvesting started', options.site, options.origin_href, options.picture_href));

    return ImageHarvester.harvestImage(options);
  };

};

export default new Harvester();