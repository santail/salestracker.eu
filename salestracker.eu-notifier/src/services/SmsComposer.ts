var _ = require('lodash');
var util = require("util");

import Composer from './Composer';
import { Notification } from './Messenger';


class SmsComposer extends Composer {

    composeMessage(notification: Notification) {
        var body = "";

        _.each(notification.offers, function (offer) {
            body += util.format("%s %s: %s%\r\n\r\n", offer.translations.est.title, offer.price.current, offer.price.discount.percents);
        });

        return body;
    };

}

export default new SmsComposer();