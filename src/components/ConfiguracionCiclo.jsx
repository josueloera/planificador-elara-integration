import React, { useState } from 'react';

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

// Reusing the API key from ClippyAssistant for Vision capabilities
const MI_OPENAI_API_KEY = window.openaiApiKey || "";

const ConfiguracionCiclo = ({ onVolver, currentConfig, defaultConfig }) => {
    const [config, setConfig] = useState(currentConfig || defaultConfig);
    const [loadingAI, setLoadingAI] = useState(false);
    const [statusAI, setStatusAI] = useState('');

    const handleChangeFecha = (campo, valor) => {
        setConfig(prev => ({ ...prev, [campo]: valor }));
    };

    const handleChangePeriodo = (id, campo, valor) => {
        setConfig(prev => ({
            ...prev,
            periodos: {
                ...prev.periodos,
                [id]: {
                    ...prev.periodos[id],
                    [campo]: valor
                }
            }
        }));
    };

    const handleGuardarManual = async () => {
        if (!ipcRenderer) return;
        try {
            await ipcRenderer.invoke('save-config', 'fechaInicioStr', config.fechaInicioStr);
            await ipcRenderer.invoke('save-config', 'periodos', JSON.stringify(config.periodos));
            alert('Configuración guardada correctamente.');
        } catch (error) {
            console.error(error);
            alert('Error al guardar la configuración.');
        }
    };

    const processImageFile = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    };

    const handleUploadCalendar = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoadingAI(true);
        setStatusAI('Analizando imagen con IA...');
        try {
            const base64Data = await processImageFile(file);

            const prompt = `Analiza este calendario escolar oficial de la SEP en México. Extrae la siguiente información y devuelve ÚNICAMENTE un objeto JSON válido (sin backticks de markdown, sin texto extra, SOLO JSON).
Estructura JSON esperada:
{
  "fecha_inicio": "YYYY-MM-DD",
  "fecha_fin": "YYYY-MM-DD",
  "trimestres_sugeridos": {
    "1": {"inicio": "YYYY-MM-DD", "fin": "YYYY-MM-DD"},
    "2": {"inicio": "YYYY-MM-DD", "fin": "YYYY-MM-DD"},
    "3": {"inicio": "YYYY-MM-DD", "fin": "YYYY-MM-DD"}
  },
  "eventos": [
    {"fecha": "YYYY-MM-DD", "tipo": "CTE"},
    {"fecha": "YYYY-MM-DD", "tipo": "VACACIONES"},
    {"fecha": "YYYY-MM-DD", "tipo": "SUSPENSION"},
    {"fecha": "YYYY-MM-DD", "tipo": "DESCARGA"}
  ]
}
Instrucciones: 
- El inicio de clases corresponde al primer día lectivo del ciclo (caja con número normal que inicia el ciclo).
- Infiere los trimestres basándote en las entregas de boletas si no están explícitos, dividiendo el ciclo en 3 partes más o menos iguales.
- "CTE" son los Consejos Técnicos Escolares.
- "VACACIONES" son los periodos vacacionales completos (incluso si no marcan cada día, incluye cada día lunes a viernes dentro del bloque).
- "SUSPENSION" son días festivos oficiales de suspensión de labores.
- "DESCARGA" es la descarga administrativa.`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${MI_OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                { type: "image_url", image_url: { url: base64Data } }
                            ]
                        }
                    ],
                    temperature: 0
                })
            });

            if (!response.ok) throw new Error("Error en la API de OpenAI");

            const data = await response.json();
            let jsonString = data.choices[0].message.content.trim();
            if (jsonString.startsWith('```json')) {
                jsonString = jsonString.replace(/^```json\n/, '').replace(/\n```$/, '');
            }

            const parsedData = JSON.parse(jsonString);

            setStatusAI('Guardando datos en la base de datos...');

            // 1. Update config UI
            const newConfig = {
                fechaInicioStr: parsedData.fecha_inicio || config.fechaInicioStr,
                periodos: {
                    1: { nombre: '1º Trimestre', ...parsedData.trimestres_sugeridos["1"] },
                    2: { nombre: '2º Trimestre', ...parsedData.trimestres_sugeridos["2"] },
                    3: { nombre: '3º Trimestre', ...parsedData.trimestres_sugeridos["3"] }
                }
            };
            setConfig(newConfig);

            // 2. Save config to DB
            if (ipcRenderer) {
                await ipcRenderer.invoke('save-config', 'fechaInicioStr', newConfig.fechaInicioStr);
                await ipcRenderer.invoke('save-config', 'periodos', JSON.stringify(newConfig.periodos));

                // 3. Save Events
                if (parsedData.eventos && parsedData.eventos.length > 0) {
                    const eventosMap = {};
                    parsedData.eventos.forEach(ev => {
                        eventosMap[ev.fecha] = ev.tipo;
                    });
                    await ipcRenderer.invoke('save-multiple-events', eventosMap);
                }
            }

            alert('¡Calendario analizado y guardado con éxito!');
        } catch (error) {
            console.error(error);
            alert('Ocurrió un error al analizar la imagen. Intenta ajustando las fechas manualmente.');
        } finally {
            setLoadingAI(false);
            setStatusAI('');
            e.target.value = null; // reset input
        }
    };

    return (
        <div className="pantalla-dosificador" style={{ padding: '30px', overflowY: 'auto' }}>
            <div className="header-dosificador">
                <h2>⚙️ Configuración del Ciclo Escolar</h2>
                <button className="btn-volver" onClick={onVolver}>Volver al Menú</button>
            </div>

            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                {/* PANEL MANUAL */}
                <div style={{ flex: 1, minWidth: '350px', background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ color: '#2c3e50', borderBottom: '2px solid #ecf0f1', paddingBottom: '10px', marginBottom: '20px' }}>
                        Ajuste Manual
                    </h3>
                    
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#34495e' }}>Fecha de Inicio de Clases</label>
                        <input 
                            type="date" 
                            value={config.fechaInicioStr} 
                            onChange={(e) => handleChangeFecha('fechaInicioStr', e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #bdc3c7' }}
                        />
                    </div>

                    {[1, 2, 3].map(t => (
                        <div key={t} style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#2980b9' }}>{config.periodos[t].nombre}</h4>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>Inicio</label>
                                    <input type="date" value={config.periodos[t].inicio} onChange={(e) => handleChangePeriodo(t, 'inicio', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>Fin</label>
                                    <input type="date" value={config.periodos[t].fin} onChange={(e) => handleChangePeriodo(t, 'fin', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                                </div>
                            </div>
                        </div>
                    ))}

                    <button 
                        onClick={handleGuardarManual}
                        style={{ width: '100%', padding: '12px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', marginTop: '10px' }}>
                        Guardar Fechas
                    </button>
                </div>

                {/* PANEL IA */}
                <div style={{ flex: 1, minWidth: '350px', background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ color: '#8e44ad', borderBottom: '2px solid #e8daef', paddingBottom: '10px', marginBottom: '20px' }}>
                        ✨ Extracción Mágica (IA)
                    </h3>
                    <p style={{ color: '#555', lineHeight: '1.6', marginBottom: '20px' }}>
                        ¡Olvídate de configurar las fechas manualmente! Sube una imagen clara del <b>Calendario Oficial de la SEP</b> y nuestra Inteligencia Artificial leerá los días de CTE, Vacaciones, Descargas y ajustará los trimestres por ti.
                    </p>

                    <div style={{ border: '2px dashed #bdc3c7', borderRadius: '10px', padding: '40px', textAlign: 'center', background: 'white', position: 'relative', cursor: loadingAI ? 'not-allowed' : 'pointer' }}>
                        {loadingAI ? (
                            <div style={{ color: '#2980b9' }}>
                                <div style={{ fontSize: '2rem', animation: 'spin 2s linear infinite' }}>⏳</div>
                                <p style={{ fontWeight: 'bold', marginTop: '15px' }}>{statusAI}</p>
                            </div>
                        ) : (
                            <>
                                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📸</div>
                                <p style={{ color: '#7f8c8d', margin: 0 }}>Haz clic para seleccionar o toma una foto del calendario</p>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleUploadCalendar}
                                    disabled={loadingAI}
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                />
                            </>
                        )}
                    </div>
                    
                    <div style={{ marginTop: 'auto', paddingTop: '20px', background: '#fff3cd', padding: '15px', borderRadius: '8px', color: '#856404', fontSize: '0.85rem' }}>
                        <b>Nota:</b> La IA hace su mejor esfuerzo para interpretar el calendario, pero te recomendamos revisar los resultados en el <i>Calendario SEP</i> y ajustar los trimestres manualmente si es necesario.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfiguracionCiclo;
