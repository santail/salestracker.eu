'use strict';

var util = require('util'),
  _ = require("lodash"),
  urlParser = require("url"),

  AbstractParser = require("./AbstractParser");

function HouseoffraserParser() {
  AbstractParser.call(this);

  var that = this;

  var config = {
    'site': 'https://www.houseoffraser.co.uk/',
    'indexPages': {
      'est': 'https://www.houseoffraser.co.uk/search/getajaxresponse'
    },
    'json': true,
    'payload': '{"querystring":"q={search_criteria}&f-categories=03&listtype=7","pageLoadType":"partial"}',
    'headers': {
      'Pragma': 'no-cache',
      'Origin': 'https://www.houseoffraser.co.uk',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9,et;q=0.8,ru;q=0.7,de;q=0.6,nl;q=0.5,lv;q=0.4     ',
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'Cache-Control': 'no-cache',
      'X-Requested-With': 'XMLHttpRequest',
      'Connection': 'keep-alive',
      'Referer': 'https://www.houseoffraser.co.uk/search?page=2'
    },
    'paging': {
      'finit': true,
      'limit': 5,
      'pattern': '{"querystring":"q={search_criteria}&f-categories=03&listtype=7&pagesize={paging_pagesize}&page={paging_pagenumber}","pageLoadType":"partial"}'
    },
    'list': function (content) {
      return content.ProductListing.Items;
    },
    'templates': {
      'name': function (data) {
        return data.Name;
      },
      'category': function (data) {
        return data.AdditionalAttr.ProductCategory;
      },
      'brand': function (data) {
        return data.BrandName;
      },
      'colors': function (data) {
        return [data.AdditionalAttr.Colour];
      },
      'price': function (data) {
        return data.Price;
      },
      'previous': function (data) {
        return data.WasPrice;
      },
      'pictures': function (data) {
        return [that.compileImageUrl(data.Image1), that.compileImageUrl(data.Image2)];
      },
      'description': function (data) {
        return data.AdditionalAttr.ProductDescription;
      },
      'size': function (data) {
        return data.AdditionalAttr.Size;
      }
    }
  };

  this.config = _.extend(this.config, config);
}

util.inherits(HouseoffraserParser, AbstractParser);

HouseoffraserParser.prototype.compileImageUrl = function (link) {
  return 'https://houseoffraser.scene7.com/is/image/HOF/' + link.replace(/&amp;/g, '&');
};

HouseoffraserParser.prototype.compileOfferUrl = function (language, offer) {
  return urlParser.resolve(this.config.site, offer.ProductDetailsLink);
};

HouseoffraserParser.prototype.compilePageUrl = function (language, link) {
  return link;
};

HouseoffraserParser.prototype.compilePagingParameters = function (content, options) {
  var that = this;

  var payloads = [];

  var pagesCount = content.ProductListing.TotalPages;
  var pageSize = content.ProductListing.PageSize;

  if (options.limit && options.limit < pagesCount) {
    pagesCount = options.limit;
  } else if (that.config.paging.limit && that.config.paging.limit < pagesCount) {
    pagesCount = that.config.paging.limit;
  }

  for (var pageNumber = 1; pageNumber <= pagesCount; pageNumber++) {
    var payload = that.config.paging.pattern
      .replace(/{paging_pagenumber}/g, pageNumber)
      .replace(/{paging_pagesize}/g, pageSize)
      .replace(/{search_criteria}/g, options.search);

    payloads.push(payload);
  }

  return {
    'payloads': _.map(payloads, function (payload) {
      return {
        'payload': payload,
        'url': that.config.indexPages['est']
      }
    })
  };
};

module.exports = HouseoffraserParser;