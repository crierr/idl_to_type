#!/usr/bin/env node

'use strict';

const fs = require('fs');
const util = require('util');
const path = require('path');
const glob = require('glob');
const { schemaParser } = require('./lib/types');

const readFile = util.promisify(fs.readFile);
const globAsync = util.promisify(glob);

(async () => {
    const argv = require('yargs')
        .options({
            'input': {
                alias: 'i',
                describe: 'path to schema directory or file',
                demandOption: true,
            },
            'output': {
                alias: 'o',
                describe: 'output path',
            }
        })
        .argv;

    let paths = [];
    if (path.extname(argv.input)) {
        paths = [argv.input];
    } else {
        paths = await globAsync(path.resolve(argv.input, '**/*.sch'));
    }
    /** @type {string[]} */
    const results = await Promise.all(paths.map(async path => {
        try {
            const schema = await readFile(path);
            const type = schemaParser.parse(schema.toString());
            type.addComment(`{@link ${path}}`, '@see');
            return type.render(1);
        } catch (e) {
            console.error(`path: ${path}`);
            console.error(e);
            return `    /** failed to convert ${path} */`
        }
    }));

    const output = `import { Types } from 'mongoose';\n\n` +
        `global {\n` +
        `    import ObjectId = Types.ObjectId;\n\n` +
        results.join('') +
        `}\n` +
        `// processed ${paths.length} files\n`;

    if (argv.output) {
        fs.writeFileSync(argv.output, output);
    } else {
        console.log(output);
    }
})();
