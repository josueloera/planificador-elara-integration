// Servicio centralizado de Inteligencia Artificial para el Planificador Docente
// Soporta Ollama (IA básica local por defecto), OpenAI, Google Gemini y Servidores compatibles

const STORAGE_KEY = 'docente_ai_config';

export const DEFAULT_AI_CONFIG = {
  provider: 'ollama', // 'ollama' | 'openai' | 'gemini' | 'custom'
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3',
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  geminiApiKey: '',
  geminiModel: 'gemini-1.5-flash',
  customUrl: 'https://api.deepseek.com/v1',
  customApiKey: '',
  customModel: 'deepseek-chat'
};

export function getAIConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_AI_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Error al leer configuración de IA:', e);
  }
  return { ...DEFAULT_AI_CONFIG };
}

export function saveAIConfig(newConfig) {
  try {
    const merged = { ...getAIConfig(), ...newConfig };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('ai-config-changed', { detail: merged }));
    return merged;
  } catch (e) {
    console.error('Error al guardar configuración de IA:', e);
    return newConfig;
  }
}

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
    // Si falla, intentar limpiar saltos de línea inválidos en cadenas
    const sanitized = text.replace(/[\u0000-\u001F]+/g, (match) => {
      return match === '\n' || match === '\r' || match === '\t' ? match : '';
    });
    return JSON.parse(sanitized);
  }
}

// Detectar modelos disponibles en Ollama local
export async function detectOllamaModels(baseUrl = 'http://localhost:11434') {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`${cleanUrl}/api/tags`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const data = await res.json();
    if (data && Array.isArray(data.models)) {
      return data.models.map(m => m.name || m.model).filter(Boolean);
    }
    return [];
  } catch (e) {
    clearTimeout(timeoutId);
    return [];
  }
}

// Probar conexión con el proveedor configurado
export async function testAIConnection(customCfg = null) {
  const cfg = customCfg || getAIConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    if (cfg.provider === 'ollama') {
      const cleanUrl = (cfg.ollamaUrl || 'http://localhost:11434').replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`Ollama respondió con código ${res.status}`);
      const data = await res.json();
      const models = (data.models || []).map(m => m.name);
      if (models.length === 0) {
        return {
          success: false,
          message: 'Ollama está activo, pero no tienes modelos instalados. Descarga uno con: ollama pull llama3.2'
        };
      }
      return {
        success: true,
        message: `¡Ollama conectado correctamente! Modelos detectados: ${models.join(', ')}`,
        models
      };
    }

    if (cfg.provider === 'openai') {
      if (!cfg.openaiApiKey) {
        clearTimeout(timeoutId);
        return { success: false, message: 'Ingresa una API Key de OpenAI (comienza con sk-).' };
      }
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${cfg.openaiApiKey.trim()}` },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Error ${res.status} de OpenAI`);
      }
      return { success: true, message: '¡Conexión exitosa con OpenAI!' };
    }

    if (cfg.provider === 'gemini') {
      if (!cfg.geminiApiKey) {
        clearTimeout(timeoutId);
        return { success: false, message: 'Ingresa una API Key de Google Gemini.' };
      }
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cfg.geminiApiKey.trim()}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Error ${res.status} de Google Gemini`);
      }
      return { success: true, message: '¡Conexión exitosa con Google Gemini!' };
    }

    if (cfg.provider === 'custom') {
      if (!cfg.customUrl) {
        clearTimeout(timeoutId);
        return { success: false, message: 'Ingresa la URL del servidor personalizado.' };
      }
      const cleanUrl = cfg.customUrl.replace(/\/+$/, '');
      const headers = { 'Content-Type': 'application/json' };
      if (cfg.customApiKey) headers['Authorization'] = `Bearer ${cfg.customApiKey.trim()}`;
      
      const res = await fetch(`${cleanUrl}/models`, {
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`El servidor respondió con código ${res.status}`);
      return { success: true, message: '¡Conexión exitosa con el servidor personalizado!' };
    }

    clearTimeout(timeoutId);
    return { success: false, message: 'Proveedor no reconocido.' };
  } catch (err) {
    clearTimeout(timeoutId);
    let msg = err.message || 'Error de conexión';
    if (err.name === 'AbortError') msg = 'Tiempo de espera agotado al conectar con el servidor.';
    if (cfg.provider === 'ollama') {
      msg = `No se pudo conectar a Ollama en ${cfg.ollamaUrl || 'http://localhost:11434'}. Asegúrate de haber iniciado la aplicación de Ollama en tu computadora.`;
    }
    return { success: false, message: msg };
  }
}

// Generación de texto o JSON con el motor configurado
export async function generateCompletion({ systemPrompt, userPrompt, temperature = 0.7, jsonMode = true }) {
  const cfg = getAIConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s para modelos locales en CPU

  try {
    // ----------------------------------------------------
    // 1. OLLAMA (Local por defecto)
    // ----------------------------------------------------
    if (cfg.provider === 'ollama') {
      const cleanUrl = (cfg.ollamaUrl || 'http://localhost:11434').replace(/\/+$/, '');
      
      // Auto-determinar modelo si no está seleccionado
      let model = cfg.ollamaModel || 'llama3';
      try {
        const available = await detectOllamaModels(cleanUrl);
        if (available.length > 0 && !available.includes(model)) {
          // Si el modelo guardado no existe, usar el primer modelo instalado
          model = available[0];
        }
      } catch (_) {}

      const bodyPayload = {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        options: { temperature: temperature }
      };

      if (jsonMode) {
        bodyPayload.format = 'json';
      }

      let res;
      try {
        res = await fetch(`${cleanUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
          signal: controller.signal
        });
      } catch (networkErr) {
        throw new Error(`No se pudo conectar con Ollama en ${cleanUrl}. Asegúrate de que Ollama esté abierto en segundo plano.`);
      }

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Error de Ollama (${res.status}): ${errText || res.statusText}`);
      }

      const data = await res.json();
      const content = data.message?.content || data.response || '';
      if (!content) throw new Error('Ollama devolvió una respuesta vacía.');

      return jsonMode ? cleanAndParseJson(content) : content;
    }

    // ----------------------------------------------------
    // 2. OPENAI
    // ----------------------------------------------------
    if (cfg.provider === 'openai') {
      const apiKey = cfg.openaiApiKey || window.openaiApiKey || '';
      if (!apiKey) {
        throw new Error('No se ha configurado la API Key de OpenAI. Ve a "Configurar IA" para ingresarla.');
      }

      const payload = {
        model: cfg.openaiModel || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: temperature
      };

      if (jsonMode) {
        payload.response_format = { type: 'json_object' };
      }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Error ${res.status} de OpenAI`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      return jsonMode ? cleanAndParseJson(content) : content;
    }

    // ----------------------------------------------------
    // 3. GOOGLE GEMINI
    // ----------------------------------------------------
    if (cfg.provider === 'gemini') {
      const apiKey = cfg.geminiApiKey || '';
      if (!apiKey) {
        throw new Error('No se ha configurado la API Key de Google Gemini. Ve a "Configurar IA" para ingresarla.');
      }

      const model = cfg.geminiModel || 'gemini-1.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

      const payload = {
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
        ],
        generationConfig: {
          temperature: temperature
        }
      };

      if (jsonMode) {
        payload.generationConfig.responseMimeType = 'application/json';
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Error ${res.status} de Google Gemini`);
      }

      const data = await res.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return jsonMode ? cleanAndParseJson(content) : content;
    }

    // ----------------------------------------------------
    // 4. SERVIDOR PERSONALIZADO / COMPATIBLE (DeepSeek, Groq, etc.)
    // ----------------------------------------------------
    if (cfg.provider === 'custom') {
      const baseUrl = (cfg.customUrl || '').replace(/\/+$/, '');
      if (!baseUrl) throw new Error('No se ha especificado la URL del servidor personalizado.');

      const headers = { 'Content-Type': 'application/json' };
      if (cfg.customApiKey) headers['Authorization'] = `Bearer ${cfg.customApiKey.trim()}`;

      const payload = {
        model: cfg.customModel || 'default',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: temperature
      };

      if (jsonMode) {
        payload.response_format = { type: 'json_object' };
      }

      const chatEndpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

      const res = await fetch(chatEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Error ${res.status} del servidor personalizado`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      return jsonMode ? cleanAndParseJson(content) : content;
    }

    throw new Error(`Proveedor de IA desconocido: ${cfg.provider}`);

  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[aiService] Error en generateCompletion:', error);
    throw error;
  }
}
