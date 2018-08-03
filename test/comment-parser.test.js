'use strict';

const { expect } = require('chai');
const { commentParser } = require('../lib/comment-parser');

describe('CommentParser', () => {
    it('should parse comments', () => {
        expect(commentParser.parse(
            `#comment1\n` +
            `foo: foo\n` +
            `#comment2\n` +
            `bar: bar\n`
        )).to.eql({
            foo: {
                comments: ['comment1']
            },
            bar: {
                comments: ['comment2']
            }
        });
    });

    it('should parse multiline comments', () => {
        expect(commentParser.parse(
            `#comment1\n` +
            `# comment2\n` +
            `foo: foo`
        )).to.eql({
            foo: {
                comments: [
                    'comment1',
                    ' comment2'
                ]
            }
        });
    });

    it('should parse comments in nested object', () => {
        expect(commentParser.parse(
            `#comment1\n` +
            `foo:\n` +
            `    #comment2\n` +
            `    bar: bar\n`
        )).to.eql({
            foo: {
                comments: ['comment1'],
                nodes: {
                    bar: {
                        comments: ['comment2']
                    }
                }
            }
        });
    });

    it('should handle inline comments', () => {
        expect(commentParser.parse(
            `foo: #comment1\n` +
            `    bar: 1 #comment2\n`
        )).to.eql({
            foo: {
                comments: ['comment1'],
                nodes: {
                    bar: {
                        comments: ['comment2']
                    }
                }
            }
        });
    });

    xit('should parse comments in sequence', () => {
        const expected = {
            foo: {
                comments: ['comment1'],
                nodes: {
                    0: {
                        nodes: {
                            bar: {
                                comments: ['comment2']
                            }
                        }
                    }
                }
            }
        };
        expect(commentParser.parse(
            `#comment1\n` +
            `foo:\n` +
            `-\n` +
            `    #comment2\n` +
            `    bar: 1\n`
        )).to.eql(expected);
        expect(commentParser.parse(
            `#comment1\n` +
            `foo:\n` +
            `- bar: 1 #comment2\n`
        )).to.eql(expected);
    });

    xit('should handle object notation', () => {
        expect(commentParser.parse(
            `#comment1\n` +
            `foo: {\n` +
            `    #comment2\n` +
            `    bar: 1,\n` +
            `}\n`
        )).to.eql({
            foo: {
                comments: ['comment1'],
                nodes: {
                    bar: {
                        comments: ['comment2']
                    }
                }
            }
        });
    });

    xit('should parse comments in flow style sequence', () => {
        expect(commentParser.parse(
            `#comment1\n` +
            `foo: [{\n` +
            `    #comment2\n` +
            `    bar: bar\n` +
            `}]\n`
        )).to.eql({
            foo: {
                comments: ['comment1'],
                nodes: {
                    0: {
                        nodes: {
                            bar: {
                                comments: ['comment2']
                            }
                        }
                    }
                }
            }
        });
    });
});
