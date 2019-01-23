"use strict";

const fs = require('fs');
const yaml = require('js-yaml');

const schema = yaml.safeLoad(fs.readFileSync(`${__dirname}/../test/fixtures/test.yaml`));
const schema1 = yaml.safeLoad(fs.readFileSync(`${__dirname}/../test/fixtures/test1.yaml`));
console.log(require('./index').check(schema, schema1, 2));
