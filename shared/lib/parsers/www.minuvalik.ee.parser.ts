'use strict';

var _ = require("lodash");
var url = require("url");

import AbstractParser, { ParserConfiguration } from "./AbstractParser";


class MinuvalikParser extends AbstractParser {

  private _offerTranslationHrefCompiler = (href) => {
    var parsed = url.parse(href);
    parsed.pathname = parsed.pathname.replace(/^\/ee\//gi, "/ru/");

    return url.format(parsed);
  };

  protected config: ParserConfiguration = {
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
    'has_index_page': true,
    'index_page': 'https://www.minuvalik.ee/?c=all',
    'ttl': 2 * 60 * 60 * 1000,
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
        'compileHref': this._offerTranslationHrefCompiler
      }
    },
    'paging': {
      'finit': true,
      'pattern': '&from={paging_pagenumber}',
      'first': function ($) {
        return this.controls!!($).find('span.sel').first().text().replace(/.*from=(\d)/, "$1");
      },
      'last': function ($) {
        return this.controls!!($).find('a.link_stbst').last().attr('href').replace(/.*from=(\d)/, "$1");
      },
      'controls': ($) => {
        return $('div.stbst');
      }
    },
    'list': ($) => {
      return $('div.deals li > a').map((index, el) => {
        return $(el).attr('href');
      }).get();
    },
    'templates': {
      'content': ($) => {
        return $('table.deal_table').html();
      },
      'title': ($) => {
        return $('h1.title_deal').text();
      },
      'pictures': ($) => {
        return $('div.dd_video_photo > a').map((index, el) => {
          return this.compileImageHref($(el).attr('href'));
        }).get();
      },
      'description': ($) => {
        return $('ul.dd_descr').first().html();
      },
      'details': ($) => {
        return $('ul.dd_descr').eq(1).html();
      },
      'additional': ($) => {
        return $('ul.dd_descr').eq(2).html();
      },
      'price': ($) => {
        var current = this.priceCleanup($('div#parent_div > div> div.dd_table_price').text());
        var original = this.priceCleanup($('div#parent_div div.dd_table_discount_info > span.dd_basic_price').text());
        
        return {
          'current': current,
          'original': original,
          'discount': this.compileDiscount(current, original)
        }
      },
      'currency': () => {
        return 'EUR';
      },
      'vendor': () => {
        return '';
      }
    },
    'translations': ['title', 'description', 'details', 'additional']
  };

  constructor() {
    super();

    this.config = _.extend(this.config, this.config);
  };

  compilePagingPattern = () => {
    return this.config.index_page + this.config.paging!!.pattern;
  }
  
  compileImageHref = (link) => {
    return url.resolve(this.config.index_page, link);
  };
  
  compileOfferHref = (link, language) => {
    if (language && !this.config.languages[language].main) {
      var compiler = this.config.languages[language].compileHref;

      if (compiler) {
        return compiler(link);
      }
    }
  
    return url.resolve(this.config.index_page, link);
  };
  
  compilePageHref = (link) => {
    return this.config.index_page + link;
  };

}

module.exports = MinuvalikParser;