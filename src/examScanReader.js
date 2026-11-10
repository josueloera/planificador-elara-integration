import jsQR from 'jsqr';

const outputWidth = 720;
const luminance = (data, index) => data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function findThreshold(data) {
  const histogram = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) histogram[Math.round(luminance(data, i))]++;
  const total = data.length / 4;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];
  let background = 0;
  let backgroundSum = 0;
  let best = 0;
  let threshold = 120;
  for (let i = 0; i < 256; i++) {
    background += histogram[i];
    if (!background) continue;
    const foreground = total - background;
    if (!foreground) break;
    backgroundSum += i * histogram[i];
    const meanBackground = backgroundSum / background;
    const meanForeground = (sum - backgroundSum) / foreground;
    const between = background * foreground * (meanBackground - meanForeground) ** 2;
    if (between > best) { best = between; threshold = i; }
  }
  return Math.max(75, Math.min(185, threshold));
}

function adaptiveDarkMask(data, width, height) {
  const stride = width + 1;
  const integral = new Uint32Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      rowSum += luminance(data, (y * width + x) * 4);
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + rowSum;
    }
  }
  const radius = Math.max(8, Math.round(Math.min(width, height) * 0.018));
  const dark = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const left = Math.max(0, x - radius), right = Math.min(width - 1, x + radius);
    const top = Math.max(0, y - radius), bottom = Math.min(height - 1, y + radius);
    const area = (right - left + 1) * (bottom - top + 1);
    const sum = integral[(bottom + 1) * stride + right + 1] - integral[top * stride + right + 1]
      - integral[(bottom + 1) * stride + left] + integral[top * stride + left];
    const localPaper = sum / area;
    const pixel = y * width + x;
    const value = luminance(data, pixel * 4);
    dark[pixel] = value < localPaper - Math.max(16, localPaper * 0.10) ? 1 : 0;
  }
  return dark;
}

function findMarkerCandidates(data, width, height) {
  const total = width * height;
  const dark = adaptiveDarkMask(data, width, height);
  const seen = new Uint8Array(total);
  const stack = new Int32Array(total);
  const candidates = [];
  for (let start = 0; start < total; start++) {
    if (!dark[start] || seen[start]) continue;
    let top = 0; stack[top++] = start; seen[start] = 1;
    let minX = width, minY = height, maxX = 0, maxY = 0, count = 0;
    while (top) {
      const index = stack[--top];
      const x = index % width, y = (index / width) | 0;
      count++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      for (const [dx, dy] of neighbours) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const next = ny * width + nx;
        if (dark[next] && !seen[next]) { seen[next] = 1; stack[top++] = next; }
      }
    }
    const boxWidth = maxX - minX + 1, boxHeight = maxY - minY + 1;
    if (count < 55 || boxWidth < 6 || boxHeight < 6 || boxWidth > 120 || boxHeight > 120) continue;
    const ratio = boxWidth / boxHeight;
    const fill = count / (boxWidth * boxHeight);
    if (ratio < 0.72 || ratio > 1.38 || fill < 0.68) continue;
    candidates.push({ x: (minX + maxX) / 2, y: (minY + maxY) / 2, size: (boxWidth + boxHeight) / 2, fill });
  }
  return candidates.sort((a, b) => b.fill - a.fill || b.size - a.size).slice(0, 38);
}

function orderCorners(points) {
  const sum = points.map(p => p.x + p.y);
  const diff = points.map(p => p.x - p.y);
  return [points[sum.indexOf(Math.min(...sum))], points[diff.indexOf(Math.max(...diff))], points[sum.indexOf(Math.max(...sum))], points[diff.indexOf(Math.min(...diff))]];
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function quadArea(points) {
  return Math.abs(points.reduce((sum, p, i) => sum + p.x * points[(i + 1) % 4].y - points[(i + 1) % 4].x * p.y, 0) / 2);
}

function chooseMarkerQuad(candidates, questionCount, minTopY = 0) {
  const expected = outputWidth / (90 + questionCount * 32);
  let best = null, bestScore = -Infinity;
  const n = candidates.length;
  for (let a = 0; a < n - 3; a++) for (let b = a + 1; b < n - 2; b++) for (let c = b + 1; c < n - 1; c++) for (let d = c + 1; d < n; d++) {
    const raw = [candidates[a], candidates[b], candidates[c], candidates[d]];
    const sizes = raw.map(p => p.size);
    const averageSize = sizes.reduce((s, v) => s + v, 0) / 4;
    const sizeVariation = sizes.reduce((s, v) => s + Math.abs(v - averageSize), 0) / (4 * averageSize);
    if (sizeVariation > 0.38) continue;
    const points = orderCorners(raw);
    if (new Set(points).size !== 4) continue;
    if (Math.min(points[0].y, points[1].y) < minTopY) continue;
    const top = distance(points[0], points[1]), right = distance(points[1], points[2]);
    const bottom = distance(points[3], points[2]), left = distance(points[0], points[3]);
    const w = (top + bottom) / 2, h = (left + right) / 2;
    if (w < 130 || h < 90) continue;
    const ratio = w / h;
    const ratioError = Math.abs(Math.log(ratio / expected));
    if (ratioError > 0.55) continue;
    const sideVariation = (Math.abs(top - bottom) + Math.abs(left - right)) / (2 * (w + h));
    const rectangularity = sideVariation + sizeVariation;
    const area = quadArea(points);
    const score = Math.log(area) - ratioError * 2.5 - rectangularity * 2 + raw.reduce((s, p) => s + p.fill, 0) / 4;
    if (score > bestScore) { best = points; bestScore = score; }
  }
  return best;
}

function solveLinear(matrix, vector) {
  const rows = matrix.map((row, i) => [...row, vector[i]]);
  for (let column = 0; column < 8; column++) {
    let pivot = column;
    for (let row = column + 1; row < 8; row++) if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    if (Math.abs(rows[pivot][column]) < 1e-9) throw new Error('No se pudo corregir la perspectiva de la hoja.');
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    const divisor = rows[column][column];
    for (let j = column; j <= 8; j++) rows[column][j] /= divisor;
    for (let row = 0; row < 8; row++) {
      if (row === column) continue;
      const factor = rows[row][column];
      for (let j = column; j <= 8; j++) rows[row][j] -= factor * rows[column][j];
    }
  }
  return rows.map(row => row[8]);
}

function perspectiveTransform(source, destination) {
  const matrix = [], values = [];
  source.forEach((point, i) => {
    const { x, y } = point, { x: u, y: v } = destination[i];
    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); values.push(u);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]); values.push(v);
  });
  return solveLinear(matrix, values);
}

function warpPerspective(image, width, height, corners, questionCount) {
  const targetHeight = 90 + questionCount * 32;
  const target = [
    { x: 10, y: 10 }, { x: outputWidth - 10, y: 10 },
    { x: outputWidth - 10, y: targetHeight - 10 }, { x: 10, y: targetHeight - 10 }
  ];
  // Sampling runs from each output pixel back into the source photo, so this
  // homography must map target coordinates to source coordinates.
  const h = perspectiveTransform(target, corners);
  const output = new Uint8ClampedArray(outputWidth * targetHeight * 4);
  for (let y = 0; y < targetHeight; y++) for (let x = 0; x < outputWidth; x++) {
    const divisor = h[6] * x + h[7] * y + 1;
    const sx = (h[0] * x + h[1] * y + h[2]) / divisor;
    const sy = (h[3] * x + h[4] * y + h[5]) / divisor;
    const destinationIndex = (y * outputWidth + x) * 4;
    if (sx < 0 || sy < 0 || sx >= width - 1 || sy >= height - 1) { output[destinationIndex + 3] = 255; continue; }
    const x0 = Math.floor(sx), y0 = Math.floor(sy), dx = sx - x0, dy = sy - y0;
    const a = (y0 * width + x0) * 4, b = a + 4, c = a + width * 4, d = c + 4;
    for (let channel = 0; channel < 3; channel++) {
      output[destinationIndex + channel] = image[a + channel] * (1 - dx) * (1 - dy) + image[b + channel] * dx * (1 - dy) + image[c + channel] * (1 - dx) * dy + image[d + channel] * dx * dy;
    }
    output[destinationIndex + 3] = 255;
  }
  return { data: output, width: outputWidth, height: targetHeight };
}

function readBubbles(image, questionCount) {
  const gridWidth = (outputWidth - 24) * 0.78;
  const gridX = 12 + (outputWidth - 24 - gridWidth) / 2;
  const firstColumnWidth = gridWidth - 4 * 38;
  const xCenters = [0, 1, 2, 3].map(i => gridX + firstColumnWidth + 19 + i * 38);
  // The printed title/grid margins collapse in CSS. The first bubble center is
  // therefore around y=84 after perspective correction, not y=94. Each table
  // row is 32px high plus its 1px bottom border.
  const yStart = 84;
  const rowHeight = 33;
  return Array.from({ length: questionCount }, (_, questionIndex) => {
    const levels = xCenters.map(xCenter => {
      let centerSum = 0, centerCount = 0, backgroundSum = 0, backgroundCount = 0;
      for (let dy = -14; dy <= 14; dy++) for (let dx = -14; dx <= 14; dx++) {
        const radiusSquared = dx * dx + dy * dy;
        if (radiusSquared > 14 * 14) continue;
        const x = Math.round(xCenter + dx), y = Math.round(yStart + questionIndex * rowHeight + dy);
        const index = (y * image.width + x) * 4;
        const value = luminance(image.data, index);
        if (radiusSquared <= 4 * 4) { centerSum += value; centerCount++; }
        else if (radiusSquared >= 8 * 8) { backgroundSum += value; backgroundCount++; }
      }
      const centerMean = centerSum / Math.max(1, centerCount);
      const backgroundMean = backgroundSum / Math.max(1, backgroundCount);
      return Math.max(0, Math.min(1, (backgroundMean - centerMean) / 255));
    });
    const marked = levels.map((ratio, index) => ratio >= 0.10 ? index : -1).filter(index => index >= 0);
    return { respuesta: marked.length === 1 ? 'ABCD'[marked[0]] : '', estado: marked.length > 1 ? 'multiple' : marked.length === 0 ? 'blank' : 'read', confianza: Math.max(...levels), niveles: levels };
  });
}

function decodeOmrQrInfo(imageData) {
  const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
  if (!code?.data) throw new Error('No se leyó el QR del encabezado. Incluye completa la hoja de respuestas en la foto.');
  try { return { payload: JSON.parse(code.data), location: code.location }; } catch { throw new Error('El QR no contiene un folio ExamScan válido.'); }
}

export function decodeOmrQr(imageData) {
  return decodeOmrQrInfo(imageData).payload;
}

export function readOmrSheet(imageData, questionCount) {
  const qrInfo = decodeOmrQrInfo(imageData);
  const payload = qrInfo.payload;
  const threshold = findThreshold(imageData.data);
  const candidates = findMarkerCandidates(imageData.data, imageData.width, imageData.height);
  const qrBottom = Math.max(qrInfo.location.bottomLeftCorner.y, qrInfo.location.bottomRightCorner.y);
  const corners = chooseMarkerQuad(candidates, questionCount, qrBottom + Math.max(8, imageData.height * 0.015));
  if (!corners) throw new Error('No localicé las cuatro marcas negras debajo del QR. Encuadra la hoja completa, sin inclinarla demasiado y con buena iluminación.');
  const warped = warpPerspective(imageData.data, imageData.width, imageData.height, corners, questionCount);
  const answers = readBubbles(warped, questionCount);
  const preview = document.createElement('canvas');
  preview.width = warped.width; preview.height = warped.height;
  preview.getContext('2d').putImageData(new ImageData(warped.data, warped.width, warped.height), 0, 0);
  return { payload, answers, alignedPreview: preview.toDataURL('image/jpeg', 0.78), threshold };
}

