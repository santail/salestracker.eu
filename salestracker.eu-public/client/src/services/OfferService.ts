
import OfferStore, { Offer } from '../stores/OfferStore';

class OfferService {

    loadOffers() {
        fetch('/api/offers')
            .then(res => res.json())
            .then(response => 
                response.data.results.map(data => {
                    let offer: Offer = {
                        name: `${data.name}`
                    };

                    return offer;
                })
            )
            .then(offers => {
                OfferStore.setOffers(offers);
            })
            .catch(err => {

            })
    }
}

export default new OfferService();
