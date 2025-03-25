'use strict';

import Service from './service.js';
import TaskModal from "./service.js";

console.log("background.js")

//修改header，避免400
chrome.runtime.onInstalled.addListener(() => {
    chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [
            {
                "id": 1,
                "priority": 1,
                "action": {
                    "type": "modifyHeaders",
                    "requestHeaders": [
                        {
                            "header": "Referer",
                            "operation": "set",
                            "value": "https://m.douban.com/"
                        }
                    ]
                },
                "condition": {
                    "urlFilter": "*://*.douban.com/*",
                    "resourceTypes": ["xmlhttprequest"]
                }
            }
        ],
        removeRuleIds: [1]
    });

    console.log("修改请求头规则已更新");
});

let service;

chrome.runtime.onInstalled.addListener(async () => {
    service = await Service.getInstance();
    // Service.startup()
});

// 在适当的时候保存状态
chrome.runtime.onSuspend.addListener(async () => {
    if (!service) {
        service = await Service.getInstance();
    }
    console.log("onSuspend")
    await service.saveState();
});