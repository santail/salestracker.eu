import WorkerService from "./WorkerService";

var _ = require('lodash');
var fs = require('fs-extra');
var path = require('path');
var request = require('request-promise');
var slugify = require('slugify');
const { URL } = require('url');
var util = require("util");

const readdir = util.promisify(fs.readdir)
const writeFile = util.promisify(fs.writeFile)

var LOG = require("../../lib/services/Logger");


class ImageHarvester {

    public harvestImage = (options) => {
        return new Promise((fulfill, reject) => {
            request({
                url: options.picture_href,
                encoding: 'binary',
                resolveWithFullResponse: true,
                simple: false 
            })
            .then(res => {
                if (res.body && res.statusCode === 200) {
                    fs.ensureDir(options.picture_path, '0777', (err) => {
                        if (err) {
                            if (err.code == 'EEXIST') {
                                // do nothing 
                            }
                        }

                        let picturePath = path.join(options.picture_path, path.basename(options.picture_href));

                        if (options.site === 'www.barbora.ee') {
                            picturePath = picturePath.replace('GetInventoryImage?id=', '') + '.jpg';
                        }

                        picturePath = encodeURI(picturePath);
        
                        writeFile(picturePath, res.body, 'binary')
                            .then(() => {
                                return WorkerService.scheduleImageProcessing({
                                    site: options.site,
                                    href: options.picture_href,
                                    origin_href: options.origin_href,
                                    picture_path: picturePath
                                });
                            })
                            .then(() => {
                                return fulfill();
                            })
                            .catch(err => {
                                LOG.error(util.format('[ERROR] [%s] Image storing failed %s', options.site, options.picture_href, err));
                                return reject(err);
                            });
                    });
                } 
                else if (res.statusCode === 404) {
                    LOG.error(util.format('[ERROR] [%s] Image was not found %s', options.site, options.picture_href));
                    return fulfill(); // no image found, just log and complete job
                } 
                else {
                    return reject();
                }
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] [%s] Image retrieving failed %s', options.site, options.picture_href));
                return reject(err);
            });
        });
    };

    public cleanUploadedImages = (site) => {
        var uploadsPath = path.join(process.cwd(), './uploads/offers/' + site);

        readdir(uploadsPath)
            .then(files => {
                if (files.length !== 0) {
                    _.each(files, function (file) {
                        var filePath = uploadsPath + file;
                        fs.stat(filePath, function (err, stats) {
                            if (err) {
                                LOG.error(util.format('[ERROR] Error reading uploaded file', err));
                            } else {
                                if (stats.isFile()) {
                                    fs.unlink(filePath, function (err) {
                                        if (err) {
                                            LOG.error(util.format('[ERROR] Error deleting uploaded file', err));
                                        }
                                    });
                                }
                            }
                        });
                    });
                }
            })
            .catch(err => {
                LOG.error(util.format('[ERROR] Error reading uploads directory', err));
            });
    };
}

export default new ImageHarvester();