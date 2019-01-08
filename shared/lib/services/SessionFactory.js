'use strict';

var elasticsearch = require('elasticsearch');
var kue = require('kue-scheduler');
var mongojs = require('mongojs');

function Sessionfactory() {
  this.db = mongojs(process.env.MONGODB_URI, [
    "offers", "sites", "wishes"
  ]);

  this.worker = kue.createQueue({
    redis: process.env.REDIS_ADDR,
    restore: true,
    worker: true
  });

  this.scheduler = kue.createQueue({
    redis: process.env.REDIS_ADDR,
    restore: true,
    worker: false
  });

  this.elastic = new elasticsearch.Client({
    host: process.env.ELASTICSEARCH_URL,
    log: 'error'
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

Sessionfactory.prototype.getElasticsearchConnection = function () {
  return this.elastic;
};

module.exports = new Sessionfactory();