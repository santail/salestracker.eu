const _ = require('lodash');
const util = require("util");

import Composer from './Composer';
import { Notification } from './Messenger';


class SmsComposer extends Composer {

    composeMessage(notification: Notification) {
        let content = "<h1>SalesTracker.eu has found something</h1> what could be potentially interesting to you";

        content += util.format("<h2>You have been searching for <i>'%s'</i></h2>", notification.criterion);
      
        _.each(notification.offers, function (offer) {
          let details = '';
      
          if (offer.vendor) {
            details += util.format('<span>%s</span>', offer.vendor);
          }
      
          details += util.format('&nbsp;<span style="text: bold;">%s</span>', offer.price.current);
      
          if (offer.price.current) {
           details += util.format('&nbsp;<span style="text-decoration: line-through;">%s</span>', offer.price.original);
          }
      
          if (offer.discount) {
           details += util.format('&nbsp;<span>%s</span>', offer.discount.amount);
          }
      
          if (offer.description) {
            details += util.format('<br /><span>%s</span>',  offer.description);
          }
      
          content += util.format('<p><a href="%s" title="%s" />%s</a>&nbsp;%s</p>', 
            offer.href, offer.title, offer.title, details);
        });
      
        return '<table border="0" cellpadding="0" cellspacing="0" style="margin:0; padding:0" width="100%">' +
        '<tr>' +
        '<td align="center">' +
        '<center style="max-width: 600px; width: 100%;">' +
        '<!--[if gte mso 9]>' +
        '<table border="0" cellpadding="0" cellspacing="0" style="margin:0; padding:0">' +
        '<tr>' +
        '<td>' +
        '<![endif]-->' +
        '<table border="0" cellpadding="0" cellspacing="0" style="margin:0; padding:0" width="100%">' +
          '<tr>' +
            '<td>' +
              '<!--[if gte mso 9]>' +
              '<table border="0" cellpadding="0" cellspacing="0">' +
                '<tr>' +
                  '<td align="center">' +
                    '<table border="0" cellpadding="0" cellspacing="0" width="600" align="center">' +
                      '<tr>' +
                        '<td>' +
                        '<![endif]-->' +
                          '<!-- Блок номер 1 -->' +
                          '<span style="display:inline-block; width:600px;">' + content + '</span>' +
                          '<!-- Блок номер 1 -->' +
                        '<!--[if gte mso 9]>' +
                        '</td>' +
                      '</tr>' +
                    '</table>' +
                  '</td>' +
                  /*
                  '<td align="center">' +
                    '<table border="0" cellpadding="0" cellspacing="0" align="center">' +
                      '<tr>' +
                        '<td>' +
                        '<![endif]-->' +
                          '<!-- Блок номер 2 -->' +
                          '<span style="display:inline-block; width:300px;">' + 'Контент блока' + '</span>' +
                          '<!-- Блок номер 2 -->' +
                        '<!--[if gte mso 9]>' +
                        '</td>' +
                      '</tr>' +
                    '</table>' +
                  '</td>' +
                  */
                '</tr>' +
              '</table>' +
              '<![endif]-->' +
            '</td>' +
          '</tr>' +
        '</table>' +
        '<!--[if gte mso 9]>' +
        '</td>' +
        '</tr>' +
        '</table>' +
        '<![endif]-->' +
        '</center>' +
        '</td>' +
        '</tr>' +
        '</table>';
    };

}

export default new SmsComposer();