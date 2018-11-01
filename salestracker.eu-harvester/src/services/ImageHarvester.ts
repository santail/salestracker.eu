var _ = require('lodash');
var fs = require('fs-extra');
var path = require('path');
var request = require('request');
var slugify = require('slugify');
const { URL } = require('url');
var util = require("util");

var LOG = require("../../lib/services/Logger");


class ImageHarvester {

    public processImage = (options, callback) => {
        request({
            url: options.href,
            encoding: 'binary'
          }, (err, res, body) => {
            if (err) {
              LOG.error(util.format('[STATUS] [Failure] [%s] Image processing failed %s', options.site, options.href, err));
              return callback(err);
            }
        
            if (body && res.statusCode === 200) {
              const offerHref = new URL(options.offerHref);
              options.dest = path.join(process.cwd(), './uploads/offers/' + options.site + '/' + slugify(offerHref.pathname));
        
              fs.ensureDir(options.dest, '0777', (err) => {
                if (err) {
                  if (err.code == 'EEXIST') {
                    // do nothing 
                  }
                }
        
                options.dest = path.join(options.dest, path.basename(options.href));
        
                fs.writeFile(options.dest, body, 'binary', (err) => {
                  if (err) {
                    LOG.error(util.format('[STATUS] [Failure] [%s] Image storing failed %s', options.site, options.href, err));
                    return callback(err);
                  }
        
                  return callback(null);
                });
              });
            } else {
              if (!body) {
                LOG.error(util.format('[STATUS] [Failure] [%s] Image retrieving failed %s', options.site, options.href, err));
                return callback(new Error(`Image loading error - empty body. URL: ${options.href}`));
              }
        
              return callback(new Error(`Image loading error - server responded ${res.statusCode}`));
            }
          });
    };

    public cleanUploadedImages = (site) => {
        var uploadsPath = path.join(process.cwd(), './uploads/offers/' + site);
      
        fs.readdir(uploadsPath, function (err, files) {
            if (err) {
                LOG.error(util.format('[STATUS] [FAILED] Error reading uploads directory', err));
            } else {
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
            }
        });
      };
}

export default new ImageHarvester();