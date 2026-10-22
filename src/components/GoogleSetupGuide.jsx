import React, { useId, useState } from 'react';
import { saveDocument } from '../utils/documentExport';
import './GoogleSetupGuide.css';

export function GoogleLink({ href, children }) {
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  return <><a href={href} target="_blank" rel="noopener noreferrer" onClick={event => {
    const shell = window.require?.('electron')?.shell;
    if (shell) {
      event.preventDefault();
      shell.openExternal(href).catch(() => setError('No se pudo abrir el navegador. Copia este enlace: ' + href));
    }
  }}>{children} ↗</a>{error && <p role="alert">{error}</p>}</>;
}

export default function GoogleSetupGuide() {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const panelId = useId();
  const codeId = useId();

  const loadCode = async () => {
    if (code) return code;
    setCodeLoading(true);
    try {
      const response = await fetch('./elara-google-service.gs');
      if (!response.ok) throw Error('No se encontró el código de Elara.');
      const text = await response.text();
      setCode(text);
      return text;
    } finally { setCodeLoading(false); }
  };

  const showCode = async () => {
    setError(''); setFeedback('');
    if (codeOpen) { setCodeOpen(false); return; }
    setCodeOpen(true);
    if (code) return;
    try { await loadCode(); }
    catch (failure) { setError(failure.message || 'No se pudo cargar el código.'); }
  };

  const copyCode = async () => {
    setError(''); setFeedback('');
    let sourceText = code;
    try {
      const text = await loadCode();
      sourceText = text;
      setCodeOpen(true);
      if (!navigator.clipboard?.writeText) throw Error('El navegador no permite copiar directamente.');
      await navigator.clipboard.writeText(text);
      setFeedback('Código copiado. Ahora regresa a Apps Script, abre Código.gs y pégalo con Ctrl+V.');
    } catch (failure) {
      setCodeOpen(true);
      if (sourceText) {
        setFeedback('El código está visible abajo. Haz clic en el cuadro, selecciona todo y copia; luego pégalo en Código.gs.');
        requestAnimationFrame(() => document.getElementById(codeId)?.select());
      } else setError(failure.message || 'No se pudo cargar el código.');
    }
  };

  const downloadCode = async () => {
    setError(''); setFeedback('');
    try {
      const response = await fetch('./elara-google-service.gs');
      if (!response.ok) throw Error('No se encontró el código de Elara.');
      await saveDocument(new Blob([await response.text()], { type: 'text/plain' }), 'Elara-Google.gs');
      setFeedback('Código descargado. Ábrelo y copia todo su contenido.');
    } catch (failure) { setError(failure.message); }
  };

  return <div className="google-setup">
    <div className="google-setup-actions">
      <button type="button" className="primary" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
        {open ? 'Ocultar instrucciones' : '¿Cómo conectar Google Forms?'}
      </button>
      <GoogleLink href="https://script.google.com/home/start">Abrir Apps Script</GoogleLink>
    </div>
    {open && <div id={panelId} className="google-setup-panel">
      <h3>Conecta tu cuenta de Google una sola vez</h3>
      <p>El servicio y los formularios quedan en tu cuenta. Solo necesitas copiar el código, autorizarlo y pegar en Elara dos datos que Google te dará.</p>
      <ol className="google-setup-steps">
        <li><h4>Abre Apps Script</h4><p>Inicia sesión con la cuenta donde quieres guardar tus formularios y pulsa <strong>Nuevo proyecto</strong>.</p></li>
        <li><h4>Pega el código de Elara</h4><p>El botón de copiar no abre Google: deja el código listo para pegar. Pulsa <strong>Ver código</strong> si quieres verlo aquí. Después, en Apps Script, abre <strong>Código.gs</strong> o <strong>Code.gs</strong>, borra el ejemplo y pega el código con <strong>Ctrl+V</strong>.</p>
          <button type="button" aria-expanded={codeOpen} aria-controls={codeId} onClick={showCode}>{codeLoading ? 'Cargando código…' : codeOpen ? 'Ocultar código' : 'Ver código'}</button><button type="button" onClick={copyCode}>Copiar código</button><button type="button" onClick={downloadCode}>Descargar código</button>
          {feedback && <p className="google-setup-feedback" role="status">{feedback}</p>}
          {error && <p className="google-setup-error" role="alert">{error}</p>}
          {codeOpen && <div className="google-setup-code"><label htmlFor={codeId}>Código completo de Elara</label><p>Este es el contenido que debes pegar en el editor de Google. Haz clic dentro para seleccionarlo.</p><textarea id={codeId} value={code} readOnly rows={14} spellCheck="false" onClick={event => event.currentTarget.select()} aria-label="Código completo del servicio de Google de Elara" /></div>}
        </li>
        <li><h4>Autoriza tu cuenta y copia la clave</h4><p>En la barra superior selecciona <strong>configurarElara</strong> y pulsa <strong>Ejecutar</strong>. Acepta los permisos de Google. En el registro de ejecución copia el texto que sigue a <strong>Clave privada de conexión</strong>.</p></li>
        <li><h4>Publica el servicio</h4><p>Pulsa <strong>Implementar → Nueva implementación</strong>, elige <strong>Aplicación web</strong>, selecciona <strong>Ejecutar como: Yo</strong> y <strong>Quién tiene acceso: Cualquier usuario</strong>. Pulsa <strong>Implementar</strong> y copia la dirección que termina en <code>/exec</code>.</p></li>
        <li><h4>Conecta en Elara</h4><p>Pega esa dirección y la clave privada en los campos de abajo y pulsa <strong>Conectar y comprobar cuenta</strong>. Al ver «Conectado», ya puedes crear formularios.</p></li>
      </ol>
      <details><summary>Si Google pide permisos, ¿qué hago?</summary><p>Confirma que estás usando tu cuenta escolar o personal. Apps Script detecta los permisos que necesita y Google te los solicita al ejecutar el código. No hace falta crear un proyecto de Google Cloud ni activar API.</p></details>
      <p className="google-setup-note">Guarda la dirección y la clave en un lugar privado. Si editas el código después, vuelve a <strong>Implementar → Gestionar implementaciones → Editar → Nueva versión</strong>.</p>
    </div>}
  </div>;
}
