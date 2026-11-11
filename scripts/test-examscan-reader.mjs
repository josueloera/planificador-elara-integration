import test from 'node:test';
import assert from 'node:assert/strict';
import { readBubbles } from '../src/omrBubbleReader.mjs';

const width = 720;
const count = 15;
const height = 90 + count * 33;
const gridWidth = (width - 24) * 0.78;
const gridX = 12 + (width - 24 - gridWidth) / 2;
const firstColumnWidth = gridWidth - 4 * 38;
const xCenters = [0, 1, 2, 3].map(i => gridX + firstColumnWidth + 19 + i * 38 - 8);

function drawDisk(data, x0, y0, radiusSquaredMin, radiusSquaredMax, shade) {
  for (let dy = -10; dy <= 10; dy++) for (let dx = -10; dx <= 10; dx++) {
    const radiusSquared = dx * dx + dy * dy;
    if (radiusSquared < radiusSquaredMin || radiusSquared > radiusSquaredMax) continue;
    const index = ((y0 + dy) * width + x0 + dx) * 4;
    data[index] = data[index + 1] = data[index + 2] = shade;
    data[index + 3] = 255;
  }
}

function makeSheet() {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i + 1] = data[i + 2] = 245;
    data[i + 3] = 255;
  }
  const key = Array.from({ length: count }, (_, i) => 'ABCD'[i % 4]);
  for (let row = 0; row < count; row++) {
    const y = 88 + row * 33;
    for (let column = 0; column < 4; column++) drawDisk(data, Math.round(xCenters[column]), y, 8 * 8, 10 * 10, 50);
    // One deliberately light pencil mark confirms that detection tolerates
    // low contrast; all rows contain one answer and no hand-aligned QR is needed.
    drawDisk(data, Math.round(xCenters['ABCD'.indexOf(key[row])]), y, 0, 6 * 6, row === 1 ? 215 : 175);
  }
  return { data, width, height };
}

test('OMR detects faint single marks, leaves empty rows blank, and flags multiple marks', () => {
  const image = makeSheet();
  const rows = readBubbles(image, count);
  assert.deepEqual(rows.map(row => row.respuesta), Array.from({ length: count }, (_, i) => 'ABCD'[i % 4]));
  assert.ok(rows[1].confianza >= 0.05, 'the faint pencil mark clears the local contrast threshold');

  const blank = makeSheet();
  const firstY = 88;
  for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
    if (dx * dx + dy * dy > 36) continue;
    const index = ((firstY + dy) * width + Math.round(xCenters[0]) + dx) * 4;
    blank.data[index] = blank.data[index + 1] = blank.data[index + 2] = 245;
  }
  assert.equal(readBubbles(blank, count)[0].respuesta, '', 'an empty bubble row remains blank');

  const multiple = makeSheet();
  const multipleY = 88;
  drawDisk(multiple.data, Math.round(xCenters[1]), multipleY, 0, 6 * 6, 175);
  assert.equal(readBubbles(multiple, count)[0].estado, 'multiple', 'two equally dark marks are not guessed');
});
