'use strict';

var _ = require("lodash");
var url = require("url");
var util = require("util");

import AbstractParser, { ParserConfiguration } from "./AbstractParser";

class BabycityParser extends AbstractParser {

  protected config: ParserConfiguration = {
    'has_index_page': false,
    'index_page': 'https://www.babycity.ee/ee/shop/customList/2/',
    'site': 'https://www.babycity.ee/',
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
        'exists': false
      }
    },
    'paging': {
      'finite': false,
      'pattern': 'page:{paging_pagenumber}'
    },
    'list': ($) => {
      return $('div.category-product-list div.category-product-item > a').map((index, el) => {
        return $(el).attr('href');
      }).get();
    },
    'templates': {
      'content': ($) => {
        return $('div.col-product-container').first().html();
      },
      'title': ($) => {
        return $('div.product div.product-title > h1').first().text().trim();
      },
      'pictures': ($) => {
        return $('div.product-images div.product-thumbs div.product-thumb > img').map((index, el) => {
          return this.compileImageHref($(el).attr('src').replace(/\/resized\/70x74/gi, ''));
        }).get();
      },
      'price': ($) => {
        var current = this.priceCleanup($('div#productDetails div.itemPrice div.price-box div[itemprop=offerDetails] > span.price.discounted').text());
        var original = this.priceCleanup($('div#productDetails div.itemPrice div.price-box div[itemprop=offerDetails] > span.old-price').text());

        return {
          current: current,
          original: original,
          discount: this.compileDiscount(current, original),
          currency: 'EUR'
        }
      },
      'description': ($) => {
        return $('div.product-description.text-content').html();
      },
      'vendor': ($) => {
        var header = $('div.__itemDescriptionTable table.table-product-features > tbody > tr > td').filter((index, el) => {
          return _.includes(['Bränd'], $(el).text());
        }).first();

        return header.next('td').text().trim();
      }
    },
    'translations': ['title', 'description'],
    'required_properties': ['description', 'price', 'pictures', 'title']
  };

  compilePageHref = (link) => {
    return this.config.index_page + link;
  };
  
  compilePagingPattern = () => {
    return this.config.index_page + this.config.paging!!.pattern;
  };

  compileOfferHref = (link) => {
    return link;
  };

  compileImageHref = (link) => {
    return link;
  };
};

module.exports = BabycityParser;