const path = require('path');
const sharp = require('sharp');
const util = require('util');

import LOG from "../../lib/services/Logger";
import SessionFactory from '../../lib/services/SessionFactory';


class ImageProcessor {

    process(options) {
        LOG.info(util.format('[OK] [%s] [%s] [%s] Offer image processing started', options.site, options.origin_href, options.href));

        return new Promise((resolve, reject) => {
            SessionFactory.getDbConnection().offers.findOne({
                origin_href: options.origin_href
            }, (err, foundOffer) => {
                if (err) {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] Offer image processing failed. Offer not found.', options.site, options.origin_href, options.href, err));
                    return reject(err);
                }

                if (!foundOffer) {
                    // TODO Mark somehow failed offer and re-run harvesting
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] Offer image processing failed. Offer not found.', options.site, options.origin_href, options.href));
                    return reject(new Error('Offer not found for update: ' + options.origin_href));
                }

                return Promise.all([
                    this._resizeImage(options, 100, 100),
                    this._resizeImage(options, 200, 200)
                ])
                .then(() => {
                    LOG.info(util.format('[OK] [%s] [%s] [%s] Offer image processed. ', options.site, options.origin_href, options.href));
                    return resolve();
                })
                .catch(err => {
                    LOG.error(util.format('[ERROR] [%s] [%s] [%s] Offer image processing failed.', options.site, options.origin_href, options.href, err));
                    return reject(err);
                });
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
                    options.site, options.picture_path, util.format('%dx%d', height, width), destinationPath, err));
            });
    }
}

export default new ImageProcessor();