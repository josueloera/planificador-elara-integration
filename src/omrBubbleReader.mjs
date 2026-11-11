const outputWidth = 720;
export const omrRowHeight = 33;
const luminance = (data, index) => data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;

export function readBubbles(image, questionCount) {
  const gridWidth = (outputWidth - 24) * 0.78;
  const gridX = 12 + (outputWidth - 24 - gridWidth) / 2;
  const firstColumnWidth = gridWidth - 4 * 38;
  const xCenters = [0, 1, 2, 3].map(i => gridX + firstColumnWidth + 19 + i * 38 - 8);
  // Keep the sampler inside the printed bubble; the center-only core misses
  // light pencil marks. The outer ring begins beyond the inked bubble outline.
  const yStart = 88;
  return Array.from({ length: questionCount }, (_, questionIndex) => {
    const levels = xCenters.map(xCenter => {
      let centerSum = 0, centerCount = 0, backgroundSum = 0, backgroundCount = 0;
      for (let dy = -14; dy <= 14; dy++) for (let dx = -14; dx <= 14; dx++) {
        const radiusSquared = dx * dx + dy * dy;
        if (radiusSquared > 14 * 14) continue;
        const x = Math.round(xCenter + dx), y = Math.round(yStart + questionIndex * omrRowHeight + dy);
        const index = (y * image.width + x) * 4;
        const value = luminance(image.data, index);
        if (radiusSquared <= 7 * 7) { centerSum += value; centerCount++; }
        else if (radiusSquared >= 11 * 11) { backgroundSum += value; backgroundCount++; }
      }
      const centerMean = centerSum / Math.max(1, centerCount);
      const backgroundMean = backgroundSum / Math.max(1, backgroundCount);
      return Math.max(0, Math.min(1, (backgroundMean - centerMean) / Math.max(160, backgroundMean)));
    });

    const ranked = levels.map((ratio, index) => ({ ratio, index })).sort((a, b) => b.ratio - a.ratio);
    const strongest = ranked[0];
    const second = ranked[1]?.ratio || 0;
    const margin = strongest.ratio - second;
    const competingMarks = second >= 0.055 && (margin < 0.008 || (second >= 0.08 && margin < 0.035));
    const confidentSingle = strongest.ratio >= 0.05 && margin >= 0.008 && !competingMarks;
    const respuesta = confidentSingle ? 'ABCD'[strongest.index] : '';
    const estado = respuesta ? 'read' : competingMarks ? 'multiple' : 'blank';
    return { respuesta, estado, confianza: strongest.ratio, niveles: levels };
  });
}
