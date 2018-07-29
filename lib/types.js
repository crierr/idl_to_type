'use strict';

const _ = require('lodash');
const yaml = require('js-yaml');

const INDENT_SPACE = 4;

class Type {
    constructor(schema) {
        this.schema = schema;
    }

    _renderIndent(indent) {
        return Array(INDENT_SPACE * indent).fill(' ').join('');
    }

    _renderName() {
        return this.schema.name;
    }

    _renderType(indent = 0) {
        return this.schema.type;
    }

    /** @abstract */
    render(indent = 0) {
        return `${this._renderIndent(indent)}` +
            `${this._renderName()}: ${this._renderType(indent)};\n`;
    }
}

class UnimplementedType extends Type {
    render(indent) {
        return `${this._renderIndent(indent)}/** unrecognized type */\n` +
        `${this._renderIndent(indent)}${this.schema.name}: any;\n`;
    }
}

class SimpleType extends Type {
    _renderType() {
        const [type, _] = this.schema.type.split('=');
        switch (type) {
            case 'int': return 'number';
            case 'float': return 'number';
            case 'bool': return 'boolean';
            case 'str': return 'string';
            case 'obj': return 'any';
            case 'date': return 'Date';
            case 'oid': return 'ObjectId';
        }
        return type;
    }
}

class ArrayType extends Type {
    constructor(schema) {
        super(schema);
        this.elemType = new SimpleType({type: schema.type[0]});
    }
    _renderType() {
        return this.elemType._renderType() + '[]';
    }
}

class MapType extends Type {
    constructor(schema) {
        super(schema);
        this.valueType = new SimpleType({type: schema.type[0]});
        this.keyType = new SimpleType({type: schema.type[1]});
    }

    _renderType() {
        return `{[k: ${this.keyType._renderType()}]: ${this.valueType._renderType()}}`;
    }
}

class NestedType extends Type {
    constructor(schema) {
        super(schema);
        const factory = new TypeFactory();
        this.childs = _.map(schema.type, (v, k) => factory.createType(k, v));
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
    constructor(schema) {
        super(schema);
        if (Array.isArray(schema.schema)) {
            this.child = new ArrayInterfaceType({name: schema.name, type: schema.schema});
        } else if (typeof schema.schema === 'object') {
            this.child = new NestedType({name: schema.name, type: schema.schema});
        } else if (!schema.schema) {
            this.child = new NestedType({type: {}});
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
        return `${this._renderIndent(indent)}${this._renderName()} ${this._renderType(indent)}\n`;
    }
}

class ArrayInterfaceType extends Type {
    constructor(schema) {
        super(schema);
        // this.elemType = new SimpleType({type: schema.type[0]});
        const factory = new TypeFactory();
        this.elemType = factory.createType(schema.name, schema.type[0]);
    }

    _renderType(indent = 0) {
        return `{\n` +
            this._renderIndent(indent + 1) +
            `[i: number]: ${this.elemType._renderType(indent + 1)}\n` +
            this._renderIndent(indent) + `}`;
    }
}

class TypeFactory {
    createType(name, type) {
        if (Array.isArray(type)) {
            if (typeof type[0] === 'string') {
                switch (type.length) {
                    case 1:
                        return new ArrayType({name, type});
                    case 2:
                        return new MapType({name, type});
                }
            }
        } else if (typeof type === 'object') {
            return new NestedType({name, type});
        } else if (typeof type === 'string') {
            return new SimpleType({name, type});
        }
        return new UnimplementedType({name, type});
    }
}

class SchemaParser {
    parse(str) {
        const doc = yaml.safeLoad(str);
        return new InterfaceType(doc);
    }
}

exports.schemaParser = new SchemaParser;
