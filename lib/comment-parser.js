'use strict';

/**
 * @typedef CommentEntry
 * @prop {string} path
 * @prop {string[]} comments
 */

/**
 * @desc comment parser for schema files
 * This parser only can handle limited use cases and may not work for complete YAML document.
 */
class CommentParser {
    /**
     * @typedef NodeStackElem
     * @prop {number} indent
     * @prop {string} path
     */
    /**
     * @param {string} str
     * @return {CommentEntry[]}
     */
    parse(str) {
        /** @type {NodeStackElem[]} */
        const parents = [{
            indent: -1,
            path: '',
        }];
        let comments = [];
        /** @type {CommentEntry[]} */
        let results = [];
        for (const line of str.split('\n')) {
            const { indent, key, comment } = this._parseLine(line);
            if (comment) {
                comments = [...comments, comment];
            }
            if (!key) {
                continue;
            }
            while (indent <= parents.slice(-1)[0].indent) {
                parents.pop();
            }
            const top = parents.slice(-1)[0];
            const path = (top.path && top.path + '.') + key;
            parents.push({ indent, path });
            if (comments.length) {
                results = [...results, { path, comments }];
                comments = [];
            }
        }
        return results;
    }

    /**
     * @param {string} line
     * @return {{indent: number, key?: string, comment?: string}}
     */
    _parseLine(line) {
        const indent = Math.max(0, line.search(/[^ -]/));
        line = line.slice(indent);

        let key, comment;
        if (line[0] === '#') {
            comment = line.slice(1);
            line = '';
        }
        const commentStartAt = line.indexOf(' #');
        if (commentStartAt >= 0) {
            comment = line.slice(commentStartAt + 2);
            line = line.slice(0, commentStartAt);
        }
        const seperatedAt = line.indexOf(': ');
        if (seperatedAt >= 0) {
            key = line.slice(0, seperatedAt).trim();
        } else if (line.slice(-1) === ':') {
            key = line.slice(0, -1).trim();
        }
        return {indent, key, comment};
    }
}

exports.commentParser = new CommentParser();
