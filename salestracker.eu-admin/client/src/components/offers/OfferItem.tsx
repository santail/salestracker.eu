const _ = require('lodash');
const path = require('path');

import * as React from 'react';
import { ComponentBase } from 'resub';

import { IOffer } from '../../stores/OfferStore';
import BasketStore from '../../stores/BasketStore';
import JobsStore from '../../stores/JobsStore';
import { Carousel } from 'react-bootstrap';

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
            <a href="#" className="btn btn-icon btn-default" onClick={this._onRemoveFromBasket}><i className="fa fa-times"></i></a>
        ) : undefined;

        let pictures = _.map(offer.downloads.pictures, (picture: string, index: number) => {
            return (
                <Carousel.Item key={ 'offer_thumb' + index }>
                    <a href="#" title="" className="caption-title" onClick={this._onAddToBasket}>
                        <img alt="" src={'/img/offers/' + picture} />
                    </a>
                    <Carousel.Caption>
                        <div className="thumb-options">
                            <span>
                                { optionalControls }
                                
                                <a href="#" className="btn btn-icon btn-default" onClick={this._onProcessContent}><i className="fa fa-edit"></i></a>
                                <a href="#" className="btn btn-icon btn-default" onClick={this._onProcessData}><i className="fa fa-th"></i></a>
                                <a href="#" className="btn btn-icon btn-default" onClick={this._onProcessPictures}><i className="fa fa-picture-o"></i></a>
                                <a href="#" className="btn btn-icon btn-default" onClick={this._onProcessCategories}><i className="fa fa-bars"></i></a>
                                <a href="#" className="btn btn-icon btn-default" onClick={this._onProcessIndex}><i className="fa fa-inbox"></i></a>
                            </span>
                        </div>
                    </Carousel.Caption>
                </Carousel.Item>
            );
        });

        let optionalPrice = this._compileOfferPrice(offer);

        return (
            <div className="widget">
                <div className="thumbnail">
                    <Carousel className="thumb">
                        { pictures }
                    </Carousel>
                    <div className="caption">
                        <a href="#" title="" className="caption-title" onClick={this._onAddToBasket}>{offer.title}</a>
                        {optionalPrice}
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

    private _onRemoveFromBasket = (e: React.MouseEvent<HTMLAnchorElement>): void => {
        e.preventDefault();
        e.stopPropagation();

        BasketStore.removeOffer(this.props.offer);
    }

    private _onProcessContent = (e: React.MouseEvent<HTMLAnchorElement>): void => {
        e.preventDefault();
        e.stopPropagation();

        JobsStore.processOfferContent(this.props.offer);
    }

    private _onProcessData = (e: React.MouseEvent<HTMLAnchorElement>): void => {
        e.preventDefault();
        e.stopPropagation();

        JobsStore.processOfferData(this.props.offer);
    }

    private _onProcessPictures = (e: React.MouseEvent<HTMLAnchorElement>): void => {
        e.preventDefault();
        e.stopPropagation();

        const offer = this.props.offer;

        const options = {
            'site': offer.site,
            'origin_href': offer.origin_href
        };

        JobsStore.processOfferPictures(options);
    }

    private _onProcessCategories = (e: React.MouseEvent<HTMLAnchorElement>): void => {
        e.preventDefault();
        e.stopPropagation();

        JobsStore.processOfferCategories(this.props.offer);
    }

    private _onProcessIndex = (e: React.MouseEvent<HTMLAnchorElement>): void => {
        e.preventDefault();
        e.stopPropagation();

        JobsStore.processOfferIndex(this.props.offer);
    }

    private _onAddToBasket = (e: React.MouseEvent<HTMLAnchorElement>): void => {
        e.preventDefault();
        e.stopPropagation();

        BasketStore.addOffer(this.props.offer);

        window.open(this.props.offer.origin_href, '_blank');
    }
}

export = OfferItem;