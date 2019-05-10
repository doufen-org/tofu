'use strict';
import Service from './service.js';


Service.startup();
window.service = Service.instance;

import Task from './task.js';
window.Task = Task;