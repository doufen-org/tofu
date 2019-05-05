'use strict';
import Service from './service.js';
import {SERVICE_STATUS} from './service.js';
import AccountTask from './tasks/account.js';

window.service = Service.startup();

window.AccountTask = AccountTask;
