const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');

for (const edition of ['planeaciones']) {
  const root = join(__dirname, '..', 'src');
  const app = readFileSync(join(root, 'App.jsx'), 'utf8');
  const parse = vm.runInNewContext(app.split('\n').find(line => line.startsWith('const safeParse =')) + '; safeParse');
  test(`${edition}: apartados ausentes y existentes`, () => {
    for (const input of [null, 'null', undefined, '', '{']) {
      const fallback = {};
      assert.equal(parse(input, fallback), fallback);
      assert.equal(parse(input, fallback).proposito || '', '');
    }
    const saved = { proposito: 'Conservar mi planeacion', recursos: 'Cuaderno' };
    assert.equal(parse(saved, {}), saved);
    assert.equal(parse(JSON.stringify(saved), {}).proposito, saved.proposito);
    assert.equal(parse('0', {}), 0);
    assert.equal(parse('false', {}), false);
    assert.equal(parse('[]', []).length, 0);
  });
  const document = readFileSync(join(root, 'utils/planeacionDocument.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/\bexport /g, '');
  const build = vm.runInNewContext(document + '; buildPlanoDidacticoHtml');
  test(`${edition}: exportar apartados nulos y conservar contenido`, () => {
    assert.match(build({ apartados: null }), /Sin nombre/);
    const html = build({ nombre: 'Proyecto conservado', apartados: { proposito: 'Aprender juntos', materiales: 'Cuaderno azul' } });
    for (const text of ['Proyecto conservado', 'Aprender juntos', 'Cuaderno azul']) assert.ok(html.includes(text), text);
  });
}
