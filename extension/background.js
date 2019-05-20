'use strict';
import Service from './service.js';


Service.startup();
let service = window.service = Service.instance;
service.start();