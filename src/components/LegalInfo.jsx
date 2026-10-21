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
        <header><h2 id="legal-info-title">Aviso de privacidad, uso y licencia</h2><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar">×</button></header>
        <div className="legal-info-content">
          <h3>Responsable</h3>
          <p><strong>Josue Jovanny Loera Ramirez</strong>, responsable del tratamiento de datos personales de Elara ELARA. RFC: <strong>LORJ880920UG1</strong>. Domicilio: <strong>20 de Noviembre 2, Valle de Allende, Chihuahua, C.P. 33910</strong>. Contacto para privacidad y solicitudes: <a href="mailto:josue_lo@hotmail.es">josue_lo@hotmail.es</a>.</p>
          <h3>Datos y finalidades</h3>
          <p>La aplicación permite que el docente capture datos de escuelas, grupos, alumnos y expedientes académicos, como nombres, fotografías, planeaciones, asistencia, evaluaciones y documentos. Puede incluir datos sensibles de salud, como alergias o servicios médicos. Se usan para organizar la actividad docente y generar planeaciones, evaluaciones y reportes. Los registros académicos permanecen localmente bajo control del docente o la escuela; el responsable de ELARA no los recibe automáticamente.</p>
          <p>Para operar la aplicación, se guardan localmente datos técnicos de instalación y licencia. El responsable no requiere que registres datos de alumnos en sus servidores. El docente o la escuela que incorpora información de sus estudiantes debe contar con facultades y autorizaciones para hacerlo y atiende las solicitudes sobre los registros que conserva.</p>
          <h3>Almacenamiento y comunicaciones</h3>
          <p>La información académica se guarda localmente en el dispositivo y en los respaldos o exportaciones que el usuario elija. No se sincroniza con ELARA por defecto. Si eliges usar las funciones opcionales de inteligencia artificial o generación de imágenes, el texto y contexto que envíes se transmite a proveedores externos, que pueden incluir Google Gemini, Groq o Pollinations, según la función y configuración. Esos proveedores aplican sus propios avisos y condiciones; el procesamiento puede ocurrir fuera de México. No incluyas datos identificables ni sensibles de estudiantes en esas solicitudes. Las exportaciones se guardan en el destino que el usuario elija.</p>
          <h3>Datos sensibles y de menores</h3>
          <p>Captura solo los datos necesarios y asegúrate de contar con autorización y facultades para tratarlos, especialmente si pertenecen a menores o incluyen información de salud. La escuela y el docente deben observar las obligaciones que les correspondan. El responsable de la aplicación no determina la base legal del registro que haga cada docente.</p>
          <h3>Derechos y contacto</h3>
          <p>Las finalidades necesarias para operar la aplicación y administrar la licencia se distinguen de las funciones opcionales de IA, que solo se ejecutan cuando el usuario las solicita. Puedes limitar el uso de datos omitiendo campos opcionales, no usando IA, borrando registros locales desde la aplicación y controlando tus respaldos. Para solicitar que el responsable limite el uso o divulgación de datos que sí estén en su posesión, escribe a <a href="mailto:josue_lo@hotmail.es">josue_lo@hotmail.es</a>.</p>
          <p>Para ejercer derechos de acceso, rectificación, cancelación u oposición, revocar el consentimiento o consultar este aviso, escribe a <a href="mailto:josue_lo@hotmail.es">josue_lo@hotmail.es</a> o presenta una solicitud en el domicilio indicado. Incluye tu nombre, un medio para recibir respuesta, documentos para acreditar identidad o representación, el derecho que deseas ejercer y una descripción de los datos o la corrección solicitada. Por seguridad, no envíes datos sensibles por correo si no son necesarios. Se comunicará la determinación en un máximo de veinte días y, si procede, se hará efectiva dentro de los quince días siguientes; ambos plazos pueden ampliarse una vez por un periodo igual cuando las circunstancias lo justifiquen.</p>
          <h3>Cambios al aviso</h3>
          <p>Los cambios se comunicarán mediante la sección “Privacidad y licencia” de la aplicación y las notas de la versión publicada en las páginas oficiales de actualización de Primaria y Secundaria.</p>
          <h3>Licencia y propiedad intelectual</h3>
          <p>El instalador concede el uso de la aplicación conforme a la licencia autorizada; no concede propiedad ni licencia independiente sobre el código fuente, marcas o materiales. La copia, distribución, publicación, modificación o explotación fuera de esa licencia puede afectar derechos aplicables. El empaquetado busca disuadir la inspección casual, pero ningún instalador impide técnicamente toda extracción o análisis. La aplicación no sustituye las obligaciones profesionales, escolares ni legales del usuario.</p>
          <p className="legal-info-version">Aviso actualizado para la versión 1.0.22. La información académica local queda bajo control del docente o la escuela; consulta al responsable para dudas o solicitudes sobre datos que estén en su posesión.</p>
        </div>
        <footer><button type="button" onClick={() => setOpen(false)}>Cerrar</button></footer>
      </section>
    </div>}
  </>;
}
