const _ = require('lodash');
const Promise = require('promise');
const util = require("util");

import ImageHarvester from "./ImageHarvester";
import IndexPageHarvester from "./IndexPageHarvester";
import OfferHarvester from "./OfferHarvester";
import PagingHarvester from "./PagingHarvester";

import LOG from "../../lib/services/Logger";
import SessionFactory from '../../lib/services/SessionFactory';


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
  public cleanupSite = (options): Promise<void> => {
    if (!options.should_cleanup) {
      LOG.info(util.format('[OK] [%s] Site cleanup skipped', options.site));

      return Promise.resolve();
    }

    LOG.info(util.format('[OK] [%s] Site cleanup started', options.site));

    let promises = [
      this._clearDatabase(options),
      this._clearIndex(options)
    ];

    return Promise.all(promises)
      .then(() => {
          LOG.info(util.format('[OK] [%s] Site clean-up finished', options.site));
      })
      .catch(err => {
          LOG.error(util.format('[ERROR] [%s] Site clean-up failed', options.site, err));
      });
  };

  private _clearDatabase(options): Promise<void> {
    LOG.info(util.format('[OK] [%s] Database clean-up started', options.site));

    try {
      this._db.offers.remove({
        'site': options.site
      });

      LOG.info(util.format('[OK] [%s] Database clean-up finished', options.site));
      return Promise.resolve();
    } 
    catch (err) {
      LOG.error(util.format('[ERROR] [%s] Database clean-up failed', options.site, err));
      return Promise.reject();
    }
  }

  private _clearIndex(options): Promise<void> {
    LOG.info(util.format('[OK] [%s] Indexes clean-up started', options.site));

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
          LOG.error(util.format('[ERROR] [%s] [%s] Index clean-up failed', options.site, index, err));
        });
    });

    return Promise.all(promises)
      .then(() => {
        LOG.info(util.format('[OK] [%s] Indexes clean-up finished', options.site));
      })
      .catch(err => {
        LOG.error(util.format('[ERROR] [%s] Indexes clean-up failed', options.site, err));
      });
  }

  /*
   *
   */
  public harvestSite = (options) => {
    LOG.info(util.format('[OK] [%s] Site processing started', options.site));

    return IndexPageHarvester.processFirstPage(options)
      .then(() => {
        LOG.info(util.format('[OK] [%s] Processing first page finished', options.site));
      })
      .catch(err => {
        LOG.error(util.format('[ERROR] [%s] First page processing failed', options.site, err));
      });
  };

  /*
   *
   */
  public harvestIndexPage = (options) => {
    LOG.info(util.format('[OK] [%s] [%s] Index page processing started', options.site, options.href));

    return IndexPageHarvester.harvestIndexPage(options)
      .then(() => {
        LOG.info(util.format('[OK] [%s] Index page processing finished', options.site));
      })
      .catch(err => {
        LOG.error(util.format('[ERROR] [%s] Index page processing failed', options.site, err));
      });
  };

  /*
   *
   */
  public harvestPage = (options) => {
    LOG.info(util.format('[OK] [%s] Page harvesting %s of %s started', options.site, options.page_index, options.total_pages));

    return PagingHarvester.harvestPage(options)
      .then(() => {
        LOG.info(util.format('[OK] [%s] Page harvesting %s of %s finished', options.site, options.page_index, options.total_pages));
      })
      .catch(err => {
        LOG.error(util.format('[ERROR] [%s] Page harvesting %s of %s failed', options.site, options.page_index, options.total_pages, err));
      });
  };

  /*
   *
   */
  public harvestOffer = (options) => {
    LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer page harvesting started', options.language, options.site, options.origin_href, options.href));

    return OfferHarvester.harvestOffer(options)
      .then(() => {
        LOG.info(util.format('[OK] [%s] [%s] [%s] [%s] Offer page harvesting finished', options.language, options.site, options.origin_href, options.href));
      })
      .catch(err => {
        LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Offer page harvesting failed', options.language, options.site, options.origin_href, options.href, err));
      });
  };

  /*
   *
   */
  public harvestPicture = (options) => {
    LOG.info(util.format('[OK] [%s] [%s] [%s] Image harvesting started', options.site, options.origin_href, options.picture_href));

    return ImageHarvester.harvestImage(options)
      .then(() => {
        LOG.info(util.format('[OK] [%s] [%s] [%s] Image harvesting finished', options.site, options.origin_href, options.picture_href));
      })
      .catch(err => {
        LOG.error(util.format('[ERROR] [%s] [%s] [%s] Image harvesting failed', options.site, options.origin_href, options.picture_href, err));
      });
  };
}

export default new Harvester();