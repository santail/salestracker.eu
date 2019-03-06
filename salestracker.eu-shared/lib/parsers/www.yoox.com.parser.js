'use strict';

var util = require('util'),
  _ = require("lodash"),
  urlParser = require("url"),

  AbstractParser = require("./AbstractParser");

function YooxParser() {
  AbstractParser.call(this);

  var that = this;

  var config = {
    'site': 'https://www.yoox.com/',
    'indexPages': {
      'est': 'https://www.yoox.com/ee/women/shoponline?dept=women&gender=D&season=E&textsearch={search_criteria}'
    },
    'paging': {
      'finit': true,
      'limit': 5,
      'pattern': 'https://www.yoox.com/EE/shoponline?textsearch={search_criteria}&dept=women&gender=D&page={paging_pagenumber}&season=X',
      'first': function ($) {
        return this.controls($).find('li').first().text();
      },
      'last': function ($) {
        return this.controls($).find('li').last().find('a').text();
      },
      'controls': function ($) {
        return $('#js-expanded-pagination-lite');
      }
    },
    'list': function ($) {
      return $("#itemsGrid div.itemContainer > div.itemData > a.itemlink").map(function () {
        return $(this).attr('href');
      }).get();
    },
    'templates': {
      'category': function ($) {
        return $('#itemContent #itemData #itemTitle > div > a').text().trim();
      },
      'brand': function ($) {
        return $('#itemContent #itemData #itemTitle > h1 > a').text().trim();
      },
      'details': function ($) {
        return {
          'madeIn': $('#itemContent #madeInInfo > div:nth-child(2)').text().trim(),
          'composition': $('#itemContent #compositionInfo > div:nth-child(2)').text().trim(),
          'description': $('#itemContent #itemDescription > div:nth-child(2)').text().trim(),
          'measurements': $('#itemContent #measurementsInfo > span').text().trim()
        }
      },
      'sizes': function ($) {
        return $('#itemContent #itemData #itemSizes ul.colorsizelist > li > div:first-child').map(function () {
          return $(this).text().trim();
        }).get();
      },
      'colors': function ($) {
        return $('#itemContent #itemData #itemColors ul.colorsizelist > li > img').map(function () {
          return $(this).attr('alt');
        }).get();
      },
      'price': function ($) {
        return $('#itemContent #itemData #item-price > span:first-child').text().trim();
      },
      'discount': function ($) {
        return $('#itemContent #itemData #item-price > span:nth-child(2)').text().trim();
      },
      'pictures': function ($) {
        return [ $('#itemImage > #openZoom > img').attr('src').trim() ];
      }
    }
  };

  this.config = _.extend(this.config, config);
}

util.inherits(YooxParser, AbstractParser);

YooxParser.prototype.compileOfferUrl = function (language, link) {
  return urlParser.resolve(this.config.site, link);
};

YooxParser.prototype.compilePageUrl = function (language, link) {
  return link;
};

module.exports = YooxParser;