'use strict';


export default class Draft {
    static convertFromHTML(html) {
        let raw = {
            entityMap: {},
            blocks: [],
        };
        for (let node of html.childNodes) {
            switch (node.nodeType) {
                case node.ELEMENT_NODE:
                    switch (node.tagName) {
                        case 'P':
                        case 'BR':
                        case 'DIV':
                        case 'BLOCKQUOTE':
                        case 'H2':
                        case 'HR':
                        default:
                    }
                    break;
                case node.TEXT_NODE:
                    break;
            }
        }
        return raw;
    }
}
