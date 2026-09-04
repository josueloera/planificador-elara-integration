// Servicio de Inteligencia Artificial para el Planificador Docente
// Genera materiales pedagógicos en la nube de forma transparente sin requerir configuración al docente

// Limpiador y extractor JSON robusto
export function cleanAndParseJson(rawText) {
  if (typeof rawText !== 'string') {
    if (typeof rawText === 'object' && rawText !== null) return rawText;
    throw new Error('Respuesta no válida del modelo.');
  }

  let text = rawText.trim();

  // 1. Quitar markdown fences ```json ... ``` o ``` ... ```
  if (text.startsWith('```json')) {
    text = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // 2. Extraer el primer objeto o arreglo JSON si viene rodeado de texto conversacional
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = text.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = text.lastIndexOf(']');
  }

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    text = text.substring(startIdx, endIdx + 1);
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    // Intentar reparar comas finales o comillas tipográficas
    const repaired = text
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/,\s*([\}\]])/g, '$1');
    return JSON.parse(repaired);
  }
}

// Generación transparente a través del proceso principal de Electron (seguro y sin exponer claves en bundle)
export async function generateCompletion({ systemPrompt, userPrompt, jsonMode = true }) {
  // 1. En Electron: invocar handler de backend protegido
  if (window.require) {
    try {
      const electron = window.require('electron');
      if (electron && electron.ipcRenderer) {
        const res = await electron.ipcRenderer.invoke('generate-ai-material', {
          prompt: userPrompt,
          systemPrompt: systemPrompt
        });

        if (res && res.success && res.text) {
          return jsonMode ? cleanAndParseJson(res.text) : res.text;
        } else if (res && !res.success) {
          throw new Error(res.error || 'Error al procesar solicitud con IA');
        }
      }
    } catch (ipcErr) {
      console.warn('[AI Service] Error en IPC:', ipcErr);
      throw ipcErr;
    }
  }

  throw new Error('La generación de materiales con IA requiere el entorno de la aplicación de escritorio.');
}
