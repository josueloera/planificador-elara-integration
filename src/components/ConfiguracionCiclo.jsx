import RespaldoDatos from './RespaldoDatos';
import React, { useEffect, useState } from 'react';
import PreferenciasElara from './PreferenciasElara';

const readPeriods = (value, fallback) => {
    if (!value) return fallback;
    try { return typeof value === 'string' ? JSON.parse(value) : value; }
    catch { return fallback; }
};

const ConfiguracionCiclo = ({ onVolver, currentConfig, defaultConfig }) => {
    const [config, setConfig] = useState(() => ({ ...defaultConfig, ...currentConfig, periodos: readPeriods(currentConfig?.periodos, defaultConfig.periodos) }));
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState('');

    useEffect(() => {
        setConfig({ ...defaultConfig, ...currentConfig, periodos: readPeriods(currentConfig?.periodos, defaultConfig.periodos) });
    }, [currentConfig]);

    const handleChangeFecha = (campo, valor) => {
        setConfig(prev => ({ ...prev, [campo]: valor }));
        setStatus('');
    };

    const handleChangePeriodo = (id, campo, valor) => {
        setConfig(prev => ({ ...prev, periodos: { ...prev.periodos, [id]: { ...prev.periodos[id], [campo]: valor } } }));
        setStatus('');
    };

    const handleGuardarManual = async () => {
        if (!ipcRenderer || saving) return;
        setSaving(true);
        setStatus('');
        try {
            const values = {
                fechaInicioStr: config.fechaInicioStr || '',
                periodos: JSON.stringify(config.periodos),
                nombreDocente: config.nombreDocente || '',
                nombreEscuela: config.nombreEscuela || '',
                cct: config.cct || ''
            };
            for (const [key, value] of Object.entries(values)) await ipcRenderer.invoke('save-config', key, value);
            setStatus('Configuración guardada.');
        } catch (error) {
            console.error(error);
            setStatus('No se pudo guardar. Revisa los datos e inténtalo de nuevo.');
        } finally { setSaving(false); }
    };

    return (
        <div className="pantalla-dosificador" style={{ padding: '30px', overflowY: 'auto' }}>
            <div className="header-dosificador">
                <h2>⚙️ Configuración del Ciclo Escolar</h2>
                <button className="btn-volver" onClick={onVolver}>Volver al Menú</button>
            </div>

            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '350px', background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ color: '#2c3e50', borderBottom: '2px solid #ecf0f1', paddingBottom: '10px', marginBottom: '20px' }}>Ajuste Manual</h3>
                    <PreferenciasElara />
                    <RespaldoDatos />

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#34495e' }}>Nombre del Docente</label>
                        <input type="text" autoComplete="name" value={config.nombreDocente || ''} onChange={e => handleChangeFecha('nombreDocente', e.target.value)} placeholder="Ej: Prof. Roberto Martínez" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #bdc3c7' }} />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#34495e' }}>Nombre de la Escuela</label>
                        <input type="text" autoComplete="organization" value={config.nombreEscuela || ''} onChange={e => handleChangeFecha('nombreEscuela', e.target.value)} placeholder="Ej: Escuela Primaria Benito Juárez" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #bdc3c7' }} />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#34495e' }}>Clave de Centro de Trabajo (CCT)</label>
                        <input type="text" autoCapitalize="characters" value={config.cct || ''} onChange={e => handleChangeFecha('cct', e.target.value.toUpperCase())} placeholder="Ej: 15EPR0123X" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #bdc3c7' }} />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#34495e' }}>Fecha de Inicio de Clases</label>
                        <input type="date" value={config.fechaInicioStr || ''} onChange={e => handleChangeFecha('fechaInicioStr', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #bdc3c7' }} />
                    </div>

                    {[1, 2, 3].map(t => (
                        <div key={t} style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#2980b9' }}>{config.periodos[t].nombre}</h4>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <label style={{ flex: 1 }}>Inicio<input type="date" value={config.periodos[t].inicio || ''} onChange={e => handleChangePeriodo(t, 'inicio', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} /></label>
                                <label style={{ flex: 1 }}>Fin<input type="date" value={config.periodos[t].fin || ''} onChange={e => handleChangePeriodo(t, 'fin', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} /></label>
                            </div>
                        </div>
                    ))}

                    <button disabled={saving} onClick={handleGuardarManual} style={{ width: '100%', padding: '12px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: saving ? 'wait' : 'pointer', marginTop: '10px', opacity: saving ? .7 : 1 }}>
                        {saving ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                    <p role="status" aria-live="polite" style={{ minHeight: '1.5em', color: status.startsWith('No se') ? '#b42318' : '#167647' }}>{status}</p>
                </div>
            </div>
        </div>
    );
};

export default ConfiguracionCiclo;
