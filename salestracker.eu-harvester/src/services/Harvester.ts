var _ = require('lodash');
var async = require('async');
var fs = require('fs-extra');
var mongojs = require('mongojs');
var path = require('path');
var Promise = require('promise');
var request = require('request');
var slugify = require('slugify');
const { URL } = require('url');
var util = require("util");

import Crawler from "./Crawler";

var LOG = require("../../lib/services/Logger");
var parserFactory = require("../../lib/services/ParserFactory");
var SessionFactory = require("../../lib/services/SessionFactory");


class Harvester {
  private _db: any;

  constructor() {
    this._db = SessionFactory.getDbConnection();
  }

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
            this._cleanUploads(options.site); // TODO Wrap to promise
          }
  
          fulfill()
        };
      });
    });
  };

  public processSite = (options) => {
    LOG.info(util.format('[STATUS] [OK] [%s] Site processing started', options.site));
  
    return new Promise((fulfill, reject) => {
      this._gatherOffers(options, (err, offers) => {
        if (err) reject(err);
        else fulfill(offers);
      });
    });
  };

  private _gatherOffers = (options, gatherOffersFinished) => {
    var parser = parserFactory.getParser(options.site),
      indexPage = parser.config.indexPage,
      language = parser.getMainLanguage();
  
    options = _.extend(options, {
      'href': indexPage.replace(/{search_criteria}/g, options.search), // TODO add default paging parameters
      'language': language
    });
  
    this._processIndexPage(options, (err, offers) => {
      if (err) {
        LOG.error(util.format('[STATUS] [Failure] [%s] Gathering offers failed', options.site, err));
        return gatherOffersFinished(err);
      }
  
      LOG.info(util.format('[STATUS] [OK] [%s] Gathering offers finished', options.site));
      return gatherOffersFinished(null, offers);
    });
  };

  private _processIndexPage = (options, processIndexPageFinished) => {
    LOG.info(util.format('[STATUS] [OK] [%s] [%s] Fetching index page', options.site, options.href));
  
    var parser = parserFactory.getParser(options.site);
  
    if (parser.config.payload) {
      options.payload = parser.config.payload.replace(/{search_criteria}/g, options.search);
    }
  
    var crawler = new Crawler();
    crawler.request({
      url: options.href,
      json: parser.config.json,
      headers: parser.config.headers,
      payload: options.payload,
      onError: (err) => {
        LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Fetching index page failed', options.site, options.href, err));
        return processIndexPageFinished(err);
      },
      onSuccess: (content) => {
        if (parser.config.paging) {
          this._processPaginatedIndexes(options, content, processIndexPageFinished);
        } else {
          this._processSimpleIndexes(options, content, processIndexPageFinished);
        }
      }
    });
  };

  private _processPaginatedIndexes = (options, content, processPaginatedIndexesFinished) => {
    var parser = parserFactory.getParser(options.site);
    var pagingParams = parser.getPagingParameters(content, options);
  
    LOG.info(util.format('[STATUS] [OK] [%s] Paging found', options.site));
  
    var paginatedIndexesHandlers = [];
  
    if (!parser.config.payload) {
      paginatedIndexesHandlers = _.map(pagingParams.pages, function (href, index) {
        return function (paginatedIndexHandlerFinished) {
          content = null;
  
          SessionFactory.getQueueConnection().create('processPage', {
              'site': options.site,
              'href': href,
              'pageIndex': index + 1,
              'totalPages': pagingParams.pages.length
            })
            .attempts(3).backoff({
              delay: 60 * 1000,
              type: 'exponential'
            })
            .removeOnComplete(true)
            .save(function (err) {
              if (err) {
                LOG.error(util.format('[STATUS] [FAILED] [%s] %s Page processing schedule failed', options.site, href, err));
                return paginatedIndexHandlerFinished(err);
              }
  
              LOG.debug(util.format('[STATUS] [OK] [%s] %s Page processing scheduled', options.site, href));
              return paginatedIndexHandlerFinished(null);
            });
        };
      });
    } else {
      paginatedIndexesHandlers = _.map(pagingParams.payloads, function (payload, index) {
        return function (paginatedIndexHandlerFinished) {
          content = null;
  
          SessionFactory.getQueueConnection().create('processPage', {
              'site': options.site,
              'href': payload.href,
              'payload': payload.payload,
              'pageIndex': index + 1,
              'totalPages': pagingParams.payloads.length
            })
            .attempts(3).backoff({
              delay: 60 * 1000,
              type: 'exponential'
            })
            .removeOnComplete(true)
            .save(function (err) {
              if (err) {
                LOG.error(util.format('[STATUS] [FAILED] [%s] %s Page processing schedule failed', options.site, payload.href, err));
                return paginatedIndexHandlerFinished(err);
              }
  
              LOG.debug(util.format('[STATUS] [OK] [%s] %s Page processing scheduled', options.site, payload.href));
              return paginatedIndexHandlerFinished(null);
            });
        };
      });
    }
  
    async.series(paginatedIndexesHandlers, function (err, results) {
      if (err) {
        LOG.error(util.format('[STATUS] [Failure] [%s] Pages processing not scheduled', options.site, err));
        return processPaginatedIndexesFinished(err);
      }
  
      LOG.info(util.format('[STATUS] [OK] [%s] Pages processing scheduled', options.site));
      return processPaginatedIndexesFinished(null, results);
    });
  };

  private _processSimpleIndexes = function (config, content, processSimpleIndexesFinished) {
    LOG.info(util.format('[STATUS] [OK] [%s] No paging found', config.site));
    LOG.info(util.format('[STATUS] [OK] [%s] Processing offers', config.site));
  
    return processSimpleIndexesFinished(null, content);
  };

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

  public processOffer = (options, processOfferFinished) => {
    var runningTime = new Date();
    var parser = parserFactory.getParser(options.site);
  
    LOG.debug(util.format('[STATUS] [OK] [%s] Offer processing started %s', options.site, options.href));
  
    const isMainOffer = _.isUndefined(options.origin_href) && parser.config.languages[options.language].main;
    const href = isMainOffer ? options.href : options.origin_href;
  
    SessionFactory.getDbConnection().offers.findOne({
      "origin_href": href
    }, (err, foundMainOffer) => {
      if (err) {
          LOG.error(util.format('[STATUS] [Failure] Checking offer failed', err));
          return this._gatherOffer(options, processOfferFinished);
      } 
      else if (foundMainOffer) {
        const isTranslated = !_.isUndefined(foundMainOffer.translations[options.language]);
  
        if (isMainOffer) {
          SessionFactory.getDbConnection().offers.update({
            _id: mongojs.ObjectId(foundMainOffer._id)
          }, {
            $set: {
              modified: runningTime,
              expires: new Date(runningTime + parser.config.ttl)
            } 
          }, (err, updatedOffer) => {
            if (err) {
              // TODO Mark somehow offer that was excluded from processing
              LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Offers expiration time update failed', options.site, options.href, err));
              return processOfferFinished(err);
            }
  
            if (!updatedOffer) {
              LOG.info(util.format('[STATUS] [OK] [%s] Offer not updated. Proceed with harvesting', options.site, options.href));
              return this._gatherOffer(options, processOfferFinished);
            } else {
              LOG.info(util.format('[STATUS] [OK] [%s] Offers expiration time extended', options.site, options.href));
              return processOfferFinished(null);
            }
          });
        } 
        else if (isTranslated) {
          LOG.info(util.format('[STATUS] [OK] [%s] Offer already translated. Skipping.', options.site, options.href));
          return processOfferFinished(null);
        }
        else {
          LOG.info(util.format('[STATUS] [OK] [%s] Offer translation not found %s. Proceed with harvesting %s', options.site, options.origin_href, options.href));
          return this._gatherOffer(options, processOfferFinished);
        }
      } 
      else {
        LOG.info(util.format('[STATUS] [OK] [%s] Offer not found. Proceed with harvesting', options.site, options.href));
        return this._gatherOffer(options, processOfferFinished);
      };
    });
  };

  private _gatherOffer = (options, processOfferFinished) => {
    var runningTime = new Date();
    var parser = parserFactory.getParser(options.site);
  
    var offerDataHandler = function (body) {
      parser.parse(body, function (err, data) {
        body = null;
  
        if (err) {
          LOG.error(util.format('[STATUS] [Failure] [%s] [%s] [%s] Parsing offer failed', options.site, options.href, err));
          return processOfferFinished(err);
        }
  
        LOG.debug(util.format('[STATUS] [OK] [%s] Offer parsing finished %s', options.site, options.href));
  
        data = _.extend(data, {
          'href': options.href,
          'site': options.site,
          'language': options.language,
          'parsed': runningTime,
          'expires': new Date(runningTime + parser.config.ttl) // in one hour
        });
  
        if (options.origin_href) {
          data.origin_href = options.origin_href;
        }
  
        SessionFactory.getQueueConnection().create('processData', data)
          .attempts(3).backoff({
            delay: 60 * 1000,
            type: 'exponential'
          })
          .removeOnComplete(true)
          .save(function (err) {
            if (err) {
              LOG.error(util.format('[STATUS] [FAILED] [%s] %s Offer data processing schedule failed', options.site, data.href, err));
              return processOfferFinished(err);
            }
  
            LOG.debug(util.format('[STATUS] [OK] [%s] %s Offer data processing scheduled', options.site, data.href));
            return processOfferFinished(null);
          });
      });
    };
  
    if (parser.config.json) {
      offerDataHandler(options);
    } else {
      var crawler = new Crawler();
      crawler.request({
        url: options.href,
        headers: parser.config.headers,
        onError: function (err, offer) {
          if (err) {
            LOG.error(util.format('[STATUS] [Failure] [%s] Offer processing failed %s', options.site, options.href, err));
            return processOfferFinished(err);
          }
  
          return processOfferFinished(null, offer);
        },
        onSuccess: offerDataHandler
      });
    }
  };

  public processImage = (options, processImageFinished) => {
    LOG.debug(util.format('[STATUS] [OK] [%s] Image processing started %s', options.site, options.href));
  
    request({
      url: options.href,
      encoding: 'binary'
    }, (err, res, body) => {
      if (err) {
        LOG.error(util.format('[STATUS] [Failure] [%s] Image processing failed %s', options.site, options.href, err));
        return processImageFinished(err);
      }
  
      if (body && res.statusCode === 200) {
        const offerHref = new URL(options.offerHref);
        options.dest = path.join(process.cwd(), './uploads/offers/' + options.site + '/' + slugify(offerHref.pathname));
  
        fs.ensureDir(options.dest, '0777', (err) => {
          if (err) {
            if (err.code == 'EEXIST') {
              // do nothing 
            }
          }
  
          options.dest = path.join(options.dest, path.basename(options.href));
  
          fs.writeFile(options.dest, body, 'binary', (err) => {
            if (err) {
              LOG.error(util.format('[STATUS] [Failure] [%s] Image storing failed %s', options.site, options.href, err));
              return processImageFinished(err);
            }
  
            return processImageFinished(null);
          });
        });
      } else {
        if (!body) {
          LOG.error(util.format('[STATUS] [Failure] [%s] Image retrieving failed %s', options.site, options.href, err));
          return processImageFinished(new Error(`Image loading error - empty body. URL: ${options.href}`));
        }
  
        return processImageFinished(new Error(`Image loading error - server responded ${res.statusCode}`));
      }
    });
  };

  private _cleanUploads = (site) => {
    var uploadsPath = path.join(process.cwd(), './uploads/offers/' + site);
  
    fs.readdir(uploadsPath, function (err, files) {
        if (err) {
            LOG.error(util.format('[STATUS] [FAILED] Error reading uploads directory', err));
        } else {
            if (files.length !== 0) {
                _.each(files, function (file) {
                    var filePath = uploadsPath + file;
                    fs.stat(filePath, function (err, stats) {
                        if (err) {
                            LOG.error(util.format('[STATUS] [FAILED] Error reading uploaded file', err));
                        } else {
                            if (stats.isFile()) {
                                fs.unlink(filePath, function (err) {
                                    if (err) {
                                        LOG.error(util.format('[STATUS] [FAILED] Error deleting uploaded file', err));
                                    }
                                });
                            }
                        }
                    });
                });
            }
        }
    });
  };
};

export default new Harvester();