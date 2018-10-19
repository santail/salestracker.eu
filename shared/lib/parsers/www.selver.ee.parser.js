'use strict';

var url = require("url");
var util = require('util');

var AbstractParser = require("./AbstractParser");

function SelverParser() {
  AbstractParser.call(this);

  var that = this;

  this.config = {
    'site': 'http://www.selver.ee',
    'indexPage': 'http://www.selver.ee/soodushinnaga-tooted?limit=96',
    'languages': {
      'est': {
        'exists': true,
        'main': true
      }
    },
    'paging': {
      'finit': true,
      'pattern': '&p={paging_pagenumber}',
      'first': function () {
        return 1;
      },
      'last': function ($) {
        var lastItemIndex = $('body > div.main-container div.category-products > div.toolbar > div.pages > ol > li').length - 1;
        return $('body > div.main-container div.category-products > div.toolbar > div.pages > ol > li:nth-child(' + (lastItemIndex) + ') > a').attr('href').replace(/.*p=(\d)/, "$1");
      }
    },
    'ttl': 2 * 60 * 60 * 1000,
    'list': function ($) {
      return $('#products-grid > li > a').map(function () {
        return $(this).attr('href');
      }).get();
    },
    'templates': {
      'vendor': function ($) {
        var header = $('#product-attribute-specs-table tr > th').filter(function () {
          return $(this).text() === 'Tootja';
        }).first();

        return header.next('td.data').text().replace(/Määramata/g, '');
      },
      'title': function ($) {
        return $('div.product-essential.row div.page-title > h1').text();
      },
      'description': function ($) {
        return $('div.product-essential.row div > span[itemprop="description"]').text();
      },
      'pictures': function ($) {
        return [that.compileImageHref($('#main-image-default > a').attr('href'))];
      },
      'price': function ($) {
        return that.priceCleanup($('div.product-essential div.price-box:first-child p.special-price span.price > span:nth-child(1)').text());
      },
      'original_price': function ($) {
        return that.priceCleanup($('div.product-essential div.price-box:nth-child(1) p.old-price span.price > span:nth-child(1)').text());
      }
    },
    'translations': ['title', 'description', 'href']
  };
}

util.inherits(SelverParser, AbstractParser);

SelverParser.prototype.compilePagingPattern = function () {
  var that = this;

  return that.config.indexPage + that.config.paging.pattern;
};

SelverParser.prototype.compilePageHref = function (link) {
  var that = this;

  return that.config.indexPage + link;
};

SelverParser.prototype.compileImageHref = function (link) {
  return "http:" + link;
};

SelverParser.prototype.compileOfferHref = function (link) {
  var that = this;

  return url.resolve(that.config.indexPage, link);
};

module.exports = SelverParser;