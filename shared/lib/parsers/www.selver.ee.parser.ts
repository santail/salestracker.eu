'use strict';

var _ = require("lodash");
var url = require("url");

import AbstractParser, {
  ParserConfiguration
} from "./AbstractParser";

class SelverParser extends AbstractParser {

  protected config: ParserConfiguration = {
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
      return $('#products-grid > li > a').map(function (index, el) {
        return $(el).attr('href');
      }).get();
    },
    'templates': {
      'vendor': function ($) {
        var header = $('#product-attribute-specs-table > tbody > tr').filter(function (index, el) {
          return $(el).find('th.label').text() === 'Tootja';
        }).first();

        return header.find('td.data').text().replace(/Määramata/g, '');
      },
      'title': function ($) {
        return $('div.product-essential.row div.page-title > h1').text();
      },
      'description': function ($) {
        return $('div.product-essential.row div > span[itemprop="description"]').text();
      },
      'pictures': ($) => {
        return [this.compileImageHref($('#main-image-default > a').attr('href'))];
      },
      'price': ($) => {
        var current;
        var original;

        // check if partner kaart section exists
        var partnerCardBadge = $('#main-image-default span.product-image__badge--6');
        if (partnerCardBadge.length) {
          current = this.priceCleanup(partnerCardBadge.find('span.product-image__badge--label').text());

          var priceBadgeContainer = $('#bundleSummary div.price-box span.regular-price > span:first-child');
          if (priceBadgeContainer.length) {
            original = this.priceCleanup(priceBadgeContainer.text());
          } else {
            original = this.priceCleanup($('#product_addtocart_form div.price-box span.regular-price > span[itemprop=price]').text());
          }
        } else {
          var priceContainer = $('#product_addtocart_form div.product p.special-price span.price');
          if (priceContainer.length) {
            current = this.priceCleanup(priceContainer.find('span:first-child').text());
          } else {
            current = this.priceCleanup($('div.product-essential div.price-box:first-child p.special-price > span.price > span[itemprop=price]').text());
          }

          var oldPriceContainer = $('#product_addtocart_form div.product p.old-price > span.price > span:first-child');
          if (oldPriceContainer.length) {
            original = this.priceCleanup(oldPriceContainer.text());
          } else {

            original = this.priceCleanup($('div.product-essential div.price-box:first-child p.old-price > span.price > span:first-child').text());
          }
        }

        return {
          'current': current,
          'original': original,
          'discount': this.compileDiscount(current, original)
        }
      },
      'client_card_required': function ($) {
        // check if no partner kaart section exists
        var partnerCardBadge = $('#main-image-default span.product-image__badge--6');

        if (partnerCardBadge.length) {
          return true;
        }

        return false;
      },
      'currency': () => {
        return 'EUR';
      }
    },
    'translations': ['title', 'description']
  };

  compilePagingPattern = () => {
    return this.config.indexPage + this.config.paging!!.pattern;
  };

  compilePageHref = (link) => {
    return this.config.indexPage + link;
  };

  compileImageHref = (link) => {
    return "http:" + link;
  };

  compileOfferHref = (link) => {
    return url.resolve(this.config.indexPage, link);
  };
}

module.exports = SelverParser;