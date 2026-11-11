import test from 'node:test';
import assert from 'node:assert/strict';
import { formatQuarterlyFinal } from '../src/quarterlyFinalGrade.mjs';

test('quarterly final selector formats only the reported final grade', () => {
  assert.equal(formatQuarterlyFinal('7.6', true), '8');
  assert.equal(formatQuarterlyFinal('7.4', true), '7');
  assert.equal(formatQuarterlyFinal('7.6', false), '7.6');
  assert.equal(formatQuarterlyFinal('-', true), '-');
  assert.equal(formatQuarterlyFinal(null, true), '—');
});
