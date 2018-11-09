var config = require('../config/config');

var util = require("util");
var _ = require('underscore')._;
var Mailgun = require('mailgun-js');
var Telegram = require('telegraf/telegram')
var twilio = require('twilio')(config.notifier.twilio.AccountSID, config.notifier.twilio.AuthToken);

var LOG = require('../../lib/services/Logger');
import EmailComposer from './EmailComposer';
import SmsComposer from './SmsComposer';
import TelegramComposer from './TelegramComposer';

export interface Notification {
  criterion: string;
  contacts: {
    email: string;
    phone?: string;
    telegram?: string;
  };
  offers: any[];
}

class Messenger {
  private _TelegramBot;

  constructor() {
    this._TelegramBot = new Telegram(process.env.TELEGRAM_API_TOKEN);
  }

  send(notification: Notification, callback) {
    if (notification.contacts.email) {
      this.sendEmail(notification);
    }
  
    if (notification.contacts.phone) {
      this.sendSms(notification);
    }
  
    if (notification.contacts.telegram) {
      this.sendTelegram(notification);
    }
  
    callback();
  };

  sendEmail(notification: Notification) {
    var email = notification.contacts.email;

    var mailgun = new Mailgun({
      apiKey: config.notifier.mailgun.api_key,
      domain: config.notifier.mailgun.domain
    });
  
    LOG.debug(util.format('[STATUS] [Sending] [email] [%s] Sending email', email));
  
    var data = {
      from: 'notifier-robot@salestracker.eu',
      to: email,
      subject: util.format('Salestracker.eu Found offers notification', ''),
      html: EmailComposer.composeMessage(notification)
    };
  
    mailgun.messages().send(data, function (err) {
      if (err) {
        LOG.error(util.format('[STATUS] [Failure] [%s] Sending email failed', email, err));
        return;
      }
  
      LOG.info(util.format('[STATUS] [OK] [%s] Sending email completed', email));
    });
  };

  sendSms(notification: Notification) {
    var phone = notification.contacts.phone;
  
    LOG.debug(util.format('[STATUS] [Sending] [SMS] [%s] Sending SMS', phone));
  
    twilio.sendMessage({
        to: phone,
        from: config.notifier.twilio.from,
        body: SmsComposer.composeMessage(notification)
      },
      function (err) {
        if (err) {
          LOG.error({
            'message': util.format('[STATUS] [Failed] [SMS] [%s] Sending sms', phone),
            'error': err.message
          });
  
          return;
        }
  
        LOG.info(util.format('[STATUS] [OK] [SMS] [%s] Succesfully sent.', phone));
      });
  };

  sendTelegram(notification: Notification) {
    this._TelegramBot.sendMessage('@goodlooking_test', TelegramComposer.composeMessage(notification), { parse_mode: 'HTML'});
  };
};
  
export default new Messenger();