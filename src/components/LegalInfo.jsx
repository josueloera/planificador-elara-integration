import { useState } from 'react';
import './LegalInfo.css';

export default function LegalInfo() {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="legal-info-trigger" onClick={() => setOpen(true)} aria-haspopup="dialog">
      Privacidad y licencia
    </button>
    {open && <div className="legal-info-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="legal-info-dialog" role="dialog" aria-modal="true" aria-labelledby="legal-info-title">
        <header><h2 id="legal-info-title">Privacidad, uso y licencia</h2><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar">×</button></header>
        <div className="legal-info-content">
          <p><strong>Borrador informativo.</strong> Responsable identificado comercialmente como Planificador Docente ELARA. Nombre legal, domicilio y correo para privacidad están pendientes de confirmación y deben completarse antes de la distribución comercial.</p>
          <h3>Datos que puedes registrar</h3>
          <p>La aplicación permite almacenar en el dispositivo información de docentes, escuelas, grupos y alumnos, como nombres, fotografías, evaluaciones, planeaciones y datos que el docente escriba en expedientes. Algunos campos pueden contener datos sensibles de salud, por ejemplo alergias o servicios médicos. Registra únicamente lo necesario y solo cuando tengas autorización para hacerlo.</p>
          <h3>Almacenamiento y servicios externos</h3>
          <p>Los registros académicos se guardan en la base local de la aplicación y en los respaldos que el usuario decida crear o exportar. La aplicación no los sincroniza con ELARA por defecto. Si usas funciones de inteligencia artificial, el texto y contexto que envíes se procesa mediante el proveedor configurado para esa función y queda sujeto también a sus condiciones y aviso de privacidad. Evita incluir nombres, fotografías, identificadores u otros datos de alumnos en solicitudes de IA.</p>
          <p>Las exportaciones a Word, PDF u otros formatos se guardan en el destino que el usuario elija. La protección de datos de menores requiere especial cuidado; el docente y, cuando corresponda, la escuela deben contar con facultades y autorizaciones aplicables.</p>
          <h3>Solicitudes de privacidad</h3>
          <p>Las solicitudes de acceso, rectificación, cancelación u oposición se atenderán por el canal del responsable una vez confirmado. Correo y domicilio: <strong>pendientes de publicación por el responsable</strong>. No incluyas datos sensibles en una solicitud por un canal no confirmado.</p>
          <h3>Licencia y derechos de autor</h3>
          <p>El instalador concede el uso de la aplicación de acuerdo con la licencia autorizada. No concede propiedad ni una licencia independiente sobre su código fuente, marcas o materiales. La copia, distribución, publicación, modificación o explotación fuera de esa licencia puede afectar derechos de autor y otros derechos aplicables. La protección concreta depende de la ley y de los derechos de cada componente.</p>
          <p>El instalador organiza y empaqueta los archivos para disuadir su consulta casual; ningún paquete de software entregado al usuario puede impedir por completo su inspección o extracción. La aplicación no sustituye las obligaciones profesionales, escolares ni legales del usuario.</p>
          <p className="legal-info-version">Versión del aviso: 1.0.20. Almacenamiento local y uso de IA dependen de las funciones que el usuario elija.</p>
        </div>
        <footer><button type="button" onClick={() => setOpen(false)}>Cerrar</button></footer>
      </section>
    </div>}
  </>;
}
