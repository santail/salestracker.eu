'use strict';

var kue = require('kue-scheduler');
var mongojs = require('mongojs');

var LOG = require("./Logger");

let MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/salestracker-dev';
let REDIS_ADDR = process.env.REDIS_ADDR || 'redis://127.0.0.1:6379';

function Sessionfactory() {
  this.db = mongojs(MONGODB_URI, ["offers", "sites", "wishes"]);

  this.worker = kue.createQueue({
    redis: REDIS_ADDR,
    restore: true,
    worker: true
  });

  this.scheduler = kue.createQueue({
    redis: REDIS_ADDR,
    restore: true,
    worker: false
  });
}

Sessionfactory.prototype.getDbConnection = function () {
  return this.db;
};

Sessionfactory.prototype.getQueueConnection = function () {
  return this.worker;
};

Sessionfactory.prototype.getSchedulerConnection = function () {
  return this.scheduler;
};

module.exports = new Sessionfactory();