'use strict';

/**
 * @typedef Token
 * @prop {number=} indent
 * @prop {string=} comment
 * @prop {string=} prop
 */

class Tokenizer {
    /**
     * @typedef State
     * @prop {number} position current cursor position
     * @prop {boolean=} newline
     */

    /**
     * @param {string} s
     * @return {Token[]}
     */
    tokenize(s) {
        let curState = {position: 0};
        let tokens = [];
        const len = s.length;
        while (curState.position < len) {
            const {token, state} = this._parseToken(s, curState);
            curState = state || curState;
            if (token) {
                tokens = [...tokens, token];
            }
        }
        return tokens;
    }

    /**
     * @typedef TokenResult
     * @prop {Token=} token
     * @prop {State} state
     */

    /**
     * @param {string} s
     * @param {State} state
     * @return {TokenResult}
     */
    _parseToken(s, {position, newline}) {
        const indentResult = this._walkIndent(s, position);
        if (indentResult) {
            return indentResult;
        }
        const newLineResult = this._walkNewLine(s, position);
        if (newLineResult) {
            return newLineResult;
        }
        const commentResult = this._walkComment(s, position);
        if (commentResult) {
            return commentResult;
        }
        const propResult = this._walkPropName(s, position);
        if (propResult) {
            return propResult;
        }
        const propValue = this._walkPropValue(s, position);
        if (propValue) {
            return propValue;
        };
        return {
            state: {
                position: s.length
            }
        }
    }

    /**
     * @param {string} s
     * @param {number} position
     * @return {TokenResult=}
     */
    _walkNewLine(s, position) {
        if (s[position] === '\n') {
            return {
                state: {
                    position: position + 1,
                    newline: true
                }
            }
        }
    }

    /**
     * @param {string} s
     * @param {number} position
     * @return {TokenResult=}
     */
    _walkIndent(s, position) {
        const start = position;
        while (s[position] === ' ') {
            position++;
        }
        if (position > start) {
            return {
                token: {indent: position - start},
                state: {position}
            };
        }
    }

    /**
     * @param {string} s
     * @param {number} position
     * @return {TokenResult=}
     */
    _walkComment(s, position) {
        if (s[position] !== '#') {
            return;
        }
        let commentEnd = s.indexOf('\n', position + 1);
        if (commentEnd < 0) {
            commentEnd = s.length;
        }
        let token;
        if (commentEnd - position > 0) {
            token = { comment: s.slice(position + 1, commentEnd) };
        }
        return {
            token,
            state: {
                position: commentEnd
            }
        };
    }

    /**
     * @param {string} s
     * @param {number} position
     * @return {TokenResult=}
     */
    _walkPropName(s, position) {
        let i = position + 1;
        const len = s.length;
        while (i < len && s[i] !== '\n') {
            if (s[i] === ':') {
                if (s[i + 1] === ' ' || s[i + 1] === '\n') {
                    return {
                        token: { prop: s.slice(position, i).trim() },
                        state: { position: i + 2 }
                    }
                }
            }
            ++i;
        }
    }

    /**
     * @param {string} s
     * @param {number} position
     * @return {TokenResult=}
     */
    _walkPropValue(s, position) {
        const result = /\n| #/.exec(s.slice(position));
        if (!result) {
            return;
        }
        return {
            state: { position: position + result.index }
        };
    }
}

exports.tokenizer = new Tokenizer();
