import React, { useState, useEffect } from 'react';
import './DashboardGrupos.css';

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

export default function DashboardGrupos({ onSelectGrupo }) {
  const [grupos, setGrupos] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevoGrupo, setNuevoGrupo] = useState({
    grado: 1,
    seccion: 'A',
    disciplina_id: '',
    tipo: 'Materia Regular',
    ciclo_escolar: '2026-2027'
  });
  
  const [disciplinas, setDisciplinas] = useState([]);
  const [allDisciplinas, setAllDisciplinas] = useState([]);

  useEffect(() => {
    cargarGrupos();
    cargarTodasDisciplinas();
  }, []);

  const cargarTodasDisciplinas = async () => {
    if (ipcRenderer) {
      const res = await ipcRenderer.invoke('get-disciplinas');
      setAllDisciplinas(res || []);
    }
  };

  useEffect(() => {
    cargarDisciplinas(nuevoGrupo.grado);
  }, [nuevoGrupo.grado]);

  const cargarGrupos = async () => {
    if (ipcRenderer) {
      const res = await ipcRenderer.invoke('get-grupos');
      setGrupos(res || []);
    }
  };

  const cargarDisciplinas = async (grado) => {
    if (ipcRenderer) {
      const res = await ipcRenderer.invoke('get-disciplinas-por-grado', grado);
      setDisciplinas(res || []);
      // Resetear la selección de disciplina si la lista cambia
      setNuevoGrupo(prev => ({ ...prev, disciplina_id: '' }));
    }
  };

  const handleCrearGrupo = async (e) => {
    e.preventDefault();
    if (!nuevoGrupo.disciplina_id) {
      alert("Debes seleccionar un campo formativo");
      return;
    }
    if (ipcRenderer) {
      await ipcRenderer.invoke('add-grupo', nuevoGrupo);
      setMostrarModal(false);
      cargarGrupos();
      cargarTodasDisciplinas();
    }
  };

  const handleEliminarGrupo = async (e, id) => {
    e.stopPropagation();
    if (confirm("¿Estás seguro de eliminar este grupo?")) {
      if (ipcRenderer) {
        await ipcRenderer.invoke('delete-grupo', id);
        cargarGrupos();
      }
    }
  };

  const materias = grupos.filter(g => g.tipo === 'Materia Regular');

  const renderCard = (grupo) => {
    const campoFormativo = allDisciplinas.find(d => d.id === parseInt(grupo.disciplina_id))?.nombre || 'General';
    return (
      <div key={grupo.id} className="grupo-card" onClick={() => onSelectGrupo({...grupo, nombre_disciplina: campoFormativo})} style={{position: 'relative'}}>
        <button 
          onClick={(e) => handleEliminarGrupo(e, grupo.id)} 
          title="Eliminar Grupo" 
          style={{position: 'absolute', top: 5, right: 5, background: '#ff7675', color: 'white', border: 'none', borderRadius: '50%', width: 25, height: 25, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12px'}}
        >
          ✕
        </button>
        <div className="grupo-grado">{grupo.grado}º {grupo.seccion}</div>
        <div className="grupo-disciplina">{campoFormativo}</div>
        <div className="grupo-tipo">Primaria</div>
      </div>
    );
  };

  return (
    <div className="dashboard-grupos-container">
      <header className="dashboard-header">
        <h1>Mi Organización Escolar - Primaria</h1>
        <button className="btn-crear-grupo" onClick={() => setMostrarModal(true)}>
          + Crear Nuevo Grupo
        </button>
      </header>

      <main className="dashboard-main">
        <section className="grupo-seccion">
          <h2>📚 Mis Grupos y Campos Formativos</h2>
          {materias.length === 0 && <p className="empty-msg">No has agregado ningún grupo de primaria.</p>}
          <div className="grupo-grid">
            {materias.map(renderCard)}
          </div>
        </section>
      </main>

      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Crear Nuevo Grupo</h3>
            <form onSubmit={handleCrearGrupo}>
              <div className="form-row">
                <div className="form-group">
                  <label>Grado:</label>
                  <select value={nuevoGrupo.grado} onChange={(e) => setNuevoGrupo({...nuevoGrupo, grado: parseInt(e.target.value)})}>
                    <option value={1}>1º Primaria</option>
                    <option value={2}>2º Primaria</option>
                    <option value={3}>3º Primaria</option>
                    <option value={4}>4º Primaria</option>
                    <option value={5}>5º Primaria</option>
                    <option value={6}>6º Primaria</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Sección / Letra:</label>
                  <input type="text" maxLength="1" value={nuevoGrupo.seccion} onChange={(e) => setNuevoGrupo({...nuevoGrupo, seccion: e.target.value.toUpperCase()})} required />
                </div>
              </div>

              <div className="form-group">
                <label>Campo Formativo:</label>
                <select value={nuevoGrupo.disciplina_id} onChange={(e) => setNuevoGrupo({...nuevoGrupo, disciplina_id: e.target.value})} required>
                  <option value="">-- Selecciona un campo formativo --</option>
                  {disciplinas.map(d => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setMostrarModal(true && setMostrarModal(false))}>Cancelar</button>
                <button type="submit" className="btn-save">Guardar Grupo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
