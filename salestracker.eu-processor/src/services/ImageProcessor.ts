var _ = require('lodash');
var path = require('path');
var util = require('util');

var LOG = require("../../lib/services/Logger");
var SessionFactory = require('../../lib/services/SessionFactory');

class ImageProcessor {

    process(options, callback) {
        LOG.info(util.format('[OK] [%s] Offer image processing started %s', options.site, options.href));

        SessionFactory.getDbConnection().offers.findOne({
            origin_href: options.origin_href
        }, (err, foundOffer) => {
            if (err) {
                LOG.error(util.format('[ERROR] Checking offer failed', err));
                return callback(err);
            }

            if (!foundOffer) {
                // TODO Mark somehow failed offer and re-run harvesting
                LOG.error(util.format('[ERROR] Offer image processing failed. Offer not found %', options.href));
                return callback(new Error('Offer not found for update: ' + options.href));
            }

            let downloads = foundOffer.downloads || { pictures: [] };
            downloads.pictures.push(options.picture_path.replace(path.join(process.cwd(), './uploads/offers/'), ''));

            SessionFactory.getDbConnection().offers.update({
                origin_href: options.origin_href
            }, {
                $set: {
                    downloads: downloads
                }
            }, function (err) {
                if (err) {
                    LOG.error(util.format('[ERROR] [%s] [%s] Offer image processing failed', options.site, options.href, err));
                    return callback(err);
                }

                return callback();
            });
        });
    }
};

export default new ImageProcessor();