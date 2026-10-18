const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateTrialStatus } = require('../electron/licenseManager.js');
const start = new Date('2026-01-01T12:00:00.000Z');
const at = ms => new Date(start.getTime() + ms);
test('el periodo gratuito termina a las 24 horas exactas', () => {
  assert.equal(calculateTrialStatus(start.toISOString(), at(0)).isTrialValid, true);
  assert.equal(calculateTrialStatus(start.toISOString(), at(86400000 - 1)).isTrialValid, true);
  assert.equal(calculateTrialStatus(start.toISOString(), at(86400000)).isTrialValid, false);
  assert.equal(calculateTrialStatus(start.toISOString(), at(7 * 86400000)).isTrialValid, false);
});
test('el reloj atrasado, fechas futuras o corruptas no extienden la prueba', () => {
  assert.equal(calculateTrialStatus(at(1).toISOString(), start).isTrialValid, false);
  assert.equal(calculateTrialStatus('fecha-invalida', start).isTrialValid, false);
  assert.equal(calculateTrialStatus(null, start).isTrialValid, false);
});
