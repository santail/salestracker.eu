import _ from "lodash";
import fs from "fs-extra";
import path from "path";
import request from "request-promise";
import util from "util";

const readdir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);

import LOG from "../../lib/services/Logger";

import WorkerService from "./WorkerService";


class ImageHarvester {

    public harvestImage = (options) => {
        return new Promise((fulfill, reject) => {

            fs.open(options.picture_path, 'wx', (err) => {
                if (err) {
                    if (err.code === 'EEXIST') {
                        LOG.info(util.format('[OK] [%s] [%s] [%s] Image already stored. Skipping', options.site, options.picture_href, options.picture_path));
                        return fulfill();
                    }
                }

                LOG.info(util.format('[OK] [%s] [%s] Downloading image', options.site, options.picture_href));

                request({
                    url: encodeURI(options.picture_href),
                    encoding: 'binary',
                    resolveWithFullResponse: true,
                    simple: false
                })
                    .then(res => {
                        if (res.body && res.statusCode === 200) {
                            fs.ensureDir(path.dirname(options.picture_path), '0777', (err) => {
                                if (err) {
                                    if (err.code == 'EEXIST') {
                                        // do nothing 
                                    }
                                }

                                LOG.info(util.format('[OK] [%s] [%s] Storing image', options.site, options.picture_href, options.picture_path));

                                writeFile(options.picture_path, res.body, 'binary')
                                    .then(() => {
                                        return WorkerService.scheduleImageProcessing({
                                            site: options.site,
                                            href: options.picture_href,
                                            origin_href: options.origin_href,
                                            picture_path: options.picture_path
                                        });
                                    })
                                    .then(() => {
                                        LOG.info(util.format('[OK] [%s] [%s] Storing image succeeded', options.site, options.picture_href, options.picture_path));
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

        });
    };

    public cleanUploadedImages = (site) => {
        const uploadsPath = path.join(process.cwd(), './uploads/offers/' + site);

        readdir(uploadsPath)
            .then(files => {
                if (files.length !== 0) {
                    _.each(files, function (file) {
                        const filePath = uploadsPath + file;

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