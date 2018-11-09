var _ = require('lodash');
var util = require("util");

import Composer from './Composer';
import { Notification } from './Messenger';


class SmsComposer extends Composer {

    composeMessage(notification: Notification) {
        var message = '';

        _.each(notification.offers, function (offer) {
          message += util.format("<a href='%s'>%s</a> %s %s%\r\n\r\n", 
            offer.href, 
            offer.title, 
            offer.price.current, 
            offer.price.discount.percents);
        });
      
        return message;
    };

}

export default new SmsComposer();