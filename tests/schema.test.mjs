import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
const ajv = new Ajv({ strict: true, allErrors: true });
addFormats(ajv);
const schema = JSON.parse(await readFile(new URL('../v1/schema.json', import.meta.url), 'utf8'));
const validate = ajv.compile(schema);
const sample = async name => JSON.parse(await readFile(new URL(`../examples/${name}.streams.json`, import.meta.url), 'utf8'));

test('all published examples validate against the strict 2020-12 schema', async () => {
  for (const name of ['direct', 'mux', 'merge', 'document']) assert.equal(validate(await sample(name)), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...(await sample('direct')), page: 'https://site.example/?url=x' }), true, 'page is optional');
  assert.equal(validate({ ...(await sample('direct')), page: 'http://site.example/' }), false, 'page must be HTTPS');
});
test('schema rejects unknown fields, versions, non-HTTPS links and invalid filenames', async () => {
  const manifest = await sample('direct');
  for (const bad of [ {...manifest,version:2}, {...manifest,command:'exec'}, {...manifest,output:{...manifest.output,filename:'../file.mp4'}}, {...manifest,streams:[{...manifest.streams[0],url:'http://media.example/file'}]}, {...manifest,streams:[{...manifest.streams[0],sizeBytes:'100'}]} ]) assert.equal(validate(bad), false);
});
test('mux requires exactly two inputs and a container; media merge requires a container', async () => {
  const manifest = await sample('mux');
  const operation = manifest.operations[0];
  for (const bad of [ {...operation,inputs:['video']}, {...operation,inputs:['video','audio','other']}, {...operation,container:undefined}, {...operation,mode:'media'}, {...operation,type:'merge',mode:'media',container:undefined} ]) assert.equal(validate({...manifest,operations:[bad]}),false);
});
