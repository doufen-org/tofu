'use strict';
import { openDB } from './vendor/idb/index.js';


const VERSION = 1;

const UPGRADES = [
    db => {
        db.createObjectStore('account', { keyPath: 'id' });
        db.createObjectStore('broadcast', { keyPath: 'id' });
    },
];


export default class Storage {
    constructor(name, version = VERSION) {
        this.name = name;
        this.version = version;
    }

    async open() {
        this.db = await openDB(this.name, this.version, {
            upgrade(db, oldVersion, newVersion, transaction) {
                for (let i = oldVersion; i < newVersion; i ++) {
                    (UPGRADES[i])(db, transaction);
                }
            }
        });
    }

    close() {
        return this.db.close();
    }
}
