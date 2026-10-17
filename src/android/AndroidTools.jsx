import { useState, useEffect, useRef } from 'react';
import { Native } from './bridge.js';
const edition = import.meta.env.VITE_EDITION === 'secundaria' ? 'Secundaria' : 'Primaria';
export default function AndroidTools({ native = Native }) {
  const toolbarRef = useRef(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      const style = document.documentElement.style;
      style.setProperty('--android-viewport-height', (viewport?.height || window.innerHeight) + 'px');
      style.setProperty('--android-viewport-width', (viewport?.width || window.innerWidth) + 'px');
      style.setProperty('--android-viewport-top', (viewport?.offsetTop || 0) + 'px');
      style.setProperty('--android-viewport-left', (viewport?.offsetLeft || 0) + 'px');
      style.setProperty('--android-toolbar', (toolbarRef.current?.getBoundingClientRect().height || 48) + 'px');
    };
    update();
    const observer = new ResizeObserver(update);
    if (toolbarRef.current) observer.observe(toolbarRef.current);
    window.addEventListener('resize', update);
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
    };
  }, []);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  async function execute(action) {
    setBusy(true); setNotice('');
    try {
      const result = await window.planificadorAndroid.ipcRenderer.invoke(action);
      if (!result?.cancelled) { if (action === 'import-backup') location.reload(); else setNotice('Respaldo guardado.'); }
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }
  return <header ref={toolbarRef} className="android-toolbar no-print">
    <span>Planificador {edition} <small>Android · 1.0.10</small></span>
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>Herramientas</button>
    {open && <section className="android-tools-panel" aria-label="Herramientas Android">
      <button disabled={busy} onClick={() => execute('export-backup')}>Guardar respaldo</button>
      <button disabled={busy} onClick={() => { if (confirm('Restaurar reemplazará los grupos y registros actuales. Guarda un respaldo antes de continuar. ¿Continuar?')) execute('import-backup'); }}>Restaurar respaldo</button>
      <button onClick={() => window.print()}>Imprimir / guardar PDF</button>
      {notice && <p role="status">{notice}</p>}
      <p>El asistente docente usa Gemini y Groq automáticamente. Los respaldos Android pertenecen a esta edición. Primaria y Secundaria conservan sus datos por separado.</p>
    </section>}
  </header>;
}
