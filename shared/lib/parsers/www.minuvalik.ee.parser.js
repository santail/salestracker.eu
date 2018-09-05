'use strict';

var _ = require("lodash");
var url = require("url");
var util = require('util');

var AbstractParser = require("./AbstractParser");

function MinuvalikParser() {
  AbstractParser.call(this);

  var that = this;

  var config = {
    'headers': {
      'proxy': '95.24.130.71:8888',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'accept-encoding': 'gzip, deflate, sdch, break',
      'accept-language': 'en-US,en;q=0.8',
      'cache-control': 'no-cache',
      'cookie': 'PHPSESSID=74d102f808e764b5d7cadbdcfa4b221d; _ym_uid=1467195298259851485; _ym_isad=2; _ga=GA1.2.90566724.1467195298; _gat=1',
      'pragma': 'no-cache',
      'upgrade-insecure-requests': '1',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36 Vivaldi/1.2.490.43',
    },
    'site': 'http://www.minuvalik.ee',
    'indexPage': 'https://www.minuvalik.ee/?c=all',
    'languages': {
      'est': {
        'exists': true,
        'main': true
      },
      'eng': {
        'exists': false
      },
      'rus': {
        'exists': true,
        'compiler': function (originalUrl) {
          var parsedUrl = url.parse(originalUrl);
          parsedUrl.pathname = parsedUrl.pathname.replace(/^\/ee\//gi, "/ru/");

          return url.format(parsedUrl);
        }
      }
    },
    'paging': {
      'finit': true,
      'pattern': '&from={paging_pagenumber}',
      'first': function ($) {
        return this.controls($).find('span.sel').first().text().replace(/.*from=(\d)/, "$1");
      },
      'last': function ($) {
        return this.controls($).find('a.link_stbst').last().attr('href').replace(/.*from=(\d)/, "$1");
      },
      'controls': function ($) {
        return $('div.stbst');
      }
    },
    'list': function ($) {
      return $('div.deals li > a').map(function () {
        return $(this).attr('href');
      }).get();
    },
    'templates': {
      'title': function ($) {
        return $('.deal_rules_td > h1.title_deal').text();
      },
      'pictures': function ($) {
        return $('.deal_rules_td .dd_video_photo > a').map(function (i, el) {
          return that.compileImageUrl($(this).attr('href'));
        }).get();
      },
      'additional': function ($) {
        return $('.deal_rules_td .dd_lead').html();
      },
      'description': function ($) {
        return $('.deal_rules_td .dd_descr').eq(1).html();
      },
      'details': function ($) {
        return $('.deal_rules_td .dd_descr').first().html();
      },
      'original_price': function ($) {
        return that.priceCleanup($('.deal_rules_td > div#parent_div div.dd_table_discount_info > span.dd_basic_price').text());
      },
      'price': function ($) {
        return that.priceCleanup($('.deal_rules_td > div#parent_div > div> div.dd_table_price').text());
      },
      'discount': function ($) {
        return that.priceCleanup($('.deal_rules_td > div#parent_div div.dd_table_discount_info > span.fl_deals_fp_discount_row').text().replace(/alates |от /, ''));
      },
      'vendor': function ($) {
        return '';
      }
    }
  };

  this.config = _.extend(this.config, config);
}

util.inherits(MinuvalikParser, AbstractParser);

MinuvalikParser.prototype.compilePagingPattern = function () {
  var that = this;

  return that.config.indexPage + that.config.paging.pattern;
}

MinuvalikParser.prototype.compileImageUrl = function (link) {
  var that = this;

  return url.resolve(that.config.indexPage, link);
};

MinuvalikParser.prototype.compileOfferUrl = function (link, language) {
  var that = this;

  if (language && !that.config.languages[language].main) {
    var compiler = languages[language].compiler;
    return compiler(link);
  }

  return url.resolve(that.config.indexPage, link);
};

MinuvalikParser.prototype.priceCleanup = function (price) {
  return price;
}

MinuvalikParser.prototype.compilePageUrl = function (link) {
  var that = this;

  return that.config.indexPage + link;
};

MinuvalikParser.prototype.getMainLanguage = function (link) {
  return 'est';
};

module.exports = MinuvalikParser;