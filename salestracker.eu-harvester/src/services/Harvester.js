var _ = require('lodash');
var async = require('async');
var fs = require('fs-extra');
var path = require('path');
var request = require('request');
var slugify = require('slugify');
var util = require("util");

var Crawler = require("./Crawler");

var LOG = require("../../lib/services/Logger");
var parserFactory = require("../../lib/services/ParserFactory");
var SessionFactory = require("../../lib/services/SessionFactory");


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
  var that = this;

  LOG.debug(util.format('[STATUS] [OK] [%s] Offer processing started %s', options.site, options.href));

  var parser = parserFactory.getParser(options.site);

  var offerDataHandler = function (body) {
    parser.parse(body, function (err, data) {
      body = null;

      if (err) {
        LOG.error(util.format('[STATUS] [Failure] [%s] [%s] [%s] Parsing offer failed', options.site, options.href, err));
        return processOfferFinished(err);
      }

      var runningTime = new Date();

      data = _.extend(data, {
        'href': options.href,
        'site': options.site,
        'language': options.language,
        'active': true,
        'parsed': runningTime.getDate() + "/" + runningTime.getMonth() + "/" + runningTime.getFullYear()
      });

      if (options.origin) {
        data.origin = options.origin;
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
};

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