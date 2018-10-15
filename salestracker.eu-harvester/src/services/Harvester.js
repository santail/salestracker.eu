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

var Crawler = require("./Crawler");

var LOG = require("../../lib/services/Logger");
var parserFactory = require("../../lib/services/ParserFactory");
var SessionFactory = require("../../lib/services/SessionFactory");


var Harvester = function () {
  this.db = SessionFactory.getDbConnection();
};

Harvester.prototype.cleanupSite = function (options) {
  var that = this;

  if (!options.shouldCleanup) {
    return Promise.resolve();
  }

  LOG.info(util.format('[STATUS] [OK] [%s] Cleanup started', options.site));

  return new Promise(function (fulfill, reject){
    that.db.offers.remove({
      'site': options.site
    }, function (err) {
      if (err) reject(err);
      else fulfill();
    });
  });
};

Harvester.prototype.processSite = function (options) {
  var that = this;
  LOG.info(util.format('[STATUS] [OK] [%s] Site processing started', options.site));

  return new Promise(function (fulfill, reject){
    that.gatherOffers(options, function (err, offers) {
      if (err) reject(err);
      else fulfill(offers);
    });
  });
};

Harvester.prototype.gatherOffers = function (options, gatherOffersFinished) {
  var that = this;

  var parser = parserFactory.getParser(options.site),
    indexPage = parser.config.indexPage,
    language = parser.getMainLanguage();

  options = _.extend(options, {
    'href': indexPage.replace(/{search_criteria}/g, options.search), // TODO add default paging parameters
    'language': language
  });

  that.processIndexPage(options, function (err, offers) {
    if (err) {
      LOG.error(util.format('[STATUS] [Failure] [%s] Gathering offers failed', options.site, err));
      return gatherOffersFinished(err);
    }

    LOG.info(util.format('[STATUS] [OK] [%s] Gathering offers finished', options.site));
    return gatherOffersFinished(null, offers);
  });
};

Harvester.prototype.processIndexPage = function (options, processIndexPageFinished) {
  var that = this;

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
    onError: function (err) {
      LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Fetching index page failed', options.site, options.href, err));
      return processIndexPageFinished(err);
    },
    onSuccess: function (content) {
      if (parser.config.paging) {
        that.processPaginatedIndexes(options, content, processIndexPageFinished);
      } else {
        that.processSimpleIndexes(options, content, processIndexPageFinished);
      }
    }
  });
};

Harvester.prototype.processPaginatedIndexes = function (options, content, processPaginatedIndexesFinished) {
  var that = this;

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

Harvester.prototype.processSimpleIndexes = function (config, dom, processSimpleIndexesFinished) {
  var that = this;

  LOG.info(util.format('[STATUS] [OK] [%s] No paging found', config.site));
  LOG.info(util.format('[STATUS] [OK] [%s] Processing offers', config.site));

  return processSimpleIndexesFinished(null, []);
};

Harvester.prototype.processPage = function (options, processPageFinished) {
  var that = this;

  LOG.info(util.format('[STATUS] [OK] [%s] Page processing %s of %s started', options.site, options.pageIndex, options.totalPages));

  var parser = parserFactory.getParser(options.site);

  var crawler = new Crawler();
  crawler.request({
    url: options.href,
    json: parser.config.json,
    headers: parser.config.headers,
    payload: options.payload,
    onError: function (err) {
      LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Fetching page failed', options.site, options.href, err));
      return processPageFinished(err);
    },
    onSuccess: function (content) {
      var offers = [];

      try {
        offers = parser.getOffers(content);
      } catch (ex) {
        content = null;

        LOG.error(util.format('[STATUS] [Failure] [%s] Offers processing not scheduled', options.site, err));
        return processPageFinished(new Error('Offers processing not scheduled', ex));
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

Harvester.prototype.processOffer = function (options, processOfferFinished) {
  var runningTime = new Date();
  var parser = parserFactory.getParser(options.site);

  LOG.debug(util.format('[STATUS] [OK] [%s] Offer processing started %s', options.site, options.href));

  // Check only main offer if already exists and extend expiration time, proceed to harvesting in other case.
  if (_.isUndefined(options.origin_href) && parser.config.languages[options.language].main) {
    SessionFactory.getDbConnection().offers.findOne({
      "origin_href": options.href
    }, function (err, foundOffer) {
      if (err) {
          LOG.error(util.format('[STATUS] [Failure] Checking offer failed', err));
          return gatherOffer(options, processOfferFinished);
      } 
      else if (foundOffer) {
        SessionFactory.getDbConnection().offers.update({
          _id: mongojs.ObjectId(foundOffer._id)
        }, {
          $set: {
            modified: new Date().toISOString(),
            expires: runningTime + parser.config.ttl
          } 
        }, function (err, updatedOffer) {
          if (err) {
            // TODO Mark somehow offer that was excluded from processing
            LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Offers expiration time update failed', options.site, options.href, err));
            return processOfferFinished(err);
          }

          if (!updatedOffer) {
            LOG.info(util.format('[STATUS] [OK] [%s] Offer not found. Proceed with harvesting', options.site, options.href));
            return gatherOffer(options, processOfferFinished);
          } else {
            LOG.info(util.format('[STATUS] [OK] [%s] Offers expiration time extended', options.site, options.href));
            return processOfferFinished(null);
          }
        });
      } else {
        LOG.info(util.format('[STATUS] [OK] [%s] Offer not found. Proceed with harvesting', options.site, options.href));
        return gatherOffer(options, processOfferFinished);
      };
    });
  }
  else {
    return gatherOffer(options, processOfferFinished);
  }
};

var gatherOffer = function (options, processOfferFinished) {
  var runningTime = new Date();
  var parser = parserFactory.getParser(options.site);

  var offerDataHandler = function (body) {
    parser.parse(body, function (err, data) {
      body = null;

      if (err) {
        LOG.error(util.format('[STATUS] [Failure] [%s] [%s] [%s] Parsing offer failed', options.site, options.href, err));
        return processOfferFinished(err);
      }

      data = _.extend(data, {
        'href': options.href,
        'site': options.site,
        'language': options.language,
        'active': true,
        'parsed': runningTime.getDate() + "/" + runningTime.getMonth() + "/" + runningTime.getFullYear(),
        'expires': runningTime + 1 * 60 * 60 * 1000 // in one hour
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

      LOG.debug(util.format('[STATUS] [OK] [%s] Offer parsing finished %s', options.site, options.href));
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
}

Harvester.prototype.processImage = function (options, processImageFinished) {
  var that = this;

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

module.exports = Harvester;