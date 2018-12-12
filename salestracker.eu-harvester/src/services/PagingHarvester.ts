var util = require("util");

import Crawler from "./Crawler";
import PagingSimple from "./PagingSimple";

var LOG = require("../../lib/services/Logger");
var parserFactory = require("../../lib/services/ParserFactory");


class PagingHarvester {
  public harvestPage = (options, callback) => {
    var parser = parserFactory.getParser(options.site);

    var crawler = new Crawler();
    crawler.request({
      url: options.href,
      json: parser.config.json,
      headers: parser.config.headers,
      payload: options.payload,
      onError: (err) => {
        LOG.error(util.format('[ERROR] [%s] [%s] Harvest page failed', options.site, options.href), err);
        return callback(err);
      },
      onSuccess: (content) => {
        PagingSimple.processPage(content, options)
          .then(() => {
            LOG.info(util.format('[OK] [%s] Offers processing scheduled', options.site));
            return callback();
          })
          .catch(err => {
            LOG.error(util.format('[ERROR] [%s] Offers processing not scheduled', options.site, err));
            return callback(err);
          });
      }
    });
  }
}

export default new PagingHarvester();