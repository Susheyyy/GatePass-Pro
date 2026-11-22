import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvText } from './csv.js';
import { resolveApiConfig } from './apiConfig.js';

test('CSV escapes quotes and neutralizes spreadsheet formulas', () => {
  const result = csvText(['Name', 'Value'], [['Guest, "One"', '=1+1'], ['next', '  @SUM(A1)']]);
  assert.ok(result.includes('"Guest, ""One"""'));
  assert.ok(result.includes(`"'=1+1"`));
  assert.ok(result.includes(`"'  @SUM(A1)"`));
  assert.ok(result.includes('\r\n'));
});

test('API configuration normalizes supported bases and rejects unsafe inputs', () => {
  assert.equal(resolveApiConfig({ baseUrl: '/api', origin: 'https://gate.example' }).base, 'https://gate.example/api');
  assert.equal(resolveApiConfig({ legacyUrl: 'https://api.example/api/residents/' }).base, 'https://api.example/api');
  assert.throws(() => resolveApiConfig({ production: true }));
  for (const baseUrl of ['//evil.example/api', 'javascript:alert(1)', 'https://user:password@api.example', 'https://api.example?key=secret']) {
    assert.throws(() => resolveApiConfig({ baseUrl }));
  }
});
