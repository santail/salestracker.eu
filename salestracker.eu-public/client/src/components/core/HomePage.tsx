const _ = require('lodash');

import * as React from 'react';
import { FormEvent } from 'react';
import { ComponentBase } from 'resub';

import OfferService from '../../services/OfferService';
import WishService from '../../services/WishService';
import OfferStore, { Offer } from '../../stores/OfferStore';
import WishStore, { User } from '../../stores/WishStore';

interface HomePageProps extends React.Props<any> {
}

interface HomePageState {
  users: User[],
  offers: Offer[],
  loading: boolean;
  res: string;
  errors: any[];
}

class HomePage extends ComponentBase<HomePageProps, HomePageState> {

  protected _buildState(props: HomePageProps, initialBuild: boolean): Partial<HomePageState> {
    return {
        res: WishStore.getFormData(),
        users: WishStore.getUsers(),
        offers: OfferStore.getOffers()
    }
  }

  render() {
    return (
    	<div>
            <p>Пожалуйста когда появятся скидки на пылесос, сообщите мне на электронную почту и на телефон. Я буду ждать 3 недели.</p>
            
            <form onSubmit={this._onFormSubmit}>
                <label htmlFor="content">Contains</label>
                <input id="content" name="content" type="text" />

                <label htmlFor="email">Enter your email</label>
                <input id="email" name="email" type="email" />

                <label htmlFor="phone">Enter your phone number</label>
                <input id="phone" name="phone" type="text" />

                <button>Send data!</button>
            </form>
            
            {this.state.res && (
                <div className="res-block">
                <h3>Data to be sent:</h3>
                <pre>FormData {this.state.res}</pre>
                </div>
            )}

            <div>
                {!this.state.loading ? (
                    this.state.users.map(user => {
                        const { username, name, email, image } = user;
                        return (
                            <div key={username}>
                                <p>{name}</p>
                                <div>
                                <img src={image} alt={name} />
                                </div>
                                <p>{email}</p>
                                <hr />
                            </div>
                        );
                    })
                ) : (
                    <p>Loading...</p>
                )}
            </div>
    	</div>
    );
  }
  
    componentDidMount() {
        OfferService.loadOffers();
    }

    private _onFormSubmit = (e: FormEvent < HTMLFormElement > ): void => {
        e.preventDefault();

        const data = new FormData(e.currentTarget);

        WishService.saveWish(data);
        WishService.loadWishes();
    }
}

export = HomePage;