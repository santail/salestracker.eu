import _ = require('lodash');

import * as React from 'react';
import { ComponentBase } from 'resub';
import * as ReactPaginate from 'react-paginate';
import { Redirect } from 'react-router'


interface UsersPageState {
}

class UsersPage extends ComponentBase<{}, UsersPageState> {
    protected _buildState(props: {}, initialBuild: boolean): Partial<UsersPageState> {
        return {};
    }

    render() {
        return undefined;
    }

}

export = UsersPage;