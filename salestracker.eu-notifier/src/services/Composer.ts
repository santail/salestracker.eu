
import { Notification } from './Messenger';

abstract class Composer {
    abstract composeMessage(notification: Notification);
}

export default Composer;