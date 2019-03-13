const config = require('../config/config');

const util = require("util");
const Mailgun = require('mailgun-js');
const Telegram = require('telegraf/telegram')
const twilio = require('twilio')(config.notifier.twilio.AccountSID, config.notifier.twilio.AuthToken);

import LOG from "../../lib/services/Logger";


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
    const email = notification.contacts.email;

    const mailgun = new Mailgun({
      apiKey: config.notifier.mailgun.api_key,
      domain: config.notifier.mailgun.domain
    });
  
    LOG.debug(util.format('[Sending] [email] [%s] Sending email', email));
  
    const data = {
      from: 'notifier-robot@salestracker.eu',
      to: email,
      subject: util.format('Salestracker.eu Found offers notification', ''),
      html: EmailComposer.composeMessage(notification)
    };
  
    mailgun.messages().send(data, function (err) {
      if (err) {
        LOG.error(util.format('[ERROR] [%s] Sending email failed', email, err));
        return;
      }
  
      LOG.info(util.format('[OK] [%s] Sending email completed', email));
    });
  };

  sendSms(notification: Notification) {
    const phone = notification.contacts.phone;
  
    LOG.debug(util.format('[Sending] [SMS] [%s] Sending SMS', phone));
  
    twilio.sendMessage({
        to: phone,
        from: config.notifier.twilio.from,
        body: SmsComposer.composeMessage(notification)
      },
      function (err) {
        if (err) {
          LOG.error({
            'message': util.format('[ERROR] [SMS] [%s] Sending sms', phone),
            'error': err.message
          });
  
          return;
        }
  
        LOG.info(util.format('[OK] [SMS] [%s] Succesfully sent.', phone));
      });
  };

  sendTelegram(notification: Notification) {
    this._TelegramBot.sendMessage('@goodlooking_test', TelegramComposer.composeMessage(notification), { parse_mode: 'HTML'});
  };
}
  
export default new Messenger();