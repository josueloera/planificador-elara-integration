import React, { useState } from 'react';
import PreferenciasElara from './PreferenciasElara';

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

// Reusing the API key from ClippyAssistant for Vision capabilities

const ConfiguracionCiclo = ({ onVolver, currentConfig, defaultConfig }) => {
    const [config, setConfig] = useState(currentConfig || defaultConfig);

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
            await ipcRenderer.invoke('save-config', 'nombreDocente', config.nombreDocente || '');
            await ipcRenderer.invoke('save-config', 'nombreEscuela', config.nombreEscuela || '');
            await ipcRenderer.invoke('save-config', 'cct', config.cct || '');
            alert('Configuración e Identidad Docente guardadas correctamente.');
        } catch (error) {
            console.error(error);
            alert('Error al guardar la configuración.');
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
                    <PreferenciasElara />
                    
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#34495e' }}>👤 Nombre del Docente</label>
                        <input 
                            type="text" 
                            value={config.nombreDocente || ''} 
                            onChange={(e) => handleChangeFecha('nombreDocente', e.target.value)}
                            placeholder="Ej: Prof. Roberto Martínez"
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #bdc3c7' }}
                        />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#34495e' }}>🏫 Nombre de la Escuela</label>
                        <input 
                            type="text" 
                            value={config.nombreEscuela || ''} 
                            onChange={(e) => handleChangeFecha('nombreEscuela', e.target.value)}
                            placeholder="Ej: Escuela Primaria Benito Juárez"
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #bdc3c7' }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#34495e' }}>📜 Clave de Centro de Trabajo (CCT)</label>
                        <input 
                            type="text" 
                            value={config.cct || ''} 
                            onChange={(e) => handleChangeFecha('cct', e.target.value)}
                            placeholder="Ej: 15EPR0123X"
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #bdc3c7' }}
                        />
                    </div>

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

            </div>
        </div>
    );
};

export default ConfiguracionCiclo;
