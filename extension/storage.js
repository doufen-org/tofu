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
        following: '++id, version',
        follower: '++id, version',
        blacklist: '++id, version',
        review: '[id+version], [version+type]',
        note: '[id+version], version',
        album: 'id',
        photo: 'id',
        interest: '[id+version], [version+type+status]',
        version: 'table, version',
    },
];


/**
 * Class Storage
 */
export default class Storage {
    constructor(userId = null) {
        this.userId = userId;
    }

    get global() {
        if (!this._global) {
            let db = this._global = new Dexie(DB_NAME);
            for (let i = 1; i < SCHEMA_GLOBAL.length; i ++) {
                db.version(i).stores(SCHEMA_GLOBAL[i]);
            }
        }
        return this._global;
    }

    get local() {
        if (!this._local) {
            if (!this.userId) {
                throw new Error('No local storage');
            }
            let db = this._local = new Dexie(`${DB_NAME}[${this.userId}]`);
            for (let i = 1; i < SCHEMA_LOCAL.length; i ++) {
                db.version(i).stores(SCHEMA_LOCAL[i]);
            }
        }
        return this._local;
    }

    async drop(userId) {
        let localDbName = `${DB_NAME}[${userId}]`;
        if (await Dexie.exists(localDbName)) {
            try {
                await Dexie.delete(localDbName);
            } catch (e) {
                return false;
            }
        }
        return await this.global.account.where({
            userId: parseInt(userId)
        }).delete() > 0;
    }
}
