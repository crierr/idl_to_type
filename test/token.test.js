'use strict';

const { expect } = require('chai');
const { tokenizer } = require('../lib/token');

describe('Tokenizer', () => {
    it('should handle new line', () => {
        expect(tokenizer.tokenize('\n\n\n'))
            .to.eql([]);
    })

    it('should handle indent', () => {
        expect(tokenizer.tokenize(
            `    \n  `
        )).to.eql([
            { indent: 4 },
            { indent: 2 }
        ]);
    });

    it('should handle comment', () => {
        expect(tokenizer.tokenize(
            '#comment1\n' +
            '  #comment2'
        )).to.eql([
            { comment: 'comment1' },
            { indent: 2 },
            { comment: 'comment2'}
        ]);
    });

    it('should handle prop', () => {
        expect(tokenizer.tokenize(
            'foo:\n' +
            '    bar: 1\n' +
            '    baz: 2\n' +
            'qux: 2'
        )).to.eql([
            { prop: 'foo' },
            { indent: 4 },
            { prop: 'bar' },
            { indent: 4 },
            { prop: 'baz' },
            { prop: 'qux' }
        ]);
    });
});
