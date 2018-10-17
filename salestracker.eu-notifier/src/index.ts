var util = require('util');

var LOG = require('../lib/services/Logger');
var SessionFactory = require('../lib/services/SessionFactory');

var Messenger = require('./services/Messenger');


var worker = SessionFactory.getQueueConnection();

worker.process('sendNotification', 10, function (job, done) {
    var data = job.data;

    const wish = data.wish;
    const offers = data.offers;

    let notification = {
        email: wish.contacts.email,
        phone: wish.contacts.phone,
        contains: wish.content,
        offers: offers
    };

    Messenger.send(notification, function (err) {
        if (err) {
            LOG.error(util.format('[STATUS] [Failure] Notification failed', err));
            return done(err);
        }
    
        LOG.info(util.format('[STATUS] [OK] Notification sent'));
        return done();
    });

})
