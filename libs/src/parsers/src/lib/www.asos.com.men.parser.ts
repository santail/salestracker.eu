'use strict';

var url = require("url");
var util = require("util");

import AbstractParser, { ParserConfiguration } from "./AbstractParser";

class AsosManParser extends AbstractParser {

  protected override config: ParserConfiguration = {
    'site': 'http://www.asos.com',
    'has_index_page': true,
    'index_page': 'https://api.asos.com/product/search/v1/categories/27396?channel=desktop-web&country=EE&currency=EUR&lang=en&limit=72&offset=0&rowlength=4&store=26',
    'json': true,
    'ttl': 2 * 60 * 60 * 1000,
    'headers': {
      'Host': 'api.asos.com',
      'Connection': 'keep-alive',
      'Pragma': 'no-cache',
      'Cache-Control': 'no-cache',
      'Accept': 'application/json, text/plain, */*',
      'Origin': 'http://www.asos.com',
      'Referer': 'http://www.asos.com/',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9,et;q=0.8,ru;q=0.7,de;q=0.6,nl;q=0.5,lv;q=0.4     ',
    },
    'languages': {
      'est': {
        'exists': false
      },
      'rus': {
        'exists': false
      },
      'eng': {
        'exists': true,
        'main': true
      }
    },
    'paging': {
      'finite': true,
      'pattern': '/product/search/v1/categories/27396?channel=desktop-web&country=EE&currency=EUR&lang=en&limit={paging_pagesize}&offset={paging_offset}&rowlength=4&store=26'
    },
    'list': function (data) {
      return data.products;
    },
    'templates': {
      'content': (data) => {
        return data;
      },
      'title': (data) => {
        return data.name;
      },
      'pictures': (data) => {
        return [data.baseImageUrl];
      },
      'vendor': (data) => {
        return data.brandName;
      },
      'price': (data) => {
        var current = this.priceCleanup(data.price.current.value);
        var original = this.priceCleanup(data.price.previous.value ? data.price.previous.value : data.price.rrp.value);

        return {
          current: current,
          original: original,
          discount: this.compileDiscount(current, original),
          currency: 'EUR'
        }
      },
      'description': ($) => {
        return ''; // TODO find proper description
      }
    },
    'translations': ['title', 'description'],
    'required_properties': ['price', 'pictures', 'title']
  };

  override compilePagingParameters = (content: any, options: any) => {
    var itemCount = content.itemCount;
    var pageSize = 72;

    var lastPage = (itemCount % pageSize > 0 ? 1 : 0) + Math.floor(itemCount / pageSize);

    if (process.env['NODE_ENV'] === 'development' && process.env['PAGING_PAGES_LIMIT'] && parseInt(process.env['PAGING_PAGES_LIMIT'], 10) < lastPage) {
      lastPage = parseInt(process.env['PAGING_PAGES_LIMIT'], 10);
    } else if (options.limit && options.limit < lastPage) {
      lastPage = options.limit;
    } else if (this.config.paging && this.config.paging.limit && this.config.paging.limit < lastPage) {
      lastPage = this.config.paging.limit;
    }

    var pages: string[] = [];

    for (var pageNumber = 0; pageNumber < lastPage; pageNumber++) {
      var offset = pageNumber * pageSize;

      pages.push(this.compilePageHref(this.config.paging!!.pattern
        .replace(/{paging_pagenumber}/g, '' + pageNumber)
        .replace(/{paging_offset}/g, '' + offset)
        .replace(/{paging_pagesize}/g, '' + pageSize)
        .replace(/{search_criteria}/g, options.search)));
    }

    return {
      'pages': pages
    };
  };

  override compilePageHref = (link: any) => {
    return url.resolve(this.config.index_page, link);
  };

  override compileOfferHref = (offer: any) => {
    return util.format('https://www.asos.com/%s', offer.url);
  };
};

module.exports = AsosManParser;
