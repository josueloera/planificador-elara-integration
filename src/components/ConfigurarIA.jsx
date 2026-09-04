import React, { useState, useEffect } from 'react';
import './ConfigurarIA.css';
import {
  getAIConfig,
  saveAIConfig,
  testAIConnection,
  detectOllamaModels
} from '../services/aiService';

const ConfigurarIA = ({ onCerrar, onGuardado }) => {
  const [config, setConfig] = useState(getAIConfig());
  const [showApiKey, setShowApiKey] = useState(false);
  const [probando, setProbando] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [detectingOllama, setDetectingOllama] = useState(false);
  const [availableOllamaModels, setAvailableOllamaModels] = useState([]);

  useEffect(() => {
    // Al montar, si el proveedor es Ollama, intentar detectar modelos automáticamente
    if (config.provider === 'ollama') {
      handleDetectOllama();
    }
  }, []);

  const handleSelectProvider = (prov) => {
    setConfig(prev => ({ ...prev, provider: prov }));
    setTestResult(null);
    if (prov === 'ollama') {
      handleDetectOllama();
    }
  };

  const handleDetectOllama = async () => {
    setDetectingOllama(true);
    try {
      const models = await detectOllamaModels(config.ollamaUrl || 'http://localhost:11434');
      setAvailableOllamaModels(models);
      if (models.length > 0 && !models.includes(config.ollamaModel)) {
        setConfig(prev => ({ ...prev, ollamaModel: models[0] }));
      }
    } catch (_) {
      setAvailableOllamaModels([]);
    } finally {
      setDetectingOllama(false);
    }
  };

  const handleTestConnection = async () => {
    setProbando(true);
    setTestResult(null);
    try {
      const res = await testAIConnection(config);
      setTestResult(res);
      if (res.success && res.models) {
        setAvailableOllamaModels(res.models);
      }
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Error al conectar' });
    } finally {
      setProbando(false);
    }
  };

  const handleGuardar = () => {
    saveAIConfig(config);
    if (onGuardado) onGuardado(config);
    if (onCerrar) onCerrar();
  };

  return (
    <div className="config-ia-overlay" onClick={onCerrar}>
      <div className="config-ia-modal" onClick={e => e.stopPropagation()}>
        <div className="config-ia-header">
          <h2 className="config-ia-title">
            <span>🤖</span> Configuración de Inteligencia Artificial (IA)
          </h2>
          <button className="config-ia-close" onClick={onCerrar} title="Cerrar">✕</button>
        </div>

        <div className="config-ia-body">
          <p className="config-ia-desc">
            Selecciona el motor de Inteligencia Artificial que generará tus exámenes, materiales didácticos, planeaciones y proyectos.
          </p>

          <div className="config-ia-providers">
            <button 
              type="button"
              className={`config-ia-prov-btn ${config.provider === 'ollama' ? 'selected' : ''}`}
              onClick={() => handleSelectProvider('ollama')}
            >
              <span className="config-ia-prov-icon">🦙</span>
              <div className="config-ia-prov-info">
                <span className="config-ia-prov-name">Ollama Local</span>
                <span className="config-ia-prov-badge">Básica por defecto • Sin internet</span>
              </div>
            </button>

            <button 
              type="button"
              className={`config-ia-prov-btn ${config.provider === 'openai' ? 'selected' : ''}`}
              onClick={() => handleSelectProvider('openai')}
            >
              <span className="config-ia-prov-icon">🟢</span>
              <div className="config-ia-prov-info">
                <span className="config-ia-prov-name">OpenAI (ChatGPT)</span>
                <span className="config-ia-prov-badge">Con tu API Key personal</span>
              </div>
            </button>

            <button 
              type="button"
              className={`config-ia-prov-btn ${config.provider === 'gemini' ? 'selected' : ''}`}
              onClick={() => handleSelectProvider('gemini')}
            >
              <span className="config-ia-prov-icon">🔵</span>
              <div className="config-ia-prov-info">
                <span className="config-ia-prov-name">Google Gemini</span>
                <span className="config-ia-prov-badge">Con tu API Key personal</span>
              </div>
            </button>

            <button 
              type="button"
              className={`config-ia-prov-btn ${config.provider === 'custom' ? 'selected' : ''}`}
              onClick={() => handleSelectProvider('custom')}
            >
              <span className="config-ia-prov-icon">⚙️</span>
              <div className="config-ia-prov-info">
                <span className="config-ia-prov-name">Servidor Propio</span>
                <span className="config-ia-prov-badge">DeepSeek, Groq, LM Studio</span>
              </div>
            </button>
          </div>

          {/* PANEL OLLAMA */}
          {config.provider === 'ollama' && (
            <div className="config-ia-panel">
              <div className="config-ia-field">
                <label className="config-ia-label">Dirección del Servidor Ollama:</label>
                <input 
                  type="text"
                  className="config-ia-input"
                  value={config.ollamaUrl || 'http://localhost:11434'}
                  onChange={e => setConfig({ ...config, ollamaUrl: e.target.value })}
                  placeholder="http://localhost:11434"
                />
              </div>

              <div className="config-ia-field">
                <label className="config-ia-label">
                  <span>Modelo de IA:</span>
                  <button 
                    type="button" 
                    className="config-ia-detect-btn" 
                    onClick={handleDetectOllama}
                    disabled={detectingOllama}
                  >
                    {detectingOllama ? 'Buscando...' : '🔄 Detectar modelos'}
                  </button>
                </label>

                {availableOllamaModels.length > 0 ? (
                  <select 
                    className="config-ia-select"
                    value={config.ollamaModel}
                    onChange={e => setConfig({ ...config, ollamaModel: e.target.value })}
                  >
                    {availableOllamaModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text"
                    className="config-ia-input"
                    value={config.ollamaModel || 'llama3'}
                    onChange={e => setConfig({ ...config, ollamaModel: e.target.value })}
                    placeholder="Ej. llama3.2, llama3, mistral, gemma2, phi3"
                  />
                )}
              </div>

              <div className="config-ia-tip">
                💡 <strong>Ollama es la IA básica local del planificador:</strong> Funciona 100% en tu equipo, es gratuita y no requiere internet. Si no tienes Ollama encendido, descárgalo gratis desde <code>ollama.com</code> y corre en tu terminal: <code>ollama run llama3.2</code>
              </div>
            </div>
          )}

          {/* PANEL OPENAI */}
          {config.provider === 'openai' && (
            <div className="config-ia-panel">
              <div className="config-ia-field">
                <label className="config-ia-label">API Key de OpenAI (ChatGPT):</label>
                <div className="config-ia-input-group">
                  <input 
                    type={showApiKey ? "text" : "password"}
                    className="config-ia-input"
                    value={config.openaiApiKey || ''}
                    onChange={e => setConfig({ ...config, openaiApiKey: e.target.value })}
                    placeholder="sk-proj-..."
                  />
                  <button 
                    type="button" 
                    className="config-ia-toggle-pwd" 
                    onClick={() => setShowApiKey(!showApiKey)}
                    title={showApiKey ? "Ocultar clave" : "Ver clave"}
                  >
                    {showApiKey ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="config-ia-field">
                <label className="config-ia-label">Modelo de OpenAI:</label>
                <select 
                  className="config-ia-select"
                  value={config.openaiModel || 'gpt-4o-mini'}
                  onChange={e => setConfig({ ...config, openaiModel: e.target.value })}
                >
                  <option value="gpt-4o-mini">gpt-4o-mini (Recomendado: Rápido y económico)</option>
                  <option value="gpt-4o">gpt-4o (Máxima inteligencia)</option>
                  <option value="gpt-3.5-turbo">gpt-3.5-turbo (Clásico)</option>
                </select>
              </div>

              <div className="config-ia-tip">
                🔑 Puedes obtener tu API Key en tu cuenta de <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" style={{color: '#2563eb'}}>platform.openai.com</a>.
              </div>
            </div>
          )}

          {/* PANEL GEMINI */}
          {config.provider === 'gemini' && (
            <div className="config-ia-panel">
              <div className="config-ia-field">
                <label className="config-ia-label">API Key de Google Gemini:</label>
                <div className="config-ia-input-group">
                  <input 
                    type={showApiKey ? "text" : "password"}
                    className="config-ia-input"
                    value={config.geminiApiKey || ''}
                    onChange={e => setConfig({ ...config, geminiApiKey: e.target.value })}
                    placeholder="AIzaSy..."
                  />
                  <button 
                    type="button" 
                    className="config-ia-toggle-pwd" 
                    onClick={() => setShowApiKey(!showApiKey)}
                    title={showApiKey ? "Ocultar clave" : "Ver clave"}
                  >
                    {showApiKey ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="config-ia-field">
                <label className="config-ia-label">Modelo de Gemini:</label>
                <select 
                  className="config-ia-select"
                  value={config.geminiModel || 'gemini-1.5-flash'}
                  onChange={e => setConfig({ ...config, geminiModel: e.target.value })}
                >
                  <option value="gemini-1.5-flash">gemini-1.5-flash (Recomendado: Rápido y gratuito)</option>
                  <option value="gemini-2.0-flash">gemini-2.0-flash (Última generación)</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro (Avanzado)</option>
                </select>
              </div>

              <div className="config-ia-tip">
                🔑 Obtén tu clave de Google Gemini de forma 100% gratuita en <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{color: '#2563eb'}}>aistudio.google.com</a>.
              </div>
            </div>
          )}

          {/* PANEL SERVIDOR PERSONALIZADO */}
          {config.provider === 'custom' && (
            <div className="config-ia-panel">
              <div className="config-ia-field">
                <label className="config-ia-label">URL del Endpoint (Base URL):</label>
                <input 
                  type="text"
                  className="config-ia-input"
                  value={config.customUrl || ''}
                  onChange={e => setConfig({ ...config, customUrl: e.target.value })}
                  placeholder="Ej. https://api.deepseek.com/v1 o https://api.groq.com/openai/v1"
                />
              </div>

              <div className="config-ia-field">
                <label className="config-ia-label">API Key (Opcional si es local):</label>
                <div className="config-ia-input-group">
                  <input 
                    type={showApiKey ? "text" : "password"}
                    className="config-ia-input"
                    value={config.customApiKey || ''}
                    onChange={e => setConfig({ ...config, customApiKey: e.target.value })}
                    placeholder="sk-..."
                  />
                  <button 
                    type="button" 
                    className="config-ia-toggle-pwd" 
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="config-ia-field">
                <label className="config-ia-label">Nombre del Modelo:</label>
                <input 
                  type="text"
                  className="config-ia-input"
                  value={config.customModel || ''}
                  onChange={e => setConfig({ ...config, customModel: e.target.value })}
                  placeholder="Ej. deepseek-chat, llama-3.1-70b-versatile"
                />
              </div>
            </div>
          )}

          {/* AREA DE PRUEBA */}
          <div className="config-ia-test-box">
            <button 
              type="button" 
              className="config-ia-btn-test"
              onClick={handleTestConnection}
              disabled={probando}
            >
              {probando ? '⏳ Probando conexión...' : '🔍 Probar Conexión de IA'}
            </button>

            {testResult && (
              <div className={`config-ia-test-alert ${testResult.success ? 'success' : 'error'}`}>
                {testResult.success ? '✅ ' : '❌ '} {testResult.message}
              </div>
            )}
          </div>
        </div>

        <div className="config-ia-footer">
          <button type="button" className="config-ia-btn-cancel" onClick={onCerrar}>
            Cerrar
          </button>
          <button type="button" className="config-ia-btn-save" onClick={handleGuardar}>
            💾 Guardar y Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigurarIA;
