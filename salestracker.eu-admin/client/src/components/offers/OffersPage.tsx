import _ = require('lodash');
import * as React from 'react';
import { InputGroup, Tabs, Tab, FormGroup, FormControl, FormControlProps } from 'react-bootstrap';
import ReactPaginate from 'react-paginate';
import { ComponentBase } from 'resub';

import OfferStore, { IOffer } from '../../stores/OfferStore';

import OfferItem = require('./OfferItem');
import JobsStore from '../../stores/JobsStore';

interface OffersPageProps extends React.Props<any> {
}

interface OffersPageState {
    offers: IOffer[];
    total: number;
    activePage: number;
    pageSize: number;
    filter?: string | number | string[];
    site?: string;
    category?: string;
    pagesTotal: number;
}

class OffersPage extends ComponentBase<OffersPageProps, OffersPageState> {

    protected _buildState(props: OffersPageProps, initialBuild: boolean): Partial<OffersPageState> {
        const offersWithPaging = OfferStore.getOffersWithPaging();
        const paging = offersWithPaging.paging;

        let newState: OffersPageState = {
            offers: offersWithPaging.offers,
            total: offersWithPaging.total,
            activePage: paging.activePage,
            pageSize: paging.pageSize,
            pagesTotal: paging.pagesTotal,
        };

        if (initialBuild) {
            newState.activePage = 0;
        }

        return newState;
    }

    render() {
        let widgetsRows: JSX.Element[] = [];
        let offerWidgets: JSX.Element[] = [];

        this.state.offers.map((offer, i) => {
            offerWidgets.push(
                <div className="col-lg-3 col-md-6 col-sm-6" key={'offer-widget_' + i}>
                    <OfferItem key={i} offer={offer} />
                </div>
            );

            if (i !== 0 && (i + 1) % 4 === 0) {
                widgetsRows.push(
                    <div className="row" key={'offer-widgets-row_' + i}>
                        {offerWidgets}
                    </div>
                );

                offerWidgets = [];
            }
        });

        widgetsRows.push(
            <div className="row" key={'offer-widgets-row_last'}>
                {offerWidgets}
            </div>
        );

        return (
            <div className="page-content">
                <div className="page-title">
                    <h5><i className="fa fa-picture-o"></i> Товары <small>Список найденых товаров</small></h5>
                </div>

                <ul className="row stats">
                    <li className="col-xs-3"><a href="#" className="btn btn-default">{this.state.total}</a> <span>товаров найдено</span></li>
                    <li className="col-xs-3">
                        <button className="btn btn-sm btn-info" type="button" onClick={ this._onProcessSite }><i className="fa fa-tasks"></i> Harvest site</button>
                        <button className="btn btn-sm btn-info" type="button" onClick={ this._onProcessPictures }><i className="fa fa-tasks"></i> Harvest pictures</button>
                        <button className="btn btn-sm btn-info" type="button" onClick={ this._onProcessPicturesStop }><i className="fa fa-tasks"></i> Stop harvest pictures</button>
                    </li>
                </ul>

                <FormGroup>
                    <InputGroup>
                        <InputGroup.Addon>@</InputGroup.Addon>
                        <FormControl type="text" onChange={ this._onFilterChange } value={this.state.filter} />
                    </InputGroup>
                </FormGroup>
                
                <div className="row paging">
                    <div className="col-md-2">
                        <select className="form-control" value={this.state.site} onChange={this._onSiteChange}>
                            <option value="">All</option>
                            <option value="www.asos.com.men">www.asos.com for men</option>
                            <option value="www.asos.com.women">www.asos.com form women</option>
                            <option value="www.babycity.ee">www.babycity.ee</option>
                            <option value="www.barbora.ee">www.barbora.ee</option>
                            <option value="www.ecoop.ee">www.ecoop.ee</option>
                            <option value="www.euronics.ee">www.euronics.ee</option>
                            <option value="www.minuvalik.ee">www.minuvalik.ee</option>
                            <option value="www.rimi.ee">www.rimi.ee</option>
                            <option value="www.selver.ee">www.selver.ee</option>
                            <option value="www.zoomaailm.ee">www.zoomaailm.ee</option>
                        </select>
                    </div>
                    <div className="col-md-1">
                        <select className="form-control" value={this.state.pageSize} onChange={this._onPageSizeChange}>
                            <option value="20">20</option>
                            <option value="72">72</option>
                            <option value="100">100</option>
                            <option value="200">200</option>
                            <option value="500">500</option>
                        </select>
                    </div>
                    <div className="col-md-9">
                        <ReactPaginate
                            pageCount={this.state.pagesTotal}
                            forcePage={this.state.activePage}
                            pageRangeDisplayed={10}
                            marginPagesDisplayed={2}
                            onPageChange={this._onPageChange}
                            containerClassName={'pagination'}
                        />
                    </div>
                </div>

                <Tabs
                    id={ 'offersGrid' }
                    activeKey={this.state.category}
                    onSelect={this._handleCategorySelect}
                    className={ "nav nav-tabs nav-justified" }
                >
                    <Tab eventKey={ 'all' } title="All">
                        {widgetsRows}
                    </Tab>
                    <Tab eventKey={ 'cosmetics' } title="Cosmetics">
                        {widgetsRows}
                    </Tab>
                    <Tab eventKey={ 'alcohol' } title="Alcohol">
                        {widgetsRows}
                    </Tab>
                    <Tab eventKey={ 'fashion' } title="Fashion">
                        {widgetsRows}
                    </Tab>
                    <Tab eventKey={ 'toys' } title="Toys">
                        {widgetsRows}
                    </Tab>
                    <Tab eventKey={ 'pets' } title="Pets">
                        {widgetsRows}
                    </Tab>
                    <Tab eventKey={ 'children' } title="Children">
                        {widgetsRows}
                    </Tab>
                </Tabs>

                <div className="row paging">
                    <div className="col-md-1">
                        <select className="form-control" value={this.state.pageSize} onChange={this._onPageSizeChange}>
                            <option value="20">20</option>
                            <option value="72">72</option>
                            <option value="100">100</option>
                            <option value="200">200</option>
                            <option value="500">500</option>
                        </select>
                    </div>

                    <div className="col-md-11">
                        <ReactPaginate
                            pageCount={this.state.pagesTotal}
                            forcePage={this.state.activePage}
                            pageRangeDisplayed={10}
                            marginPagesDisplayed={2}
                            onPageChange={this._onPageChange}
                            containerClassName={'pagination'}
                        />
                    </div>
                </div>
            </div>
        );
    }

    componentDidMount() {
        super.componentDidMount();

        OfferStore.loadOffers({
            activePage: 0, 
            pageSize: 72
        });
    }

    private _onProcessSite = (e: React.MouseEvent<HTMLButtonElement>): void => {
        e.preventDefault();
        e.stopPropagation();

        JobsStore.processSite({
            site: this.state.site
        });
    }

    private _onProcessPictures = (e: React.MouseEvent<HTMLButtonElement>): void => {
        e.preventDefault();
        e.stopPropagation();

        JobsStore.processOfferPictures({
            site: this.state.site
        });
    }

    private _onProcessPicturesStop = (e: React.MouseEvent<HTMLButtonElement>): void => {
        e.preventDefault();
        e.stopPropagation();

        JobsStore.stopProcessOfferPictures({
            site: this.state.site
        });
    }

    private _onPageChange = (selectedItem: { selected: number; }): void => {
        this.setState({ activePage: selectedItem.selected });

        OfferStore.loadOffers({
            activePage: selectedItem.selected, 
            pageSize: this.state.pageSize,
            site: this.state.site,
            category: this.state.category
        });
    }

    private _onFilterChange = (e: React.FormEvent<FormControlProps>): void => {
        this.setState({ filter: e.currentTarget.value });

        OfferStore.loadOffers({
            activePage: 0, 
            pageSize: this.state.pageSize,
            site: this.state.site,
            category: this.state.category,
            filter: e.currentTarget.value
        });
    }

    private _onSiteChange = (e: React.FormEvent<HTMLSelectElement>): void => {
        this.setState({ site: e.currentTarget.value });

        OfferStore.loadOffers({
            activePage: 0, 
            pageSize: this.state.pageSize,
            site: e.currentTarget.value,
            category: this.state.category
        });
    }

    private _onPageSizeChange = (e: React.FormEvent<HTMLSelectElement>): void => {
        e.preventDefault();
        e.stopPropagation();

        const pageSize = parseInt(e.currentTarget.value, 10);

        this.setState({ pageSize: pageSize });

        OfferStore.loadOffers({
            activePage: this.state.activePage, 
            pageSize: pageSize,
            site: this.state.site,
            category: this.state.category
        });
    }

    private _handleCategorySelect = (category: any) => {
        this.setState({ category: category });

        OfferStore.loadOffers({
            activePage: 0, 
            pageSize: this.state.pageSize,
            site: this.state.site,
            category: category
        });
      }
}

export default OffersPage;