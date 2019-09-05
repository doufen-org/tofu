'use strict';


const BLOCK_TAGS = {
    h1: 'header-one',
    h2: 'header-two',
    h3: 'header-three',
    h4: 'header-four',
    h5: 'header-five',
    h6: 'header-six',
    blockquote: 'blockquote',
    li: [
        {parent: 'ul', type: 'unordered-list-item'},
        {parent: 'ol', type: 'ordered-list-item'},
    ],
    ol: '',
    ul: '',
    code: 'code-block',
    p: 'unstyled',
    div: [
        {class: 'separator', type: 'atomic'},
        {class: 'subject-wrapper', type: 'atomic'},
        {class: 'video-wrapper', type: 'atomic'},
        {class: 'image-container', type: 'atomic'},
    ],
};

const INLINE_TAGS = {
    b: 'BOLD',
    strong: 'BOLD',
    i: 'ITALIC',
    em: 'ITALIC',
    span: [
        {style: 'font-style: italic;', type: 'ITALIC'},
        {style: 'font-weight: bold;', type: 'STRONG'},
    ],
    code: 'CODE',
    u: 'UNDERLINE',
};

const TEXT_TAGS = {
    br: "\n",
};

const ENTITIES = {
    a: {
        type: 'LINK',
    },
    img: Image,
    hr: {
        type: 'SEPARATOR',
        mutability: 'IMMUTABLE',
        data: {},
    },
}


class Block {
    constructor(type) {
        this.type = type;
        this.segments = [];
        this.inlineStyles = [];
        this.entities = [];
    }

    feed(segment) {
        
    }

    get value() {
        return {
            "key": this.key,
            "text": this.text,
            "type": this.style,
            "depth": 0,
            "inlineStyleRanges": [
            ],
            "entityRanges": [
            ],
            "data": { }
        }
    }

    get text() {

    }

    get key() {
        return '';
    }

    get offset() {
        return this.text.length;
    }
}


class Entity {
    get value() {

    }
}


export default class Drafter {
    constructor() {
        this.blocks = [];
        this.entities = {};
    }

    get block() {
        if (!this._block) {
            this.createBlock();
        }
        return this._block;
    }

    createBlock(tpye = 'unstyled') {
        
    }

    addEntity() {

    }

    travelChildren(parentNode) {
        for (let node of parentNode.childNodes) {
            switch (node.nodeType) {
                case node.ELEMENT_NODE:
                    if (node.tagName in BLOCK_TAGS) {
                        let defination = BLOCK_TAGS[node.tagName];
                        if (defination instanceof Array) {
                            for (let match of defination) {
                                
                            }
                        } else {
                            this.createBlock(defination);
                        }
                    } else if (node.tagName in INLINE_TAGS) {
                        //
                    } else if (node.tagName in TEXT_TAGS) {
                        this.block.feed(TEXT_TAGS[node.tagName]);
                    }
                    if (node.childElementCount > 0) {
                        this.travelNodes(node.childNodes);
                    }
                    break;
                case node.TEXT_NODE:
                    this.block.feed(node.textContent);
                    break;
            }
        }
    }

    feed(html) {
        this.travelChildren(html);
        return this;
    }
}
