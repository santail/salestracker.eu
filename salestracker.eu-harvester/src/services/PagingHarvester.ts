const util = require("util");

import LOG from "../../lib/services/Logger";
import ParserFactory from '../../lib/services/ParserFactory';

import Crawler from "./Crawler";
import PagingSimple from "./PagingSimple";


class PagingHarvester {
  public harvestPage = (options) => {
    const parser = ParserFactory.getParser(options.site);

    LOG.info(util.format('[OK] [%s] [%s] Paging page harvesting started', options.site, options.href));

    const crawler = new Crawler();

    return new Promise((resolve, reject) => {
      crawler.request({
        url: options.href,
        json: parser.config.json,
        headers: parser.config.headers,
        payload: options.payload,
        onError: err => {
          LOG.error(util.format('[ERROR] [%s] [%s] Harvest page failed', options.site, options.href, err));
          return reject(err);
        },
        onSuccess: (content) => {
          return PagingSimple.processPage(content, options)
            .then(() => {
              LOG.info(util.format('[OK] [%s] [%s] Offers processing scheduled', options.site, options.href));
              return resolve();
            })
            .catch(err => {
              LOG.error(util.format('[ERROR] [%s] [%s] Offers processing not scheduled', options.site, options.href, err));
              return reject(err);
            });
        }
      });
    });
  }
}

export default new PagingHarvester();