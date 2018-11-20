import * as React from 'react';
import { Switch, Route } from 'react-router-dom';
import ArchivePage = require('./archive/ArchivePage');
import HomePage = require('./home/HomePage');
import OffersPage from './offers/OffersPage';
import BundlesPage = require('./bundles/BundlesPage');
import BasketPage = require('./basket/BasketPage');
import CheckoutPage = require('./basket/CheckoutPage');

export class Routes extends React.Component {
    render() {
        return (
            <Switch>
                <Route exact path='/' component={HomePage} />
                <Route path='/archive' component={ArchivePage} />
                <Route path='/basket' component={BasketPage} />
                <Route path='/bundles' component={BundlesPage} />
                <Route path='/checkout' component={CheckoutPage} />
                <Route path='/offers' component={ OffersPage } />
            </Switch>
        );
    }
}