const path = require('path');
const sharp = require('sharp');
var util = require('util');

var LOG = require("../../lib/services/Logger");
var SessionFactory = require('../../lib/services/SessionFactory');

class ImageProcessor {

    process(options, callback) {
        LOG.info(util.format('[OK] [%s] [%s] [%s] Offer image processing started', options.site, options.origin_href, options.href));

        SessionFactory.getDbConnection().offers.findOne({
            origin_href: options.origin_href
        }, (err, foundOffer) => {
            if (err) {
                LOG.error(util.format('[ERROR] [%s] [%s] [%s] Offer image processing failed. Offer not found.', options.site, options.origin_href, options.href), err);
                return callback(err);
            }

            if (!foundOffer) {
                // TODO Mark somehow failed offer and re-run harvesting
                LOG.error(util.format('[ERROR] [%s] [%s] [%s] Offer image processing failed. Offer not found.', options.site, options.origin_href, options.href));
                return callback(new Error('Offer not found for update: ' + options.origin_href));
            }

            let downloads = foundOffer.downloads || {
                pictures: []
            };

            downloads.pictures.push(options.picture_path.replace(path.join(process.cwd(), './uploads/offers/'), ''));

            Promise.all([
                this._resizeImage(options, 100, 100),
                this._resizeImage(options, 200, 200)
            ])
                .then(() => {
                    LOG.info(util.format('[OK] [%s] [%s] [%s] Offer image processed. Updating offer.', options.site, options.origin_href, options.href));

                    SessionFactory.getDbConnection().offers.update({
                        origin_href: options.origin_href
                    }, {
                        $set: {
                            downloads: downloads
                        }
                    }, function (err) {
                        if (err) {
                            LOG.error(util.format('[ERROR] [%s] [%s] [%s] Offer update failed', options.site, options.origin_href, options.href), err);
                            return callback(err);
                        }

                        LOG.info(util.format('[OK] [%s] [%s] [%s] Offer updated with newly downloaded pictures.', options.site, options.origin_href, options.href));

                        return callback();
                    });
                })
                .catch(err => {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] Offer image processing failed.', options.site, options.origin_href, options.href), err);
                    return callback(new Error('Offer processing failed: ' + options.origin_href + ' ' + options.href));
                });
        });
    }

    private _resizeImage(options, height, width) {
        LOG.info(util.format('[OK] [%s] [%s] [%s] Resizing image.', options.site, options.picture_path, util.format('%dx%d', height, width)));

        const source = options.picture_path;
        const parsedPath = path.parse(source);

        const destinationPath = path.format({
            dir: parsedPath.dir,
            name: parsedPath.name + util.format('_%dx%d', height, width),
            ext: '.png'
        });

        return sharp(source)
            .resize(height, width, {
                fit: sharp.fit.inside,
                withoutEnlargement: true
            })
            .toFormat('png')
            .toFile(destinationPath)
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] [%s] [%s] [%s] Offer image processing failed.', 
                    options.site, options.picture_path, util.format('%dx%d', height, width), destinationPath), err);
            });
    }
};

export default new ImageProcessor();