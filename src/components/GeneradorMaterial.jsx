
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

import React, { useState } from 'react';
import { generarSopaDeLetras } from '../utils/juegosLogic';
import clg from 'crossword-layout-generator';

// =====================================================================
// ⚠️ ATENCIÓN: LA LLAVE SE LEE DESDE EL ARCHIVO OCULTO .env O CLIPPY
// =====================================================================
const MI_OPENAI_API_KEY = window.openaiApiKey || "";

const GeneradorMaterial = ({ onVolver, pdasDisponibles = [], grado }) => {
  const [tema, setTema] = useState('');
  const [tipoMaterial, setTipoMaterial] = useState('EXAMEN_OPCION_MULTIPLE');
  const [cantidadReactivos, setCantidadReactivos] = useState(5);
  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState(null);

  // Filtrar PDAs del grado actual (aproximado)
  const pdasSugeridos = pdasDisponibles.slice(0, 10); // Solo mostramos algunos por simplicidad

  const generarConIA = async () => {
    if (!tema.trim()) {
      alert("Por favor, ingresa un tema o selecciona un PDA.");
      return;
    }
    
    setGenerando(true);
    setResultado(null);

    let systemPrompt = "Eres un asistente experto en creación de material didáctico para la Nueva Escuela Mexicana.";
    let userPrompt = "";

    if (tipoMaterial === 'EXAMEN_OPCION_MULTIPLE') {
      systemPrompt += " Devuelve ÚNICAMENTE un JSON con este formato: { \"titulo\": \"...\", \"preguntas\": [ { \"pregunta\": \"...\", \"icono_fontawesome\": \"clase_fa_o_vacio\", \"opciones\": [\"A) ...\", \"B) ...\", \"C) ...\"], \"respuesta_correcta\": 0 } ] }. El arreglo 'preguntas' DEBE tener la cantidad de elementos solicitados. En 'icono_fontawesome' pon una clase de FontAwesome v6 (ej. 'fa-solid fa-map', 'fa-solid fa-chart-pie', 'fa-solid fa-flask', 'fa-solid fa-seedling') SÓLO si la pregunta necesita indispensablemente un apoyo visual. Si no necesita, déjalo vacío \"\".";
      userPrompt = `Genera un examen de opción múltiple con EXACTAMENTE ${cantidadReactivos} preguntas sobre el tema: "${tema}". Adecuado para ${grado}º grado de primaria. IMPORTANTE: Las preguntas deben estar contextualizadas en situaciones prácticas de la vida real en México. Evita preguntas puramente memorísticas.`;
    } else if (tipoMaterial === 'EXAMEN_TRIMESTRAL') {
      systemPrompt += " Devuelve ÚNICAMENTE un JSON con este formato: { \"titulo\": \"...\", \"preguntas\": [ { \"pregunta\": \"...\", \"icono_fontawesome\": \"clase_fa_o_vacio\", \"opciones\": [\"A) ...\", \"B) ...\", \"C) ...\"], \"respuesta_correcta\": 0 } ] }. El arreglo 'preguntas' DEBE tener la cantidad de elementos solicitados. En 'icono_fontawesome' pon una clase de FontAwesome v6 SÓLO si la pregunta necesita apoyo visual. Si no, déjalo vacío \"\".";
      userPrompt = `Genera un riguroso Examen Trimestral de opción múltiple con EXACTAMENTE ${cantidadReactivos} preguntas integradoras y complejas que abarquen aprendizajes de todo el periodo relacionados con el tema: "${tema}". Para ${grado}º grado. Presenta casos de la vida comunitaria escolar.`;
    } else if (tipoMaterial === 'PREGUNTAS_ABIERTAS') {
      systemPrompt += " Devuelve ÚNICAMENTE un JSON con este formato: { \"titulo\": \"...\", \"preguntas\": [ { \"pregunta\": \"...\", \"icono_fontawesome\": \"clase_fa_o_vacio\" } ] }. El arreglo 'preguntas' DEBE tener la cantidad exacta de preguntas solicitadas. En 'icono_fontawesome' pon una clase de FontAwesome v6 SÓLO si es indispensable. Si no, déjalo vacío \"\".";
      userPrompt = `Genera un cuestionario con EXACTAMENTE ${cantidadReactivos} preguntas abiertas de análisis y reflexión sobre el tema: "${tema}". Adecuado para ${grado}º grado de primaria.`;
    } else if (tipoMaterial === 'SOPA_LETRAS_VOCABULARIO') {
      systemPrompt += " Devuelve ÚNICAMENTE un JSON con este formato: { \"titulo\": \"...\", \"palabras\": [ { \"palabra\": \"...\", \"pista\": \"...\" } ] }. El arreglo 'palabras' DEBE tener la cantidad solicitada.";
      userPrompt = `Genera una lista de EXACTAMENTE ${cantidadReactivos} palabras clave y sus definiciones para armar una sopa de letras sobre el tema: "${tema}". La palabra en mayúsculas y sin espacios.`;
    } else if (tipoMaterial === 'CRUCIGRAMA') {
      systemPrompt += " Devuelve ÚNICAMENTE un JSON con este formato: { \"titulo\": \"...\", \"palabras\": [ { \"palabra\": \"...\", \"pista\": \"...\" } ] }. El arreglo 'palabras' DEBE tener la cantidad solicitada.";
      userPrompt = `Genera una lista de EXACTAMENTE ${cantidadReactivos} palabras clave y sus definiciones cortas (como pistas de crucigrama) sobre el tema: "${tema}". Adecuado para ${grado}º grado. La palabra debe estar en mayúsculas y sin espacios.`;
    } else if (tipoMaterial === 'RUBRICA_EVALUACION') {
      systemPrompt += " Devuelve ÚNICAMENTE un JSON con este formato: { \"titulo\": \"...\", \"criterios\": [ { \"criterio\": \"...\", \"excelente\": \"...\", \"bueno\": \"...\", \"suficiente\": \"...\", \"insuficiente\": \"...\" } ] }.";
      userPrompt = `Genera una rúbrica de evaluación formativa analítica (enfoque NEM) con 5 criterios detallados para evaluar el tema o proyecto: "${tema}". Adecuada para ${grado}º grado de primaria.`;
    }

    const apiKey = window.openaiApiKey || localStorage.getItem('openai_api_key') || localStorage.getItem('openaiApiKey') || '';

    if (!apiKey) {
      // Sin API Key -> Usar generador local de la NEM directamente sin error
      const parsedLocal = generarMaterialLocal(tipoMaterial, tema, grado, cantidadReactivos);
      let sopaData = null;
      let cruciData = null;
      if (tipoMaterial === 'SOPA_LETRAS_VOCABULARIO' && parsedLocal.palabras) {
        sopaData = generarSopaDeLetras(parsedLocal.palabras, 15);
      }
      if (tipoMaterial === 'CRUCIGRAMA' && parsedLocal.palabras) {
        const clgInput = parsedLocal.palabras.map(p => ({ answer: p.palabra.toUpperCase().replace(/[^A-Z]/g,''), clue: p.pista }));
        cruciData = clg.generateLayout(clgInput);
      }
      setResultado({ tipo: tipoMaterial, data: parsedLocal, sopaData, cruciData });
      setGenerando(false);
      return;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      const content = data.choices[0].message.content;
      
      const jsonStr = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
      const parsed = JSON.parse(jsonStr);
      let sopaData = null;
      let cruciData = null;
      if (tipoMaterial === 'SOPA_LETRAS_VOCABULARIO' && parsed.palabras) {
        sopaData = generarSopaDeLetras(parsed.palabras, 15);
      }
      if (tipoMaterial === 'CRUCIGRAMA' && parsed.palabras) {
        const clgInput = parsed.palabras.map(p => ({ answer: p.palabra.toUpperCase().replace(/[^A-Z]/g,''), clue: p.pista }));
        cruciData = clg.generateLayout(clgInput);
      }
      setResultado({ tipo: tipoMaterial, data: parsed, sopaData, cruciData });

    } catch (error) {
      console.warn("Fallo de API OpenAI o red. Ejecutando motor de respaldo NEM...", error);
      const parsedLocal = generarMaterialLocal(tipoMaterial, tema, grado, cantidadReactivos);
      let sopaData = null;
      let cruciData = null;
      if (tipoMaterial === 'SOPA_LETRAS_VOCABULARIO' && parsedLocal.palabras) {
        sopaData = generarSopaDeLetras(parsedLocal.palabras, 15);
      }
      if (tipoMaterial === 'CRUCIGRAMA' && parsedLocal.palabras) {
        const clgInput = parsedLocal.palabras.map(p => ({ answer: p.palabra.toUpperCase().replace(/[^A-Z]/g,''), clue: p.pista }));
        cruciData = clg.generateLayout(clgInput);
      }
      setResultado({ tipo: tipoMaterial, data: parsedLocal, sopaData, cruciData });
    } finally {
      setGenerando(false);
    }
  };

  const imprimirMaterial = () => {
    window.print();
  };

  return (
    <div className="pantalla-dosificador" style={{ padding: '20px', overflowY: 'auto' }}>
      <div className="header-dosificador" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>🧩 Generador de Material Didáctico IA</h2>
        <button className="btn-volver" onClick={onVolver} style={{ background: '#e67e22' }}>
          ↩ Volver al Menú
        </button>
      </div>

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
    </div>
  );
};

export default GeneradorMaterial;
