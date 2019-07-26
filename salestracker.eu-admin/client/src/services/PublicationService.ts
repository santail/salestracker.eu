const _ = require('lodash');

import { IBundle } from "../stores/BundlesStore";

export class PublicationService {

    publicateBundle(bundle: IBundle) {
        const promises = _.map(bundle.items, item => {
            return fetch(`/api/jobs/publicate/bundle`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(item)
            })
            .then((response) => response.json())
            .then((responseJson) => {
                
            })
            .catch((error) => {
                console.error(error);
            });
        });

        Promise.all(promises)
            .then(() => {
                console.log('Bundle publicated');
            })
            .catch(err => {
                console.log('Bundle publication failed', err);
            });
    }
}

export default new PublicationService();
