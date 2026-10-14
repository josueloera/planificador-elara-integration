async function generateTeacherResponse({ key, model = 'gemini-3.8-flash', groqKey, prompt, systemPrompt, fetchImpl = fetch }) {
  const providers = [{ name: 'gemini', key }, { name: 'groq', key: groqKey }];
  for (const provider of providers) {
    if (!provider.key) continue;
    try {
      const gemini = provider.name === 'gemini';
      const response = await fetchImpl(gemini
        ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
        : 'https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(gemini ? { 'x-goog-api-key': provider.key } : { Authorization: `Bearer ${provider.key}` }) },
        signal: AbortSignal.timeout(60000),
        body: JSON.stringify(gemini ? {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, responseMimeType: 'application/json', maxOutputTokens: 12000 }
        } : {
          model: 'openai/gpt-oss-120b', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
          temperature: 0.5, max_completion_tokens: 12000, response_format: { type: 'json_object' }
        })
      });
      if (!response.ok) continue;
      const data = await response.json();
      const result = gemini ? data.candidates?.[0] : data.choices?.[0];
      const text = gemini ? (result?.content?.parts || []).filter(part => !part.thought && typeof part.text === 'string').map(part => part.text).join('') : result?.message?.content;
      if ((gemini ? result?.finishReason !== 'STOP' : result?.finish_reason !== 'stop') || typeof text !== 'string' || !text.trim()) continue;
      try { JSON.parse(text); } catch { continue; }
      return { success: true, text, provider: provider.name };
    } catch {
      // Network failures or timeouts may be specific to one provider.
      continue;
    }
  }
  return { success: false, error: 'El servicio de IA está temporalmente saturado o no disponible. Inténtalo más tarde.' };
}
module.exports = { generateTeacherResponse };
