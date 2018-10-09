
import { autoSubscribe, AutoSubscribeStore, StoreBase } from 'resub';

export interface User {
    name: string;
    username: string;
    email: string;
    image: string;
}

@AutoSubscribeStore
export class WishStore extends StoreBase {

    private _formData: string = '';
    private _users: User[] = [];

    @autoSubscribe
    getFormData(): string {
        return this._formData;
    }

    @autoSubscribe
    getUsers(): User[] {
        return this._users;
    }

    setFormData(data: FormData) {
        const result = {};
          for (let key of data.keys()) {
            result[key] = data.get(key);
        }
        
        this._formData = JSON.stringify(result, null, 2);

        this.trigger();
    }

    setUsers(users: User[]) {
        this._users = users;

        this.trigger();
    }
}

export default new WishStore();
