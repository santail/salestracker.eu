
const axios = require('axios');

import WishStore, { User } from '../stores/WishStore';

class WishService {

    saveWish(data: FormData): void {
        axios
            .post('api/wishes', {
                content: data.get('content'),
                phone: data.get('phone'),
                email: data.get('email'),
            })
            .then(function (response) {
                //handle success
                console.log(response);
            })
            .catch(function (response) {
                //handle error
                console.log(response);
            });

        WishStore.setFormData(data);
    };

    loadWishes() {
        axios
            .get("https://randomuser.me/api/?results=5")
            .then(response => 
                response.data.results.map(data => {
                    let user: User = {
                        name: `${data.name.first} ${data.name.last}`,
                        username: `${data.login.username}`,
                        email: `${data.email}`,
                        image: `${data.picture.thumbnail}`
                    };

                    return user;
                })
            )
            .then(users => {
                WishStore.setUsers(users);
            })
            .catch(errors => {

            });
    }
}

export default new WishService();
