var _ = require('lodash');
var async = require('async');
var fs = require('fs');
var path = require('path');
var Promise = require('promise');
var request = require('request')
var util = require("util");

var Crawler = require("./Crawler");
var LOG = require("./Logger");
var parserFactory = require("./ParserFactory");
var SessionFactory = require("./SessionFactory");


var Harvester = function () {
  this.db = SessionFactory.getDbConnection();
};

Harvester.prototype.cleanupSite = function (options, cleanupFinished) {
  LOG.info(util.format('[STATUS] [OK] [%s] Cleanup started', options.site));

  this.db.offers.remove({
    'site': options.site
  }, function (err) {
    if (err) {
      LOG.error(util.format('[STATUS] [Failure] [%s] Cleanup failed', options.site, err));
      return cleanupFinished(err);
    }

    LOG.info(util.format('[STATUS] [OK] [%s] Cleanup finished', options.site));
    return cleanupFinished(null);
  });
};

Harvester.prototype.processSite = function (options, processSiteFinished) {
  LOG.info(util.format('[STATUS] [OK] [%s] Site processing started', options.site));

  // TODO extract to separate SiteProcessor -> process method
  this.gatherOffers(options, function (err, offers) {
    if (err) {
      LOG.error(util.format('[STATUS] [Failure] [%s] Getting latest offers failed', options.site, err));
      return processSiteFinished(err);
    }

    LOG.info(util.format('[STATUS] [OK] [%s] Getting latest offers finished', options.site));
    return processSiteFinished(null, offers);
  });
};

Harvester.prototype.gatherOffers = function (options, gatherOffersFinished) {
  var that = this;

  var parser = parserFactory.getParser(options.site),
    indexPages = parser.config.indexPages;

  // TODO extract to separate SiteProcessor -> process method
  var indexPagesHandlers = _.map(indexPages, function (indexPageUrl) {
    return function (indexPageHandlerFinished) {
      options = _.extend(options, {
        'url': indexPageUrl.replace(/{search_criteria}/g, options.search) // TODO add default paging parameters 
      });

      that.processIndexPage(options, function (err, offers) {
        if (err) {
          LOG.error(util.format('[STATUS] [Failure] [%s] Gathering offers index page failed', options.site, err));
          return indexPageHandlerFinished(err);
        }

        LOG.info(util.format('[STATUS] [OK] [%s] Gathering offers index page finished', options.site));
        return indexPageHandlerFinished(null, offers);
      });
    };
  });

  async.series(indexPagesHandlers, function (err, results) {
    if (err) {
      LOG.error(util.format('[STATUS] [Failure] [%s] Gathering offers failed', options.site, err));
      return gatherOffersFinished(err);
    }

    LOG.info(util.format('[STATUS] [OK] [%s] Gathering offers finished', options.site));
    return gatherOffersFinished(null, results);
  });
};

Harvester.prototype.processIndexPage = function (options, processIndexPageFinished) {
  var that = this;

  LOG.info(util.format('[STATUS] [OK] [%s] [%s] Fetching index page', options.site, options.url));

  var parser = parserFactory.getParser(options.site);

  if (parser.config.payload) {
    options.payload = parser.config.payload.replace(/{search_criteria}/g, options.search);
  }

  var crawler = new Crawler();
  crawler.request({
    url: options.url,
    json: parser.config.json,
    headers: parser.config.headers,
    payload: options.payload,
    onError: function (err, result) {
      if (err) {
        LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Fetching index page failed', options.site, options.url, err));
        return processIndexPageFinished(err);
      }
    },
    onSuccess: function (err, content) {
      if (err) {
        LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Fetching index page failed', options.site, options.url, err));
        return processIndexPageFinished(err);
      }

      if (parser.config.paging) {
        that.processPaginatedIndexes(options, content, processIndexPageFinished);
      }
      else {
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
    paginatedIndexesHandlers = _.map(pagingParams.pages, function (pageUrl, index) {
      return function (paginatedIndexHandlerFinished) {
        content = null;

        SessionFactory.getQueueConnection().create('processPage', {
          'site': options.site,
          'url': pageUrl,
          'pageIndex': index + 1,
          'totalPages': pagingParams.pages.length
        }).attempts(3).backoff({ delay: 60 * 1000, type: 'exponential' }).removeOnComplete(true).save(function (err) {
          if (err) {
            LOG.error(util.format('[STATUS] [FAILED] [%s] %s Page processing schedule failed', options.site, pageUrl, err));
            return paginatedIndexHandlerFinished(err);
          }

          LOG.debug(util.format('[STATUS] [OK] [%s] %s Page processing scheduled', options.site, pageUrl));
          return paginatedIndexHandlerFinished(null);
        });
      };
    });
  }
  else {
    paginatedIndexesHandlers = _.map(pagingParams.payloads, function (payload, index) {
      return function (paginatedIndexHandlerFinished) {
        content = null;

        SessionFactory.getQueueConnection().create('processPage', {
          'site': options.site,
          'url': payload.url,
          'payload': payload.payload,
          'pageIndex': index + 1,
          'totalPages': pagingParams.payloads.length
        }).attempts(3).backoff({ delay: 60 * 1000, type: 'exponential' }).removeOnComplete(true).save(function (err) {
          if (err) {
            LOG.error(util.format('[STATUS] [FAILED] [%s] %s Page processing schedule failed', options.site, payload.url, err));
            return paginatedIndexHandlerFinished(err);
          }

          LOG.debug(util.format('[STATUS] [OK] [%s] %s Page processing scheduled', options.site, payload.url));
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
    url: options.url,
    json: parser.config.json,
    headers: parser.config.headers,
    payload: options.payload,
    onError: function (err, result) {
      if (err) {
        LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Fetching page failed', options.site, options.url, err));
        return processPageFinished(err);
      }

      LOG.debug(util.format('[STATUS] [OK] [%s] [%s] Fetching page finished', options.site, options.url));
      return processPageFinished(null, result);
    },
    onSuccess: function (err, content) {
      try {
        var offers = parser.getOffers(content);

        var offersHandlers = _.map(offers, function (offer, index) {
          return function (offerHandlerFinished) {
            content = null;

            var jobConfig = _.extend({
              'site': options.site
            }, offer);

            SessionFactory.getQueueConnection().create('processOffer', jobConfig)
              .attempts(3).backoff({ delay: 60 * 1000, type: 'exponential' }).removeOnComplete(true)
              .save(function (err) {
                if (err) {
                  LOG.error(util.format('[STATUS] [FAILED] [%s] %s Offer processing schedule failed', options.site, offer.url, err));
                  return offerHandlerFinished(err);
                }

                LOG.debug(util.format('[STATUS] [OK] [%s] %s Offer processing scheduled', options.site, offer.url));
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
      catch (ex) {
        content = null;

        LOG.error(util.format('[STATUS] [Failure] [%s] Offers processing not scheduled', options.site, err));
        return processPageFinished(err);
      }
    }
  });
};

Harvester.prototype.processOffer = function (options, processOfferFinished) {
  var that = this;

  LOG.debug(util.format('[STATUS] [OK] [%s] Offer processing started %s', options.site, options.url));

  var parser = parserFactory.getParser(options.site);

  var offerDataHandler = function (err, body) {
    parser.parse(body, function (err, offer) {
      body = null;

      if (err) {
        LOG.error(util.format('[STATUS] [Failure] [%s] [%s] [%s] Parsing offer failed', options.site, options.url, err));
        return processOfferFinished(err);
      }

      var runningTime = new Date();

      offer = _.extend(offer, {
        'url': options.url,
        'site': options.site,
        'active': true,
        'parsed': runningTime.getDate() + "/" + runningTime.getMonth() + "/" + runningTime.getFullYear()
      });

      SessionFactory.getDbConnection().offers.save(offer, function (err, saved) {
        if (err) {
          LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Saving offer failed', options.site, offer.id, err));
          return processOfferFinished(err);
        }

        if (!saved) {
          LOG.error(util.format('[STATUS] [Failure] [%s] [%s] Saving offer failed', options.site, offer.id, err));
          return processOfferFinished(new Error('DB save query failed'));
        }

        if (offer.pictures && offer.pictures.length > 0) {
          SessionFactory.getQueueConnection().create('processImage', {
            'site': options.site,
            'url': offer.pictures[0]
          }).attempts(3).backoff({ delay: 60 * 1000, type: 'exponential' }).removeOnComplete(true).save(function (err) {
            if (err) {
              LOG.error(util.format('[STATUS] [FAILED] [%s] %s Image processing schedule failed', options.site, offer.url, err));
              return processOfferFinished(err);
            }

            LOG.debug(util.format('[STATUS] [OK] [%s] %s Image processing scheduled', options.site, offer.url));
            return processOfferFinished(null);
          });
        }

        LOG.debug(util.format('[STATUS] [OK] [%s] [%s] Saving offer finished', options.site, offer.id));
        LOG.debug(util.format('[STATUS] [OK] [%s] Offer processing finished %s', options.site, options.url));
        return processOfferFinished(null, saved);
      });
    });
  };

  if (parser.config.json) {
    offerDataHandler(null, options);
  }
  else {
    var crawler = new Crawler();
    crawler.request({
      url: options.url,
      headers: parser.config.headers,
      onError: function (err, offer) {
        if (err) {
          LOG.error(util.format('[STATUS] [Failure] [%s] Offer processing failed %s', options.site, options.url, err));
          return processOfferFinished(err);
        }

        return processOfferFinished(null, offer);
      },
      onSuccess: offerDataHandler
    });
  }
};

Harvester.prototype.processImage = function (options, callback) {
  var that = this;

  LOG.debug(util.format('[STATUS] [OK] [%s] Image processing started %s', options.site, options.url));

  request({
    url: options.url,
    encoding: 'binary'
  }, (err, res, body) => {
    if (err) {
      LOG.error(util.format('[STATUS] [Failure] [%s] Image processing failed %s', options.site, options.url, err));
      return callback(err);
    }

    if (body && res.statusCode === 200) {
      if (!path.extname(options.dest)) {
        options.dest = path.join(options.dest, path.basename(options.url))
      }

      fs.writeFile(options.dest, body, 'binary', (err) => {
        if (err) {
          LOG.error(util.format('[STATUS] [Failure] [%s] Image storing failed %s', options.site, options.url, err));
          return callback(err);
        }

        return callback(null);
      })
    } else {
      if (!body) {
        LOG.error(util.format('[STATUS] [Failure] [%s] Image retrieving failed %s', options.site, options.url, err));
        return callback(new Error(`Image loading error - empty body. URL: ${options.url}`));
      }

      return callback(new Error(`Image loading error - server responded ${res.statusCode}`));
    }
  });
};

module.exports = Harvester;
