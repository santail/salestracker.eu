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
                url: options.href,
                encoding: 'binary',
                resolveWithFullResponse: true,
                simple: false 
            })
            .then(res => {
                if (res.body && res.statusCode === 200) {
                    const offerHref = new URL(options.offerHref);
                    options.dest = path.join(process.cwd(), './uploads/offers/' + options.site + '/' + slugify(offerHref.pathname));

                    fs.ensureDir(options.dest, '0777', (err) => {
                        if (err) {
                            if (err.code == 'EEXIST') {
                                // do nothing 
                            }
                        }

                        options.dest = path.join(options.dest, path.basename(options.href));

                        return writeFile(options.dest, res.body, 'binary')
                            .then(() => {
                                WorkerService.scheduleImageProcessing({
                                    site: options.site,
                                    dest: options.dest
                                }, fulfill)
                            })
                            .catch(err => {
                                LOG.error(util.format('[STATUS] [Failure] [%s] Image storing failed %s', options.site, options.href, err));
                                return reject(err);
                            });
                    });
                } 
                else if (res.statusCode === 404) {
                    LOG.error(util.format('[STATUS] [Failure] [%s] Image was not found %s', options.site, options.href));
                    return fulfill(); // no image found, just log and complete job
                } 
            })
            .catch(err => {
                LOG.error(util.format('[STATUS] [Failure] [%s] Image retrieving failed %s', options.site, options.href));
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
                                LOG.error(util.format('[STATUS] [FAILED] Error reading uploaded file', err));
                            } else {
                                if (stats.isFile()) {
                                    fs.unlink(filePath, function (err) {
                                        if (err) {
                                            LOG.error(util.format('[STATUS] [FAILED] Error deleting uploaded file', err));
                                        }
                                    });
                                }
                            }
                        });
                    });
                }
            })
            .catch(err => {
                LOG.error(util.format('[STATUS] [FAILED] Error reading uploads directory', err));
            });
    };
}

export default new ImageHarvester();