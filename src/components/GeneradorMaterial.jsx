
// Generador local de respaldo para la Nueva Escuela Mexicana (NEM) cuando no hay API Key o falla la red
function generarMaterialLocal(tipoMaterial, tema, grado, cantidadReactivos) {
  const palabrasTema = tema
    .toUpperCase()
    .replace(/[^A-ZÁÉÍÓÚÑ\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3);

  if (tipoMaterial === 'EXAMEN_OPCION_MULTIPLE' || tipoMaterial === 'EXAMEN_TRIMESTRAL') {
    const reactivos = [];
    for (let i = 1; i <= (cantidadReactivos || 5); i++) {
      reactivos.push({
        pregunta: `${i}. Con relación al tema "${tema}", ¿cuál de las siguientes acciones refleja una solución colaborativa adecuada en la comunidad escolar?`,
        icono_fontawesome: "",
        opciones: [
          `A) Dialogar y proponer proyectos grupales que beneficien al entorno escolar.`,
          `B) Realizar las actividades de forma aislada sin considerar las necesidades del aula.`,
          `C) Memorizar los conceptos sin aplicarlos en situaciones de la vida cotidiana.`
        ],
        respuesta_correcta: 0
      });
    }
    return {
      titulo: `${tipoMaterial === 'EXAMEN_TRIMESTRAL' ? 'Examen Trimestral NEM' : 'Evaluación Formativa'} (${grado || 3}º Primaria): ${tema}`,
      preguntas: reactivos
    };
  }

  if (tipoMaterial === 'PREGUNTAS_ABIERTAS') {
    const preguntas = [];
    for (let i = 1; i <= (cantidadReactivos || 5); i++) {
      preguntas.push({
        pregunta: `${i}. Analiza y describe cómo se aplica "${tema}" en tu vida diaria y en tu comunidad escolar.`,
        icono_fontawesome: ""
      });
    }
    return {
      titulo: `Cuestionario de Reflexión Didáctica (${grado || 3}º Primaria): ${tema}`,
      preguntas
    };
  }

  if (tipoMaterial === 'SOPA_LETRAS_VOCABULARIO') {
    const base = palabrasTema.length >= 3 ? palabrasTema : ['COMUNIDAD', 'PROYECTO', 'SABERES', 'ETICA', 'VALORES', 'HISTORIA', 'CULTURA', 'DIALOGO'];
    const palabras = base.slice(0, cantidadReactivos || 6).map((p, i) => ({
      palabra: p.normalize("NFD").replace(/[̀-ͯ]/g, ""),
      pista: `Concepto clave ${i + 1} del tema "${tema}"`
    }));
    return {
      titulo: `Sopa de Letras Didáctica: ${tema}`,
      palabras
    };
  }

  if (tipoMaterial === 'CRUCIGRAMA') {
    const base = palabrasTema.length >= 3 ? palabrasTema : ['CULTURA', 'IDENTIDAD', 'COMUNIDAD', 'ESCUELA', 'DIALOGO'];
    const palabras = base.slice(0, cantidadReactivos || 5).map((p, i) => ({
      palabra: p.normalize("NFD").replace(/[̀-ͯ]/g, ""),
      pista: `Elemento representativo ${i + 1} de "${tema}"`
    }));
    return {
      titulo: `Crucigrama Didáctico (${grado || 3}º Primaria): ${tema}`,
      palabras
    };
  }

  if (tipoMaterial === 'RUBRICA_EVALUACION') {
    return {
      titulo: `Rúbrica Formativa Analítica NEM: ${tema}`,
      criterios: [
        {
          criterio: "Comprensión del Tema",
          excelente: "Demuestra dominio completo y argumenta con claridad.",
          bueno: "Comprende los aspectos principales y responde adecuadamente.",
          suficiente: "Muestra comprensión parcial del tema.",
          insuficiente: "Presenta dificultades para comprender los conceptos básicos."
        },
        {
          criterio: "Aplicación en la Comunidad",
          excelente: "Relaciona el aprendizaje con situaciones reales de su entorno.",
          bueno: "Identifica ejemplos prácticos del contexto comunitario.",
          suficiente: "Menciona ejemplos sencillos con apoyo del docente.",
          insuficiente: "No logra relacionar el contenido con su vida cotidiana."
        },
        {
          criterio: "Trabajo Colaborativo",
          excelente: "Participa activamente, escucha y aporta al grupo respetuosamente.",
          bueno: "Colabora de forma adecuada en las actividades de equipo.",
          suficiente: "Participa cuando se le requiere expresamente.",
          insuficiente: "Muestra desinterés en el trabajo colectivo."
        }
      ]
    };
  }

  return { titulo: tema, preguntas: [] };
}

import React, { useState, useEffect } from 'react';
import { generarSopaDeLetras } from '../utils/juegosLogic';
import clg from 'crossword-layout-generator';
import { generateCompletion, getAIConfig } from '../services/aiService';
import ConfigurarIA from './ConfigurarIA';

const GeneradorMaterial = ({ onVolver, pdasDisponibles = [], grado }) => {
  const [tema, setTema] = useState('');
  const [tipoMaterial, setTipoMaterial] = useState('EXAMEN_OPCION_MULTIPLE');
  const [cantidadReactivos, setCantidadReactivos] = useState(5);
  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [errorIA, setErrorIA] = useState('');
  const [showConfigIA, setShowConfigIA] = useState(false);
  const [aiConfig, setAiConfig] = useState(getAIConfig());

  useEffect(() => {
    const handleConfigChange = (e) => {
      if (e.detail) setAiConfig(e.detail);
    };
    window.addEventListener('ai-config-changed', handleConfigChange);
    return () => window.removeEventListener('ai-config-changed', handleConfigChange);
  }, []);

  // Filtrar PDAs del grado actual (aproximado)
  const pdasSugeridos = pdasDisponibles.slice(0, 10); // Solo mostramos algunos por simplicidad

  const getProviderBadge = () => {
    if (aiConfig.provider === 'ollama') return `🦙 Ollama (${aiConfig.ollamaModel || 'llama3'})`;
    if (aiConfig.provider === 'openai') return `🟢 OpenAI (${aiConfig.openaiModel || 'gpt-4o-mini'})`;
    if (aiConfig.provider === 'gemini') return `🔵 Gemini (${aiConfig.geminiModel || 'gemini-1.5-flash'})`;
    if (aiConfig.provider === 'custom') return `⚙️ Servidor Propio`;
    return '🤖 Configurar IA';
  };

  const aplicarResultado = (tipo, parsed) => {
    let sopaData = null;
    let cruciData = null;
    if (tipo === 'SOPA_LETRAS_VOCABULARIO' && parsed.palabras) {
      sopaData = generarSopaDeLetras(parsed.palabras, 15);
    }
    if (tipo === 'CRUCIGRAMA' && parsed.palabras) {
      const clgInput = parsed.palabras.map(p => ({ answer: p.palabra.toUpperCase().replace(/[^A-Z]/g,''), clue: p.pista }));
      cruciData = clg.generateLayout(clgInput);
    }
    setResultado({ tipo, data: parsed, sopaData, cruciData });
  };

  const usarGeneradorLocal = () => {
    setErrorIA('');
    const parsedLocal = generarMaterialLocal(tipoMaterial, tema, grado, cantidadReactivos);
    aplicarResultado(tipoMaterial, parsedLocal);
  };

  const generarConIA = async () => {
    if (!tema.trim()) {
      alert("Por favor, ingresa un tema o selecciona un PDA.");
      return;
    }
    
    setGenerando(true);
    setResultado(null);
    setErrorIA('');

    let systemPrompt = "Eres un asistente experto en creación de material didáctico para la Nueva Escuela Mexicana (NEM). Responde ÚNICAMENTE con el objeto JSON solicitado, sin explicaciones ni markdown.";
    let userPrompt = "";

    if (tipoMaterial === 'EXAMEN_OPCION_MULTIPLE') {
      systemPrompt += ' Devuelve ÚNICAMENTE un JSON con este formato: { "titulo": "...", "preguntas": [ { "pregunta": "...", "icono_fontawesome": "", "opciones": ["A) ...", "B) ...", "C) ..."], "respuesta_correcta": 0 } ] }. El arreglo "preguntas" DEBE tener la cantidad exacta de elementos solicitados.';
      userPrompt = `Genera un examen de opción múltiple con EXACTAMENTE ${cantidadReactivos} preguntas sobre el tema: "${tema}". Adecuado para ${grado}º grado de primaria. IMPORTANTE: Preguntas contextualizadas en situaciones prácticas de la vida comunitaria y escolar en México.`;
    } else if (tipoMaterial === 'EXAMEN_TRIMESTRAL') {
      systemPrompt += ' Devuelve ÚNICAMENTE un JSON con este formato: { "titulo": "...", "preguntas": [ { "pregunta": "...", "icono_fontawesome": "", "opciones": ["A) ...", "B) ...", "C) ..."], "respuesta_correcta": 0 } ] }. El arreglo "preguntas" DEBE tener la cantidad solicitada.';
      userPrompt = `Genera un Examen Trimestral integrador con EXACTAMENTE ${cantidadReactivos} preguntas sobre el tema: "${tema}". Para ${grado}º grado de primaria, con casos prácticos y formativos de la NEM.`;
    } else if (tipoMaterial === 'PREGUNTAS_ABIERTAS') {
      systemPrompt += ' Devuelve ÚNICAMENTE un JSON con este formato: { "titulo": "...", "preguntas": [ { "pregunta": "...", "icono_fontawesome": "" } ] }.';
      userPrompt = `Genera un cuestionario de EXACTAMENTE ${cantidadReactivos} preguntas abiertas de análisis y reflexión sobre el tema: "${tema}" para ${grado}º grado de primaria.`;
    } else if (tipoMaterial === 'SOPA_LETRAS_VOCABULARIO') {
      systemPrompt += ' Devuelve ÚNICAMENTE un JSON con este formato: { "titulo": "...", "palabras": [ { "palabra": "PALABRA", "pista": "Definición..." } ] }. Las palabras deben ser de una sola palabra sin espacios y en mayúsculas.';
      userPrompt = `Genera una lista de EXACTAMENTE ${cantidadReactivos} palabras clave esenciales y sus definiciones para armar una sopa de letras sobre el tema: "${tema}".`;
    } else if (tipoMaterial === 'CRUCIGRAMA') {
      systemPrompt += ' Devuelve ÚNICAMENTE un JSON con este formato: { "titulo": "...", "palabras": [ { "palabra": "PALABRA", "pista": "Pista breve..." } ] }. Las palabras deben ser de una sola palabra sin espacios y en mayúsculas.';
      userPrompt = `Genera una lista de EXACTAMENTE ${cantidadReactivos} palabras clave y pistas cortas de crucigrama sobre el tema: "${tema}" para ${grado}º grado.`;
    } else if (tipoMaterial === 'RUBRICA_EVALUACION') {
      systemPrompt += ' Devuelve ÚNICAMENTE un JSON con este formato: { "titulo": "...", "criterios": [ { "criterio": "...", "excelente": "...", "bueno": "...", "suficiente": "...", "insuficiente": "..." } ] }.';
      userPrompt = `Genera una rúbrica formativa analítica con enfoque NEM con 5 criterios evaluativos detallados para el tema: "${tema}", adecuada para ${grado}º grado de primaria.`;
    }

    try {
      const parsed = await generateCompletion({
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        jsonMode: true
      });

      aplicarResultado(tipoMaterial, parsed);
    } catch (error) {
      console.warn("Fallo de generación con IA:", error);
      setErrorIA(error.message || 'Error al comunicarse con el motor de IA.');
    } finally {
      setGenerando(false);
    }
  };

  const imprimirMaterial = () => {
    window.print();
  };

  return (
    <div className="pantalla-dosificador" style={{ padding: '20px', overflowY: 'auto' }}>
      <div className="header-dosificador" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>🧩 Generador de Material Didáctico IA</h2>
          <button 
            type="button"
            onClick={() => setShowConfigIA(true)}
            style={{
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '0.85rem',
              fontWeight: '600',
              color: '#1e293b',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
            title="Haz clic para cambiar o configurar el motor de IA (Ollama, OpenAI, Gemini, etc.)"
          >
            <span>Motor:</span>
            <span style={{ color: '#2563eb' }}>{getProviderBadge()}</span>
            <span>⚙️</span>
          </button>
        </div>
        <button className="btn-volver" onClick={onVolver} style={{ background: '#e67e22' }}>
          ↩ Volver al Menú
        </button>
      </div>

      {errorIA && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '10px',
          padding: '14px 18px',
          color: '#991b1b',
          marginBottom: '20px',
          fontSize: '0.9rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <div style={{ marginBottom: '10px', fontWeight: '500', lineHeight: 1.45 }}>
            ⚠️ <strong>No se pudo generar con IA:</strong> {errorIA}
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              type="button"
              onClick={() => setShowConfigIA(true)}
              style={{
                background: '#2563eb',
                color: 'white',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}
            >
              🤖 Configurar mi IA
            </button>
            <button 
              type="button"
              onClick={usarGeneradorLocal}
              style={{
                background: '#475569',
                color: 'white',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              📄 Usar Plantilla Básica Offline
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '20px', '@media print': { display: 'none' } }} className="no-print">
        {/* Panel Izquierdo: Configuración */}
        <div style={{ flex: '1', background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h3>1. Elige el Tema</h3>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>Escribe el tema libremente o pega un PDA:</p>
          <textarea 
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            placeholder="Ejemplo: La Revolución Mexicana, El Ciclo del Agua, Fracciones..."
            style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '20px' }}
          />

          <h3>2. Tipo de Material</h3>
          <select 
            value={tipoMaterial} 
            onChange={(e) => setTipoMaterial(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '20px', fontSize: '1rem' }}
          >
            <option value="EXAMEN_OPCION_MULTIPLE">📝 Examen Rápido (Opción Múltiple)</option>
            <option value="EXAMEN_TRIMESTRAL">🏆 Examen Trimestral Integrador</option>
            <option value="PREGUNTAS_ABIERTAS">❓ Cuestionario (Preguntas Abiertas)</option>
            <option value="SOPA_LETRAS_VOCABULARIO">🔠 Sopa de Letras</option>
            <option value="CRUCIGRAMA">➕ Crucigrama Clásico</option>
            <option value="RUBRICA_EVALUACION">📊 Rúbrica de Evaluación</option>
          </select>

          {(tipoMaterial.includes('EXAMEN') || tipoMaterial.includes('PREGUNTAS')) && (
            <>
              <h3>3. Cantidad de Reactivos</h3>
              <input 
                type="number" 
                min="5" max="30" 
                value={cantidadReactivos} 
                onChange={(e) => setCantidadReactivos(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '20px', fontSize: '1rem' }}
              />
            </>
          )}

          <button 
            onClick={generarConIA}  
            disabled={generando}
            style={{ 
              width: '100%', padding: '15px', background: generando ? '#95a5a6' : '#6C5CE7', 
              color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', cursor: generando ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {generando ? '🤖 Generando magia...' : '✨ Generar Material'}
          </button>
        </div>

        {/* Panel Derecho: Sugerencias */}
        <div style={{ flex: '1', background: '#f8f9fa', padding: '20px', borderRadius: '10px', border: '1px dashed #ccc' }}>
          <h3>💡 Inspiración (Tus PDAs)</h3>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>Haz clic en un PDA para usarlo como tema:</p>
          <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pdasSugeridos.length > 0 ? pdasSugeridos.map((pda, i) => (
              <div 
                key={i} 
                onClick={() => setTema(pda.descripcion)}
                style={{ padding: '10px', background: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', border: '1px solid #eee' }}
              >
                {pda.descripcion}
              </div>
            )) : (
              <p>No hay PDAs cargados. Escribe el tema manualmente.</p>
            )}
          </div>
        </div>
      </div>

      {/* Área de Visualización del Resultado */}
      {resultado && (
        <div style={{ marginTop: '30px', background: 'white', padding: '40px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} className="print-area">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
            <h3 style={{ color: '#2ecc71' }}>✅ Material Listo</h3>
            <button onClick={imprimirMaterial} style={{ padding: '10px 20px', background: '#34495e', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>🖨️ Imprimir / Guardar PDF</button>
          </div>
          
          <hr style={{ margin: '20px 0' }} className="no-print" />

          {/* Renderizado de Examen Opción Múltiple o Trimestral */}
          {(resultado.tipo === 'EXAMEN_OPCION_MULTIPLE' || resultado.tipo === 'EXAMEN_TRIMESTRAL') && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '1.5rem', textTransform: 'uppercase' }}>{resultado.data.titulo}</h1>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', borderBottom: '1px solid #000', paddingBottom: '5px' }}>
                  <span>Nombre del alumno: _________________________________________</span>
                  <span>Fecha: ______________</span>
                </div>
              </div>
              
              {resultado.data.preguntas.map((q, i) => (
                <div key={i} style={{ marginBottom: '35px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <div style={{ flex: '1' }}>
                    <p style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '10px' }}>{i + 1}. {q.pregunta}</p>
                    <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {q.opciones.map((op, j) => (
                        <label key={j} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '15px', height: '15px', border: '1px solid #000', borderRadius: '50%' }}></div>
                          {op}
                        </label>
                      ))}
                    </div>
                  </div>
                  {q.icono_fontawesome && q.icono_fontawesome.trim() !== '' && q.icono_fontawesome !== 'clase_fa_o_vacio' && (
                    <div style={{ width: '150px', height: '150px', border: '2px solid #333', padding: '10px', borderRadius: '8px', background: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <i className={q.icono_fontawesome} style={{ fontSize: '5rem', color: '#333' }}></i>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Renderizado de Preguntas Abiertas */}
          {resultado.tipo === 'PREGUNTAS_ABIERTAS' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '1.5rem', textTransform: 'uppercase' }}>{resultado.data.titulo}</h1>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', borderBottom: '1px solid #000', paddingBottom: '5px' }}>
                  <span>Nombre del alumno: _________________________________________</span>
                  <span>Fecha: ______________</span>
                </div>
              </div>
              
              {resultado.data.preguntas.map((q, i) => (
                <div key={i} style={{ marginBottom: '50px', display: 'flex', gap: '20px' }}>
                  <div style={{ flex: '1' }}>
                    <p style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '15px' }}>{i + 1}. {q.pregunta}</p>
                    <div style={{ borderBottom: '1px dashed #ccc', height: '30px' }}></div>
                    <div style={{ borderBottom: '1px dashed #ccc', height: '30px' }}></div>
                    <div style={{ borderBottom: '1px dashed #ccc', height: '30px' }}></div>
                  </div>
                  {q.icono_fontawesome && q.icono_fontawesome.trim() !== '' && q.icono_fontawesome !== 'clase_fa_o_vacio' && (
                    <div style={{ width: '120px', height: '120px', border: '2px solid #333', padding: '10px', borderRadius: '8px', background: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <i className={q.icono_fontawesome} style={{ fontSize: '4rem', color: '#333' }}></i>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Renderizado de Vocabulario (Sopa de Letras) */}
          {resultado.tipo === 'SOPA_LETRAS_VOCABULARIO' && resultado.sopaData && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '1.5rem', textTransform: 'uppercase' }}>Sopa de Letras: {resultado.data.titulo}</h1>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', borderBottom: '1px solid #000', paddingBottom: '5px' }}>
                  <span>Nombre del alumno: _________________________________________</span>
                  <span>Fecha: ______________</span>
                </div>
              </div>
              
              {/* Cuadrícula Sopa de Letras */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${resultado.sopaData.grid.length}, 30px)`, gap: '2px', padding: '15px', border: '2px solid #333', background: '#f8f9fa' }}>
                  {resultado.sopaData.grid.map((row, r) => 
                    row.map((letter, c) => (
                      <div key={`${r}-${c}`} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', background: 'white', border: '1px solid #eee' }}>
                        {letter}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <h3>Encuentra las siguientes palabras respondiendo a las pistas:</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                {resultado.sopaData.palabrasColocadas.map((p, i) => (
                  <div key={i} style={{ padding: '10px', border: '1px dashed #ccc', borderRadius: '5px' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#333' }}>{i + 1}. {p.pista}</p>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.7rem', color: '#999' }}>( _ _ _ _ )</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Renderizado de Crucigrama */}
          {resultado.tipo === 'CRUCIGRAMA' && resultado.cruciData && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '1.5rem', textTransform: 'uppercase' }}>Crucigrama: {resultado.data.titulo}</h1>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', borderBottom: '1px solid #000', paddingBottom: '5px' }}>
                  <span>Nombre del alumno: _________________________________________</span>
                  <span>Fecha: ______________</span>
                </div>
              </div>
              
              {/* Cuadrícula Crucigrama */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${resultado.cruciData.cols}, 30px)`, gap: '0px', padding: '15px', background: 'white' }}>
                  {resultado.cruciData.table.map((row, r) => 
                    row.map((letter, c) => {
                      const isBlank = letter === '-';
                      // Buscar si esta celda es el inicio de una palabra
                      const wordAtPos = resultado.cruciData.result.find(res => (res.starty - 1 === r && res.startx - 1 === c));
                      return (
                        <div key={`${r}-${c}`} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: isBlank ? 'black' : 'white', border: isBlank ? 'none' : '1px solid black' }}>
                          {!isBlank && wordAtPos && (
                            <span style={{ position: 'absolute', top: '1px', left: '2px', fontSize: '0.55rem', fontWeight: 'bold' }}>{wordAtPos.position}</span>
                          )}
                          {/* {!isBlank && <span style={{opacity:0.1}}>{letter}</span>} */}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <h3>Pistas:</h3>
              <div style={{ display: 'flex', gap: '40px', marginTop: '20px' }}>
                <div style={{ flex: 1 }}>
                  <h4>Horizontales</h4>
                  {resultado.cruciData.result.filter(r => r.orientation === 'across').map((p, i) => (
                    <p key={i} style={{ margin: '5px 0', fontSize: '0.9rem' }}><strong>{p.position}.</strong> {p.clue}</p>
                  ))}
                </div>
                <div style={{ flex: 1 }}>
                  <h4>Verticales</h4>
                  {resultado.cruciData.result.filter(r => r.orientation === 'down').map((p, i) => (
                    <p key={i} style={{ margin: '5px 0', fontSize: '0.9rem' }}><strong>{p.position}.</strong> {p.clue}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Renderizado de Rúbrica de Evaluación */}
          {resultado.tipo === 'RUBRICA_EVALUACION' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '1.5rem', textTransform: 'uppercase' }}>{resultado.data.titulo}</h1>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', borderBottom: '1px solid #000', paddingBottom: '5px' }}>
                  <span>Nombre del alumno: _________________________________________</span>
                  <span>Fecha: ______________</span>
                </div>
              </div>
              
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginTop: '20px' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ border: '1px solid #000', padding: '10px' }}>Criterio</th>
                    <th style={{ border: '1px solid #000', padding: '10px' }}>Excelente (4)</th>
                    <th style={{ border: '1px solid #000', padding: '10px' }}>Bueno (3)</th>
                    <th style={{ border: '1px solid #000', padding: '10px' }}>Suficiente (2)</th>
                    <th style={{ border: '1px solid #000', padding: '10px' }}>Insuficiente (1)</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.data.criterios.map((c, i) => (
                    <tr key={i}>
                      <td style={{ border: '1px solid #000', padding: '10px', fontWeight: 'bold' }}>{c.criterio}</td>
                      <td style={{ border: '1px solid #000', padding: '10px', fontSize: '0.9rem' }}>{c.excelente}</td>
                      <td style={{ border: '1px solid #000', padding: '10px', fontSize: '0.9rem' }}>{c.bueno}</td>
                      <td style={{ border: '1px solid #000', padding: '10px', fontSize: '0.9rem' }}>{c.suficiente}</td>
                      <td style={{ border: '1px solid #000', padding: '10px', fontSize: '0.9rem' }}>{c.insuficiente}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '20px', textAlign: 'right' }}>
                <strong>Puntaje Total: ____ / {resultado.data.criterios.length * 4}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {showConfigIA && (
        <ConfigurarIA 
          onCerrar={() => setShowConfigIA(false)} 
          onGuardado={(cfg) => setAiConfig(cfg)} 
        />
      )}
    </div>
  );
};

export default GeneradorMaterial;
