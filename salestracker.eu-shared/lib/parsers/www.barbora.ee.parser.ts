'use strict';

var url = require("url");

import AbstractParser, { ParserConfiguration } from "./AbstractParser";

class BarboraParser extends AbstractParser {

  protected config: ParserConfiguration = {
    'site': 'https://www.barbora.ee/',
    'headers': {
      'Pragma': 'no-cache',
      'Accept-Encoding': 'gzip, deflate, sdch',
      'Accept-Language': 'en-US,en;q=0.8',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.109 Safari/537.36 Vivaldi/1.0.403.24',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Referer': 'https://www.e-maxima.ee/Pages/Search/Products.aspx?jacobs&subcat=b2d7b08c-22a3-44cf-a53f-ce1bd8e814ed&UrlId=271579',
      'Cookie': 'lang={language}',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache'
    },
    'has_index_page': true,
    'index_page': 'https://www.barbora.ee/pakkumised',
    'ttl': 2 * 60 * 60 * 1000,
    'languages': {
      'est': {
        'exists': true,
        'main': true
      },
      'rus': {
        'exists': false
      }
    },
    'paging': {
      'finite': false,
      'pattern': '?page={paging_pagenumber}'
    },
    'list': ($) => {
      return $('div.b-products-list div.b-product--wrap2 > div.b-product--wrap > div.b-product-wrap-img > a:first-child').map((index, el) => {
        return this.compileOfferHref($(el).attr('href'));
      }).get();
    },
    'templates': {
      'content': ($) => {
        return $('div.b-page-container').html();
      },
      'title': ($) => {
        return $('div.b-product-info h1.b-product-info--title').text().trim();
      },
      'pictures': ($) => {
        return $('div.b-product-info div.b-product-info--pictures-wrap div.b-carousel--slide > img').map((index, el) => {
          return this.compileImageHref($(el).attr('src'));
        }).get();
      },
      'price': ($) => {
        var current = this.priceCleanup($('div.b-product-info div.b-product-info--price-and-quantity > div.b-product-prices-block > div.b-product-price-current > span.b-product-price-current-number').text());
        var original = this.priceCleanup($('div.b-product-info div.b-product-info--price-and-quantity > div.b-product-prices-block > del.b-product-crossed-out-price').text());

        return {
          current: current,
          original: original,
          discount: this.compileDiscount(current, original),
          currency: 'EUR'
        }
      },
      'description': ($) => {
        return $('dl.b-product-info--info-2').html();
      },
      'vendor': ($) => {
        var descriptionSection = $('dl.b-product-info--info-2');

        if (descriptionSection.length) {
          var vendorHeader = descriptionSection.find('dt.b-product-info--info-3-title').filter(function (index, el) {
            return $(el).text().toLowerCase() === 'Tootja kontaktid'.toLowerCase();
          }).first();

          if (vendorHeader.length) {
            return vendorHeader.next('dd').text();
          }
        }

        return '';
      }
    },
    'translations': ['title', 'description'],
    'required_properties': ['price', 'pictures', 'title']
  };
    
  compileImageHref = (link) => {
    return url.resolve(this.config.index_page, link);
  };

  compileOfferHref = (link) => {
    return url.resolve(this.config.index_page, link);
  };
};

module.exports = BarboraParser;
