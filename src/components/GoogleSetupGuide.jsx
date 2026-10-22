import React, { useId, useState } from 'react';
import { saveDocument } from '../utils/documentExport';
import './GoogleSetupGuide.css';

export function GoogleLink({ href, children }) {
  const [error, setError] = useState('');
  return <><a href={href} target="_blank" rel="noopener noreferrer" onClick={event => {
    // Electron must open account sign-in in the user's browser, not a new app window.
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
  const resource = async (file, name, copy) => {
    setError(''); setFeedback('');
    try {
      const response = await fetch('./' + file);
      if (!response.ok) throw Error('No se encontró el archivo de Elara.');
      const text = await response.text();
      if (copy) {
        try { await navigator.clipboard.writeText(text); }
        catch { throw Error('No se pudo copiar. Usa «Descargar» y abre el archivo con un editor de texto para copiar su contenido.'); }
        setFeedback(name + ' copiado. Ya puedes pegarlo en Google Apps Script.');
      } else {
        await saveDocument(new Blob([text], { type: file.endsWith('.json') ? 'application/json' : 'text/plain' }), name);
        setFeedback('Archivo preparado: ' + name + '. Ábrelo con un editor de texto.');
      }
    } catch (failure) { setError(failure.message); }
  };

  return <div className="google-setup">
    <div className="google-setup-actions">
      <button type="button" className="primary" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
        {open ? 'Ocultar guía de Google Forms' : '¿Cómo vincular Google Forms?'}
      </button>
      <GoogleLink href="https://script.google.com/home/start">Abrir Google Apps Script</GoogleLink>
    </div>
    {open && <div id={panelId} className="google-setup-panel">
      <h3>Vincula tu cuenta, paso a paso</h3>
      <p>Elara usa un servicio que tú creas en tu cuenta para generar formularios y recuperar respuestas. Esta preparación se hace una vez; al terminar tendrás <strong>un enlace de conexión y una clave privada</strong>.</p>
      <p>Usa la cuenta del docente titular durante todos los pasos. Si estás en una tablet, puedes preparar el servicio en una computadora y después pegar el enlace y la clave en Elara.</p>
      <ol className="google-setup-steps">
        <li><h4>Abre un proyecto nuevo</h4><p>En <GoogleLink href="https://script.google.com/home/start">Google Apps Script</GoogleLink>, inicia sesión, pulsa <strong>Nuevo proyecto</strong> y llámalo <strong>Elara — mis formularios</strong>.</p></li>
        <li><h4>Pega el código de Elara</h4><p>Pulsa «Copiar código». En el editor de Google, abre <strong>Código.gs</strong> (o <strong>Code.gs</strong>), borra el texto de ejemplo, pega el código completo y guarda.</p>
          <button type="button" onClick={() => resource('elara-google-service.gs', 'Elara-Google.gs', true)}>Copiar código</button>
          <button type="button" onClick={() => resource('elara-google-service.gs', 'Elara-Google.gs', false)}>Descargar código del servicio</button>
        </li>
        <li><h4>Pega la configuración</h4><p>En Google abre el engrane <strong>Configuración del proyecto</strong> y activa <strong>Mostrar el archivo de manifiesto appsscript.json en el editor</strong>. Regresa al editor, abre ese archivo y reemplaza todo su contenido con la configuración de Elara. Guarda.</p>
          <button type="button" onClick={() => resource('elara-appsscript.json', 'appsscript.json', true)}>Copiar configuración</button>
          <button type="button" onClick={() => resource('elara-appsscript.json', 'appsscript.json', false)}>Descargar configuración de Google</button>
        </li>
        <li><h4>Habilita los servicios de Google</h4>
          <p>Este paso permite que Elara gestione los formularios desde tu cuenta.</p>
          <ul>
            <li>Abre <GoogleLink href="https://console.cloud.google.com/projectcreate">Crear proyecto en Google Cloud</GoogleLink>, crea uno para Elara y selecciónalo en la barra superior.</li>
            <li>En ese mismo proyecto, abre <GoogleLink href="https://console.cloud.google.com/apis/library/drive.googleapis.com">Google Drive API</GoogleLink> y pulsa <strong>Habilitar</strong>. Repite con <GoogleLink href="https://console.cloud.google.com/apis/library/forms.googleapis.com">Google Forms API</GoogleLink>.</li>
            <li>En <GoogleLink href="https://console.cloud.google.com/auth/overview">Google Auth Platform</GoogleLink> pulsa <strong>Comenzar</strong> si aparece. Escribe el nombre de la aplicación y tu correo de asistencia/contacto. Para Gmail personal elige público <strong>Externo</strong>; en <strong>Público → Usuarios de prueba</strong> agrega tu propio correo mientras esté en pruebas. Si tu escuela usa público interno, sigue sus indicaciones.</li>
            <li>En la página principal de Google Cloud copia el <strong>número del proyecto</strong>. Vuelve al engrane de Apps Script: <strong>Proyecto de Google Cloud Platform → Cambiar proyecto</strong>. Pega el número y confirma.</li>
          </ul>
          <p className="google-setup-note">Selecciona siempre el mismo proyecto en Google Cloud. <GoogleLink href="https://developers.google.com/apps-script/guides/cloud-platform-projects?hl=es">Ver ayuda oficial sobre proyectos</GoogleLink> · <GoogleLink href="https://developers.google.com/workspace/guides/configure-oauth-consent?hl=es">Ver ayuda sobre permisos</GoogleLink>.</p>
        </li>
        <li><h4>Obtén tu clave privada</h4><p>Vuelve al editor de Apps Script. En el selector de funciones de la barra superior elige <strong>configurarElara</strong> y pulsa <strong>Ejecutar</strong>. Revisa y autoriza los permisos de tu proyecto con la misma cuenta.</p><p>Abre <strong>Registro de ejecución</strong>. Copia solamente los caracteres que aparecen después de <strong>«Clave privada de conexión (no compartir):»</strong>. Esta es la clave que pegarás abajo; no es la contraseña de tu correo.</p></li>
        <li><h4>Obtén el enlace de conexión</h4><p>En Apps Script pulsa <strong>Implementar → Nueva implementación</strong>. En el engrane «Seleccionar tipo» elige <strong>Aplicación web</strong>.</p><ul><li><strong>Ejecutar como:</strong> Yo (tu cuenta).</li><li><strong>Quién tiene acceso:</strong> Cualquier usuario. El servicio comprueba tu clave privada antes de aceptar solicitudes.</li></ul><p>Pulsa <strong>Implementar</strong> y copia la <strong>URL de la aplicación web</strong>, que termina en <code>/exec</code>. Si necesitas recuperarla después, abre <strong>Implementar → Gestionar implementaciones</strong>.</p><p className="google-setup-note"><GoogleLink href="https://developers.google.com/apps-script/guides/web?hl=es">Ayuda oficial para implementar la aplicación web</GoogleLink></p></li>
        <li><h4>Regresa a Elara y comprueba la cuenta</h4><p>Pega el enlace en <strong>URL de tu servicio</strong> y los caracteres de la clave en <strong>Clave privada</strong>. Pulsa <strong>Conectar y comprobar cuenta</strong>. Si todo está bien verás <strong>Conectado: tu correo</strong>.</p><p>Después podrás crear el formulario desde «Docentes especialistas». <GoogleLink href="https://docs.google.com/forms/">Ver mis formularios en Google</GoogleLink>.</p></li>
      </ol>
      <p className="google-setup-note">Conserva tu URL y clave en un lugar privado. Elara mantiene la conexión solo durante esta sesión; al cerrar y volver a abrir la aplicación tendrás que pegarlas de nuevo, pero no necesitas recrear el proyecto. La clave no se incluye en los respaldos.</p>
      <details><summary>¿No logra conectarse?</summary><ul>
        <li><strong>No encuentro la URL:</strong> abre Apps Script → Implementar → Gestionar implementaciones. Usa la URL terminada en /exec, no el enlace de un formulario ni uno terminado en /dev.</li>
        <li><strong>No encuentro la clave:</strong> ejecuta configurarElara otra vez y revisa el registro. No cambia una clave ya creada.</li>
        <li><strong>Google solicita permisos o acceso:</strong> verifica tu cuenta, el usuario de prueba y las dos API del paso 4. Si tu escuela bloquea el servicio o no aparece «Cualquier usuario», consulta a su administrador.</li>
        <li><strong>Cambiaste el código:</strong> guarda y ve a Implementar → Gestionar implementaciones → Editar → Nueva versión → Implementar para actualizar el servicio.</li>
      </ul></details>
    </div>}
    {feedback && <p role="status">{feedback}</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
