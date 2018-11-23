var util = require('util');

var LOG = require("../../lib/services/Logger");

class ImageProcessor {

    process(data, done) {
        LOG.info(util.format('[OK] [%s] Image processed %s', data.site, data.href));

        return done();
    }
}

export default new ImageProcessor();