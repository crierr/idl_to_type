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
                describe: 'path to schema directory',
                demandOption: true,
            },
            'output': {
                alias: 'o',
                describe: 'output path',
            }
        })
        .argv;

    const paths = await globAsync(path.resolve(argv.input, '**/*.sch'));
    const results = await Promise.all(paths.map(async path => {
        try {
            const schema = await readFile(path);
            return {
                path,
                type: schemaParser.parse(schema).render(1),
            };
        } catch (e) {
            console.error(`path: ${path}`);
            console.error(e);
            return {
                path,
                type: '/** failed to convert */'
            };
        }
    }));

    const output = `import { Types } from 'mongoose';\n\n` +
        `global {\n` +
        `    import ObjectId = Types.ObjectId;\n\n` +
        results.map(result => `    /** @see {@link ${result.path}} */\n` + result.type).join('') +
        `}\n` +
        `// processed ${paths.length} files\n`;

    if (argv.output) {
        fs.writeFileSync(argv.output, output);
    } else {
        console.log(output);
    }
})();
