var _ = require('lodash');
var util = require("util");

import Composer from './Composer';
import { Notification } from './Messenger';


class SmsComposer extends Composer {

    composeMessage(notification: Notification) {
        var body = "";

        _.each(notification.offers, function (offer) {
            body += util.format("%s -%s%\r\nOli %s€, nüüd %s€\r\n%s\r\n\r\n", 
                offer.title, offer.price.discount.percents, 
                offer.price.original, offer.price.current,
                offer.href);
        });

        return body;
    };

}

export default new SmsComposer();