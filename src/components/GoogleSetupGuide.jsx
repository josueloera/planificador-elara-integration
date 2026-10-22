import React, { useId, useState } from 'react';
import { saveDocument } from '../utils/documentExport';
import './GoogleSetupGuide.css';

export function GoogleLink({ href, children }) {
  const [error, setError] = useState('');
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

  const copyCode = async () => {
    setError(''); setFeedback('');
    try {
      const response = await fetch('./elara-google-service.gs');
      if (!response.ok) throw Error('No se encontró el código de Elara.');
      await navigator.clipboard.writeText(await response.text());
      setFeedback('Código copiado. Regresa a Apps Script y pégalo en Código.gs.');
    } catch (failure) {
      setError(failure.message || 'No se pudo copiar el código.');
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
        <li><h4>Pega el código de Elara</h4><p>Pulsa «Copiar código». En Google, abre <strong>Código.gs</strong> o <strong>Code.gs</strong>, borra el ejemplo y pega el código.</p>
          <button type="button" onClick={copyCode}>Copiar código</button><button type="button" onClick={downloadCode}>Descargar código</button>
        </li>
        <li><h4>Autoriza tu cuenta y copia la clave</h4><p>En la barra superior selecciona <strong>configurarElara</strong> y pulsa <strong>Ejecutar</strong>. Acepta los permisos de Google. En el registro de ejecución copia el texto que sigue a <strong>Clave privada de conexión</strong>.</p></li>
        <li><h4>Publica el servicio</h4><p>Pulsa <strong>Implementar → Nueva implementación</strong>, elige <strong>Aplicación web</strong>, selecciona <strong>Ejecutar como: Yo</strong> y <strong>Quién tiene acceso: Cualquier usuario</strong>. Pulsa <strong>Implementar</strong> y copia la dirección que termina en <code>/exec</code>.</p></li>
        <li><h4>Conecta en Elara</h4><p>Pega esa dirección y la clave privada en los campos de abajo y pulsa <strong>Conectar y comprobar cuenta</strong>. Al ver «Conectado», ya puedes crear formularios.</p></li>
      </ol>
      <details><summary>Si Google pide permisos, ¿qué hago?</summary><p>Confirma que estás usando tu cuenta escolar o personal. Apps Script detecta los permisos que necesita y Google te los solicita al ejecutar el código. No hace falta crear un proyecto de Google Cloud ni activar API.</p></details>
      <p className="google-setup-note">Guarda la dirección y la clave en un lugar privado. Si editas el código después, vuelve a <strong>Implementar → Gestionar implementaciones → Editar → Nueva versión</strong>.</p>
    </div>}
    {feedback && <p role="status">{feedback}</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
