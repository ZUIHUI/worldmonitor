import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readLocale = code => JSON.parse(readFileSync(new URL(`../src/locales/${code}.json`, import.meta.url), 'utf8'));
const flatten = (dictionary, prefix = '', result = {}) => {
  for (const [key, value] of Object.entries(dictionary)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') result[path] = value;
    else flatten(value, path, result);
  }
  return result;
};

test('Traditional Chinese covers every English key and preserves interpolation variables', () => {
  const english = flatten(readLocale('en'));
  const traditional = flatten(readLocale('zh-TW'));
  assert.deepEqual(Object.keys(traditional).sort(), Object.keys(english).sort());
  const variables = text => [...text.matchAll(/{{\s*([^}]+?)\s*}}/g)].map(match => match[1]).sort();
  for (const [key, text] of Object.entries(english)) {
    assert.ok(traditional[key].trim(), `Empty translation: ${key}`);
    assert.deepEqual(variables(traditional[key]), variables(text), `Interpolation mismatch: ${key}`);
  }
});
