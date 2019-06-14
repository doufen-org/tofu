'use strict';
import Dexie from './vendor/dexie.js';


const DB_NAME = 'grave';

const SCHEMA_GLOBAL = [
    null,
    {
        account: 'userId, userSymbol',
        job: '++id, userId, userSymbol',
    },
];

const SCHEMA_LOCAL = [
    null,
    {
        status: 'id',
        following: '[id+version], version',
        follower: '[id+version], version',
        interest: '[id+version], [version+type+status]',
        version: 'table, version',
    },
];


/**
 * Class Storage
 */
class Storage {
    constructor() {

    }

    get global() {
        if (!this._global) {
            let db = this._global = new Dexie(DB_NAME);
        }
        return this._global;
    }

    get local() {
        if (!this._local) {
            
        }
        return this._local;
    }
}
