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

  private _picturesParser = ($) => {
    return $('.deal_rules_td .dd_video_photo > a').map((index, el) => {
      return this.compileImageHref($(el).attr('href'));
    }).get();
  }

  private _titleParser = ($) => {
    return $('.deal_rules_td > h1.title_deal').text();
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
    'indexPage': 'https://www.minuvalik.ee/?c=all',
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
        'compiler': this._offerTranslationHrefCompiler
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
      'title': this._titleParser,
      'pictures': this._picturesParser,
      'additional': ($) => {
        return $('.deal_rules_td .dd_lead').html();
      },
      'description': ($) => {
        return $('.deal_rules_td .dd_descr').eq(1).html();
      },
      'details': ($) => {
        return $('.deal_rules_td .dd_descr').first().html();
      },
      'original_price': ($) => {
        return this.priceCleanup($('.deal_rules_td > div#parent_div div.dd_table_discount_info > span.dd_basic_price').text());
      },
      'price': ($) => {
        return this.priceCleanup($('.deal_rules_td > div#parent_div > div> div.dd_table_price').text());
      },
      'discount': ($) => {
        return { 
          amount: this.compileDiscount($('.deal_rules_td > div#parent_div div.dd_table_discount_info > span.fl_deals_fp_discount_row').text().replace(/alates |от /, '')), 
          percents: 0 
        }; // TODO calculate discount 
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
    return this.config.indexPage + this.config.paging!!.pattern;
  }
  
  compileImageHref = (link) => {
    return url.resolve(this.config.indexPage, link);
  };
  
  compileOfferHref = (link, language) => {
    if (language && !this.config.languages[language].main) {
      var compiler = this.config.languages[language].compiler;

      if (compiler) {
        return compiler(link);
      }
    }
  
    return url.resolve(this.config.indexPage, link);
  };
  
  compilePageHref = (link) => {
    return this.config.indexPage + link;
  };

}

module.exports = MinuvalikParser;