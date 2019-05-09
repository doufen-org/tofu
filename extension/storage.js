'use strict';
import { openDB, deleteDB } from './vendor/idb/index.js';


const DB_VERSION = 1;
const UPGRADES = [
    db => {
        db.createObjectStore('account');
    },
];


function upgrade(db, oldVersion, newVersion, transaction) {

}
