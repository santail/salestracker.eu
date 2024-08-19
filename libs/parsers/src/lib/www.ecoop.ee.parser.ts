'use strict';

var _ = require("lodash");
var url = require("url");
var util = require("util");

import AbstractParser, { ParserConfiguration } from "./AbstractParser";

class EcoopParser extends AbstractParser {

  protected override config: ParserConfiguration = {
    'site': 'https://ecoop.ee',
    'has_index_page': false,
    'index_page': 'https://ecoop.ee/api/v1/products?ordering=popularity&has_discount=1',
    'headers': {
      'Host': 'ecoop.ee',
      'Connection': 'keep-alive',
      'Accept': 'application/json',
      'API-LANGUAGE': 'et',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36',
      'X-CSRFToken': '',
      'Referer': 'https://ecoop.ee/et/sooduspakkumised/koik/',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9,et;q=0.8,ru;q=0.7,de;q=0.6,nl;q=0.5,lv;q=0.4',
      'Cookie': '_ga=GA1.2.1297222891.1542037432; _gid=GA1.2.1208371951.1542037432; _fbp=fb.1.1542037431940.778346250; ec_ssid=kmuz6su5amhfh2trjshj9i9a07pyxhyv; coop_cart_status=0'
    },
    'json': true,
    'ttl': 2 * 60 * 60 * 1000,
    'languages': {
      'est': {
        'exists': true,
        'main': true
      },
      'rus': {
        'exists': false,
        'compileHref': (data: any) => {
          return util.format('https://ecoop.ee/ru/produkt/%s/', data.slug_ru);
        }
      }
    },
    'paging': {
      'finite': false,
      'pattern': '&page={paging_pagenumber}'
    },
    'list': data => {
      return data.results;
    },
    'templates': {
      'content': data => {
        return data;
      },
      'title': data => {
        return data.name;
      },
      'pictures': data => {
        return _.map(data.images, (image: { productimage: any; }) => {
          return this.compileImageHref(image.productimage);
        });
      },
      'description': data => {
        return data.usage_instructions;
      },
      'price': data => {
        var current = this.priceCleanup(data.campaigns[0].discounts[0].price);
        var original = this.priceCleanup(data.sell_price);

        return {
          current: current,
          original: original,
          discount: this.compileDiscount(current, original),
          currency: 'EUR'
        }
      },
      'client_card_required': data => {
        return data.campaigns[0].discounts[0].type === 'savingscard_price';
      },
      'vendor': data => {
        return data.meta.producer;
      }
    },
    'translations': ['title', 'description'],
    'required_properties': ['description', 'price', 'pictures', 'title']
  };

  override compileImageHref = (link: any) => {
    return url.resolve(this.config.index_page, link);
  };

  override compileOfferHref = (data: any, language ? : string) => {
    return util.format('https://ecoop.ee/et/toode/%s/', data.slug_et);
  };

  override compilePagingPattern = () => {
    return this.config.index_page + this.config.paging!!.pattern;
  }
}

module.exports = EcoopParser;
