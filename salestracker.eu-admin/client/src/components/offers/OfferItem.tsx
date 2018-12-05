const path = require('path');

import * as React from 'react';
import { ComponentBase } from 'resub';

import { IOffer } from '../../stores/OfferStore';
import BasketStore from '../../stores/BasketStore';

interface OfferItemProps extends React.Props<any> {
    offer: IOffer;
}

interface OfferItemState {
    offerInBasket: boolean;
}

class OfferItem extends ComponentBase<OfferItemProps, OfferItemState> {
    protected _buildState(props: OfferItemProps, initialBuild: boolean): Partial<OfferItemState> {
        return {
            offerInBasket: BasketStore.checkBasketContainsOffer(props.offer)
        };
    }

    render() {
        const offer = this.props.offer;

        const optionalControls = this.state.offerInBasket ? (
            <div className="thumb-options">
                <span>
                    <a href="#" className="btn btn-icon btn-default" onClick={this._onRemoveFromBasket}><i className="fa fa-times"></i></a>
                </span>
            </div>
        ) : undefined;

        let optionalImage = offer.downloads && offer.downloads.pictures ? (
            <a href="#" title="" className="caption-title" onClick={this._onAddToBasket}>
                <img alt="" src={ '/img/offers/' + offer.downloads.pictures[0] } />
            </a>
        ) : undefined;

        let optionalPrice = this._compileOfferPrice(offer);

        return (
            <div className="widget">
                <div className="thumbnail">
                    <div className="thumb">
                        { optionalImage }
                        { optionalControls }
                    </div>
                    <div className="caption">
                        <a href="#" title="" className="caption-title" onClick={this._onAddToBasket}>{offer.title}</a>
                        { optionalPrice }
                    </div>
                </div>
            </div>
        );
    }

    private _compileOfferPrice = (offer: IOffer) => {
        let price = '';

        if (offer.price) {
            if (offer.price.current) {
                price += offer.price.current;
            }
            
            if (offer.price.original) {
                price += " " + offer.price.original;
            }

            if (offer.price.discount) {
                if (offer.price.discount.amount) {
                    price += " " + offer.price.discount.amount;
                }

                if (offer.price.discount.percents) {
                    price += " " + offer.price.discount.percents + '%';
                }
            }
        }

        return price;
    }

    private _onRemoveFromBasket = (event: React.MouseEvent<HTMLAnchorElement>): void => {
        BasketStore.removeOffer(this.props.offer);

        event.preventDefault();
        event.stopPropagation();
    }

    private _onAddToBasket = (event: React.MouseEvent<HTMLAnchorElement>): void => {
        BasketStore.addOffer(this.props.offer);

        window.open(this.props.offer.origin_href, '_blank');

        event.preventDefault();
        event.stopPropagation();
    }
}

export = OfferItem;