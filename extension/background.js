'use strict';
import Service from './service.js';
import {SERVICE_STATUS} from './service.js';
import * as MineTask from './tasks/mine.js';

window.service = Service.startup();

window.MineTask = MineTask;
