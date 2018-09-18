import * as React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';

import HomePage = require('./core/HomePage');


export class Routes extends React.Component {
    render() {
        return (
            <Switch>
                <Route exact path='/' component={HomePage} />
            </Switch>
        );
    }
}