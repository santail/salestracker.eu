import _ = require('lodash');
import * as React from 'react';

import { ComponentBase } from 'resub';
import { Link } from 'react-router-dom';


interface HeaderProperties {
}

interface HeaderState {
}

class Header extends ComponentBase<HeaderProperties, HeaderState> {
    protected _buildState(props: HeaderProperties, initialBuild: boolean): Partial<HeaderState> {
        let newState: HeaderState = {
        };

        return newState;
    }

    render() {
        return (
            <div className="container-fluid">
                <div className="page-header">
                    <div className="logo"><a href="/index.html" title=""><img src="/images/logo.png" alt="" /></a></div>

                    <ul className="middle-nav">
                        <li>
                            <Link to='/basket' className="btn btn-default"><i className="fa fa-shopping-basket"></i> <span>Корзина</span></Link>
                        </li>
                    </ul>
                </div>
            </div>
        );
    }
}

export = Header;