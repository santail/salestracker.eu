'use strict';

var util = require('util'),
  _ = require("lodash"),
  urlParser = require("url"),

  AbstractParser = require("./AbstractParser");

function NordstromParser() {
  AbstractParser.call(this);

  var that = this;

  var config = {
    'site': 'https://shop.nordstrom.com/',
    'indexPages': {
      'est': 'https://shop.nordstrom.com/api/search/query/{search_criteria}/?top=72&isMobile=false&filtercategoryid=6000008&offset=0&page=1&sort=Boosted'
    },
    'json': true,
    'headers': {
      'Host': 'shop.nordstrom.com',
      'Connection': 'keep-alive',
      'Pragma': 'no-cache',
      'Cache-Control': 'no-cache',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Referer': 'https://shop.nordstrom.com/sr?keyword=QUILTED+SHORT+JACKET&filtercategoryid=6000008&origin=leftnav&cm_sp=Left%20Navigation-_-&page=2&top=72',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9,et;q=0.8,ru;q=0.7,de;q=0.6,nl;q=0.5,lv;q=0.4',
      'Cookie': 'internationalshippref=preferredcountry=EE&preferredcurrency=EUR&preferredcountryname=Estonia;'
    },
    'paging': {
      'finit': true,
      'limit': 5,
      'pattern': '/api/search/query/{search_criteria}/?top={paging_pagesize}&isMobile=false&filtercategoryid=6000008&offset=0&page={paging_pagenumber}&sort=Boosted'
    },
    'list': function (content) {
      return _.values(content.productsById);
    },
    'templates': {
      'name': function (data) {
        return data.name;
      },
      'brand': function (data) {
        return data.brandName;
      },
      'colors': function (data) {
        return _.values(data.colorIds);
      },
      'price': function (data) {
        return data.pricesById.sale.maxItemPrice;
      },
      'previous': function (data) {
        return data.pricesById.original.maxItemPrice;
      },
      'discount': function (data) {
        return data.pricesById.sale.maxItemPercentOff;
      },
      'pictures': function (data) {
        var pictures = [];

        _.each(_.values(data.mediaById), function (picture) {
          var url = that.compileImageUrl(picture.src);

          if (picture.group === 'main') {
            pictures.splice(0, 0, url);
          }
        });

        return pictures;
      }
    }
  };

  this.config = _.extend(this.config, config);
}

util.inherits(NordstromParser, AbstractParser);

NordstromParser.prototype.compileImageUrl = function (link) {
  return link.replace(/&amp;/g, '&');
};

NordstromParser.prototype.compileOfferUrl = function (language, offer) {
  return urlParser.resolve(this.config.site, offer.productPageUrl);
};

NordstromParser.prototype.compilePagingParameters = function (content, options) {
  var that = this;

  var pagingParams = content.query;

  var pageSize = pagingParams.pageProductCount;
  var pagesCount = pagingParams.pageCount;

  if (options.limit && options.limit < pagesCount) {
    pagesCount = options.limit;
  } else if (that.config.paging.limit && that.config.paging.limit < pagesCount) {
    pagesCount = that.config.paging.limit;
  }

  var pages = [];

  for (var pageNumber = 1; pageNumber <= pagesCount; pageNumber++) {
    pages.push(that.compilePageUrl('est',
      that.config.paging.pattern
        .replace(/{paging_pagenumber}/g, pageNumber)
        .replace(/{paging_pagesize}/g, pageSize)
        .replace(/{search_criteria}/g, options.search)));
  }

  return {
    'pages': pages
  };
};

NordstromParser.prototype.compilePageUrl = function (language, link) {
  return urlParser.resolve(this.config.indexPages[language], link);
};

module.exports = NordstromParser;