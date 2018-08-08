'use strict';
// @ts-check

const _ = require('lodash');
const yaml = require('js-yaml');
const { commentParser } = require('./comment-parser');

const INDENT_SPACE = 4;

/**
 * @typedef Schema
 * @prop {string} name
 * @type {*} type
 * @type {string} extends
 */

/**
 * @typedef CommentEntry
 * @prop {string} path
 * @prop {string[]} comments
 */

class Type {
    /**
     * @param {Schema} schema
     * @param {CommentEntry[]} commentEntries
     */
    constructor(schema, commentEntries) {
        this.schema = schema;
        const regexp = new RegExp(this.schema.name + '$');
        const entry = _.find(commentEntries, entry => regexp.test(entry.path));
        this.comments = entry && entry.comments || [];
    }

    /**
     * @param {number} indent
     * @return {string}
     */
    _renderIndent(indent) {
        return Array(INDENT_SPACE * indent + 1).join(' ');
    }

    /**
     * @return {string}
     */
    _renderName() {
        return this.schema.name;
    }

    /**
     * @param {number} indent
     * @return {string}
     */
    _renderType(indent = 0) {
        return this.schema.type;
    }

    /**
     * @param {number} indent
     * @return {string}
     */
    _renderComment(indent = 0) {
        if (this.comments.length === 0) {
            return '';
        } else if (this.comments.length === 1) {
            return this._renderIndent(indent) + `/** ${this.comments[0]} */\n`;
        } else {
            const spaces = this._renderIndent(indent);
            return [
                spaces + '/**\n',
                ..._.map(this.comments, comment => spaces + ` * ${comment}\n`),
                spaces + ' */\n'
            ].join('');
        }
    }

    /**
     * @param {number} indent
     * @return {string}
     */
    render(indent = 0) {
        return this._renderComment(indent) +
            this._renderIndent(indent) + `${this._renderName()}: ${this._renderType(indent)};\n`;
    }
}

class UnrecognizedType extends Type {
    constructor(schema, commentEntries) {
        super(schema, commentEntries);
        this.comments = ['WARN: unrecognized type', ...this.comments];
    }

    _renderType() {
        return 'any';
    }
}

class SimpleType extends Type {
    constructor(schema, commentEntries) {
        const [type, def] = schema.type.split('=');
        schema.type = type;
        super(schema, commentEntries);
        if (def !== undefined) {
            this.comments.push(`@default ${def}`);
        }
    }

    _renderType() {
        switch (this.schema.type) {
            case 'int': return 'number';
            case 'float': return 'number';
            case 'bool': return 'boolean';
            case 'str': return 'string';
            case 'obj': return 'any';
            case 'date': return 'Date';
            case 'oid': return 'ObjectId';
        }
        return this.schema.type;
    }
}

class ArrayType extends Type {
    constructor(schema, commentEntries) {
        super(schema, commentEntries);
        const factory = new TypeFactory();
        this.elemType = factory.createType(schema.name, schema.type[0], commentEntries);
    }

    _renderType(indent = 0) {
        return this.elemType._renderType(indent) + '[]';
    }
}

class MapType extends Type {
    constructor(schema, commentEntries) {
        super(schema, commentEntries);
        this.valueType = new SimpleType({type: schema.type[0]});
        this.keyType = new SimpleType({type: schema.type[1]});
    }

    _renderType() {
        return `{[k: ${this.keyType._renderType()}]: ${this.valueType._renderType()}}`;
    }
}

class NestedType extends Type {
    constructor(schema, commentEntries) {
        super(schema, commentEntries);
        const factory = new TypeFactory();
        this.childs = _.map(schema.type, (v, k) => factory.createType(k, v, commentEntries));
    }

    _renderType(indent = 0) {
        return [
            `{\n`,
            ..._.map(this.childs, child => child.render(indent + 1)),
            this._renderIndent(indent) + `}`
        ].join('');
    }
}

class InterfaceType extends Type {
    /**
     *
     * @param {Schema} schema
     * @param {CommentEntry[]} commentEntries
     */
    constructor(schema, commentEntries) {
        super(schema, commentEntries);
        const childSchema = { name: schema.name, type: schema.schema };
        if (Array.isArray(schema.schema)) {
            this.child = new ArrayInterfaceType(childSchema, commentEntries);
        } else if (typeof schema.schema === 'object') {
            this.child = new NestedType(childSchema, commentEntries);
        } else if (!schema.schema) {
            this.child = new NestedType({type: {}}, commentEntries);
        }
        this.addComment(schema.brief, '@summary');
        this.addComment(schema.output, '@see');
        this.addComment(schema.shard, 'shard key:');
        if (schema.index) {
            schema.index.forEach(index => this.addComment(JSON.stringify(index), 'indexed by'));
        }
    }

    /**
     * @param {any} v
     * @param {string} prefix
     */
    addComment(v, prefix) {
        if (v) {
            this.comments = [...this.comments, `${prefix} ${v}`];
        }
    }

    _renderName() {
        const _extends = this.schema.extends ? ` extends ${this.schema.extends}` : '';
        return `interface ${this.schema.name}${_extends}`;
    }

    _renderType(indent = 0) {
        return this.child._renderType(indent);
    }

    render(indent = 0) {
        return this._renderComment(indent) +
            this._renderIndent(indent) + `${this._renderName()} ${this._renderType(indent)}\n`;
    }
}

class ArrayInterfaceType extends Type {
    constructor(schema, commentEntries) {
        super(schema, commentEntries);
        const factory = new TypeFactory();
        this.elemType = factory.createType(schema.name, schema.type[0], commentEntries);
    }

    _renderType(indent = 0) {
        return `{\n` +
            this._renderIndent(indent + 1) +
            `[i: number]: ${this.elemType._renderType(indent + 1)}\n` +
            this._renderIndent(indent) + `}`;
    }
}

class TypeFactory {
    /**
     * @param {string} name
     * @param {*} type
     * @param {CommentEntry[]} commentEntries
     * @return {Type}
     */
    createType(name, type, commentEntries) {
        if (Array.isArray(type)) {
            switch (type.length) {
                case 1:
                    return new ArrayType({name, type}, commentEntries);
                case 2:
                    if (_.every(type, _.isString)) {
                        return new MapType({name, type}, commentEntries);
                    }
            }
        } else if (typeof type === 'object') {
            return new NestedType({name, type}, commentEntries);
        } else if (typeof type === 'string') {
            return new SimpleType({name, type}, commentEntries);
        }
        return new UnrecognizedType({name, type}, commentEntries);
    }
}

class SchemaParser {
    /**
     * @param {string} str
     */
    parse(str) {
        const doc = yaml.safeLoad(str);
        const commentEntries = commentParser.parse(str);
        return new InterfaceType(doc, commentEntries);
    }
}

exports.schemaParser = new SchemaParser;
