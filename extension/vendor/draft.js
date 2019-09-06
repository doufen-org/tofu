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
        {class: 'subject-wrapper', type: 'atomic', handle: node => {
            node.innerHTML = '';
        }},
        {class: 'video-wrapper', type: 'atomic', handle: node => {
            node.innerHTML = '';
        }},
        {class: 'image-container', type: 'atomic', handle: node => {
            node.innerHTML = '';
        }},
        {type: 'unstyled'},
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

const ENTITY_TAGS = {
    a: { type: 'LINK', handle: node => {
        let entityId = this.addEntity('LINK', true, {url: node.href});
        this.block.addEntityRange(entityId);
    }},
    img: {type: 'IMAGE', handle: node => {
    }},
    hr: {type: 'SEPARATOR', handle: node => {
    }}
}


class Block {
    constructor(type) {
        this.type = type;
        this.segments = [];
        this.inlineStyleRanges = [];
        this.entityRanges = [];
    }

    write(segment) {
        this.segments.push(segment);
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
        return this.segments.join('');
    }

    get key() {
        return '';
    }

    get length() {
        return this.text.length;
    }

    addInlineStyleRange(style) {
        let range = {
            style: style,
            offset: this.length,
        };
        this.inlineStyleRanges.push(range);
        return range;
    }

    addEntityRange(key) {
        let range = {
            key: key,
            offset: this.length,
        };
        this.entityRanges.push(range);
        return range;
    }

    end() {
        let length = this.length, range;

        for (range of this.inlineStyleRanges) {
            if (!range.length) {
                range.length = length - range.offset;
            }
        }

        for (range of this.entityRanges) {
            if (!range.length) {
                range.length = length - range.offset;
            }
        }
    }
}


export default class Drafter {
    constructor() {
        this.blocks = [];
        this.entities = {};
        this._entityId = 0;
    }

    get block() {
        if (!this._block) {
            return this.addBlock();
        }
        return this._block;
    }

    addBlock(type = 'unstyled') {
        if (this._block) {
            this._block.end();
            this.blocks.push(this._block);
        }
        this._block = new Block(type);
        return this._block;
    }

    addEntity(type, isMutable, data) {
        this.entities[this._entityId] = {
            type: type,
            mutability: isMutable ? 'MUTABLE' : 'IMMUTABLE',
            data: data,
        };
        return this._entityId ++;
    }

    matchNode(defination, node) {
        for (let rule of defination) {
            if (rule.class && !node.classList.contains(rule.class)) {
                continue;
            }
            if (rule.style && node.attributes.style.value != rule.style) {
                continue;
            }
            if (rule.parent && node.parentNode.tagName != rule.parent) {
                continue;
            }
            let handled = false;
            if (rule.handle) {
                handled = rule.handle.call(this, node);
            }
            return [rule.type, handled];
        }
        return ['unstyled', null];
    }

    travelChildren(parentNode, depth = 0) {
        for (let node of parentNode.childNodes) {
            let ignoreRecursive = false;
            switch (node.nodeType) {
                case node.ELEMENT_NODE:
                    // Element
                    let nodeTagName = node.tagName.toLowerCase();
                    if (nodeTagName in BLOCK_TAGS) {
                        // Block element
                        if (depth > 0) {
                            this.block.write("\n");
                        } else {
                            let defination = BLOCK_TAGS[nodeTagName];
                            let blockType = defination;
                            if (defination instanceof Array) {
                                [blockType] = this.matchNode(defination, node);
                            }
                            this.addBlock(blockType);
                        }
                    } else if (nodeTagName in INLINE_TAGS) {
                        // Inline styles
                        if (node.childNodes.length > 0) {
                            // Recursive
                            let defination = INLINE_TAGS[nodeTagName];
                            let inlineStyleName = defination;
                            if (defination instanceof Array) {
                                [inlineStyleName] = this.matchNode(defination, node);
                            }
                            if (inlineStyleName != 'unstyled') {
                                let range = this.block.addInlineStyleRange(inlineStyleName);
                                this.travelChildren(node, depth + 1);
                                range.length = this.block.length - range.offset;
                                ignoreRecursive = true;
                            }
                        }
                    } else if (nodeTagName in ENTITY_TAGS) {
                        // Entity
                    } else if (nodeTagName in TEXT_TAGS) {
                        // Text
                        this.block.write(TEXT_TAGS[nodeTagName]);
                    }
                    if (!ignoreRecursive) {
                        // Recursive
                        this.travelChildren(node, depth + 1);
                    }
                    break;
                case node.TEXT_NODE:
                    // Text
                    this.block.write(node.textContent);
                    break;
            }
        }
    }

    feed(html) {
        this.travelChildren(html);
        return this;
    }
}
