'use strict';

const { expect } = require('chai');
const { schemaParser } = require('../lib/types');

describe('SchemaParser', () => {
    it('should generate interface', () => {
        const type = schemaParser.parse(
            `name: Foo\n` +
            `output: foo.js`
        );
        console.log(type.render().slice(-1).charCodeAt(0));
        expect(type.render()).to.eql(
            `interface Foo {\n` +
            `}\n`
        );
    });

    it('should convert schema contains field', () => {
        const type = schemaParser.parse(
            `name: Foo\n` +
            `output: foo.js\n\n` +
            `schema:\n` +
            `    bar: int`
        );
        expect(type.render()).to.eql(
            `interface Foo {\n` +
            `    bar: number;\n` +
            `}\n`
        );
    });

    it('should convert schema contains other types', () => {
        const type = schemaParser.parse(
            `name: Foo\n` +
            `output: foo.js\n\n` +
            `schema:\n` +
            `    bar: str\n` +
            `    baz: float\n` +
            `    qux: obj\n` +
            `    quux: date\n` +
            `    quuz: oid\n` +
            `    aaa: bool\n`
        );
        expect(type.render()).to.eql(
            `interface Foo {\n` +
            `    bar: string;\n` +
            `    baz: number;\n` +
            `    qux: any;\n` +
            `    quux: Date;\n` +
            `    quuz: ObjectId;\n` +
            `    aaa: boolean;\n` +
            `}\n`
        );
    });

    it('should convert schema contains custom type', () => {
        const type = schemaParser.parse(
            `name: Foo\n` +
            `output: foo.js\n\n` +
            `schema:\n` +
            `    bar: Bar`
        );
        expect(type.render()).to.eql(
            `interface Foo {\n` +
            `    bar: Bar;\n` +
            `}\n`
        );
    });

    it('should convert schema with default value specified', () => {
        const type = schemaParser.parse(
            `name: Foo\n` +
            `output: foo.js\n\n` +
            `schema:\n` +
            `    bar: int=0`
        );
        expect(type.render()).to.eql(
            `interface Foo {\n` +
            `    bar: number;\n` +
            `}\n`
        );
    });

    it('should convert schema contains array', () => {
        const type = schemaParser.parse(
            `name: Foo\n` +
            `output: foo.js\n\n` +
            `schema:\n` +
            `    bar: [str]`
        );
        expect(type.render()).to.eql(
            `interface Foo {\n` +
            `    bar: string[];\n` +
            `}\n`
        );
    });

    it('should convert schema contains map', () => {
        const type = schemaParser.parse(
            `name: Foo\n` +
            `output: foo.js\n\n` +
            `schema:\n` +
            `    bar: [int, str]`
        );
        expect(type.render()).to.eql(
            `interface Foo {\n` +
            `    bar: {[k: string]: number};\n` +
            `}\n`
        );
    });

    it('should convert nested schema', () => {
        const type = schemaParser.parse(
            `name: Foo\n` +
            `output: foo.js\n\n` +
            `schema:\n` +
            `    nested:\n` +
            `        bar: int\n` +
            `        baz:\n` +
            `            qux: str`
        );
        expect(type.render()).to.eql(
            `interface Foo {\n` +
            `    nested: {\n` +
            `        bar: number;\n` +
            `        baz: {\n` +
            `            qux: string;\n` +
            `        };\n` +
            `    };\n` +
            `}\n`
        );
    });

    it('should convert nested schema contains array of nested schema', () => {
        const type = schemaParser.parse(
            `name: Foo\n` +
            `output: foo.js\n\n` +
            `schema:\n` +
            `    nested:\n` +
            `        -\n` +
            `            bar: int\n` +
            `            baz: str`
        );
        expect(type.render()).to.eql(
            `interface Foo {\n` +
            `    nested: {\n` +
            `        bar: number;\n` +
            `        baz: string;\n` +
            `    }[];\n` +
            `}\n`
        );
    });

    it('should convert array schema', () => {
        const type = schemaParser.parse(
            `name: Foo\n` +
            `output: foo.js\n\n` +
            `schema: [Bar]`
        );
        expect(type.render()).to.eql(
            `interface Foo {\n` +
            `    [i: number]: Bar\n` +
            `}\n`
        );
    });

    it('should convert array schema which has complex element', () => {
        const type = schemaParser.parse(
            `name: Foo\n` +
            `output: foo.js\n\n` +
            `schema:\n` +
            `    -\n` +
            `        foo: int\n` +
            `        bar: str\n`
        );
        expect(type.render()).to.eql(
            `interface Foo {\n` +
            `    [i: number]: {\n` +
            `        foo: number;\n` +
            `        bar: string;\n` +
            `    }\n` +
            `}\n`
        );
    });

    it('should convert schema extends other schema', () => {
        const type = schemaParser.parse(
            `name: Foo\n` +
            `output: foo.js\n\n` +
            `extends: Base\n\n` +
            `schema:\n` +
            `    bar: int`
        );
        expect(type.render()).to.eql(
            `interface Foo extends Base {\n` +
            `    bar: number;\n` +
            `}\n`
        );
    })
});