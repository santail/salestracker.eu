const util = require('util');

import LOG from "../lib/services/Logger";
import SessionFactory from '../lib/services/SessionFactory';

import Messenger, { Notification } from './services/Messenger';


const worker = SessionFactory.getQueueConnection();

worker.process('sendNotification', 10, function (job, done) {
    const data = job.data;

    const wish = data.wish;
    const offers = data.offers;

    if (!wish.contacts) {
        LOG.info(util.format('[OK] No contacts. Notification not sent.'));
        return done();
    }

    let notification: Notification = {
        criterion: wish.content,
        contacts: {
            email: wish.contacts.email,
            phone: wish.contacts.phone
        },
        offers: offers
    };

    if (wish.contacts.telegram) {
        notification.contacts.telegram = wish.contacts.telegram;
    }

    Messenger.send(notification, function (err) {
        if (err) {
            LOG.error(util.format('[ERROR] Notification failed', err));
            return done(err);
        }
    
        LOG.info(util.format('[OK] Notification sent'));
        return done();
    });
});
