'use strict';

/**
 * @typedef ParsedNode
 * @prop {string[]=} comments
 * @prop {Object.<string, ParsedNode>=} nodes
 */

/**
 * @desc comment parser for schema files
 * This parser only can handle limited use cases and may not work for complete YAML document.
 */
class CommentParser {
    /**
     * @typedef NodeStackElem
     * @prop {number} indent
     * @prop {ParsedNode} node
     */
    /**
     * @param {string} str
     * @return {Object.<string, ParsedNode>}
     */
    parse(str) {
        /** @type {NodeStackElem[]} */
        const parents = [{
            node: {},
            indent: -1,
        }];
        let comments = [];
        for (const line of str.split('\n')) {
            const indent = this._countIndent(line);
            const {key, comment} = this._parseLine(line.slice(indent));
            if (comment) {
                comments = [...comments, comment];
            }
            if (!key) {
                continue;
            }
            while (indent <= parents.slice(-1)[0].indent) {
                parents.pop();
            }
            const node = this._addNode(parents.slice(-1)[0].node, key, comments);
            comments = [];
            parents.push({
                indent,
                node
            });
        }
        return parents[0].node.nodes;
    }

    /**
     * @param {string} line
     * @return {number}
     */
    _countIndent(line) {
        let i = 0;
        while (i < line.length) {
            if (line[i] !== ' ') {
                break;
            }
            i++;
        }
        return i;
    }

    /**
     * @param {string} line
     * @return {{key?: string, comment?: string}}
     */
    _parseLine(line) {
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
        return {key, comment};
    }

    /**
     *
     * @param {ParsedNode} parentNode
     * @param {string} key
     * @return {ParsedNode}
     */
    _addNode(parentNode, key, comments) {
        const node = {};
        if (comments.length > 0) {
            node.comments = comments;
        }
        parentNode.nodes = parentNode.nodes || {};
        parentNode.nodes[key] = node;
        return node;
    }
}

exports.commentParser = new CommentParser();
