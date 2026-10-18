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
        <header><h2 id="legal-info-title">Aviso de privacidad, uso y licencia</h2><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar">Ã—</button></header>
        <div className="legal-info-content">
          <h3>Responsable</h3>
          <p><strong>Josue Jovanny Loera Ramirez</strong>, responsable del tratamiento de datos personales de Planificador Docente ELARA. RFC: <strong>LORJ880920UG1</strong>. Domicilio: <strong>20 de Noviembre 2, Valle de Allende, Chihuahua, C.P. 33910</strong>. Contacto para privacidad y solicitudes: <a href="mailto:josue_lo@hotmail.es">josue_lo@hotmail.es</a>.</p>
          <h3>Datos y finalidades</h3>
          <p>La aplicaciÃ³n permite que el docente capture datos de escuelas, grupos, alumnos y expedientes acadÃ©micos, como nombres, fotografÃ­as, planeaciones, asistencia, evaluaciones y documentos. Puede incluir datos sensibles de salud, como alergias o servicios mÃ©dicos. Se usan para organizar la actividad docente y generar planeaciones, evaluaciones y reportes. Los registros acadÃ©micos permanecen localmente bajo control del docente o la escuela; el responsable de ELARA no los recibe automÃ¡ticamente.</p>
          <p>Para operar la aplicaciÃ³n, se guardan localmente datos tÃ©cnicos de instalaciÃ³n y licencia. El responsable no requiere que registres datos de alumnos en sus servidores. El docente o la escuela que incorpora informaciÃ³n de sus estudiantes debe contar con facultades y autorizaciones para hacerlo y atiende las solicitudes sobre los registros que conserva.</p>
          <h3>Almacenamiento y comunicaciones</h3>
          <p>La informaciÃ³n acadÃ©mica se guarda localmente en el dispositivo y en los respaldos o exportaciones que el usuario elija. No se sincroniza con ELARA por defecto. Si eliges usar las funciones opcionales de inteligencia artificial o generaciÃ³n de imÃ¡genes, el texto y contexto que envÃ­es se transmite a proveedores externos, que pueden incluir Google Gemini, Groq o Pollinations, segÃºn la funciÃ³n y configuraciÃ³n. Esos proveedores aplican sus propios avisos y condiciones; el procesamiento puede ocurrir fuera de MÃ©xico. No incluyas datos identificables ni sensibles de estudiantes en esas solicitudes. Las exportaciones se guardan en el destino que el usuario elija.</p>
          <h3>Datos sensibles y de menores</h3>
          <p>Captura solo los datos necesarios y asegÃºrate de contar con autorizaciÃ³n y facultades para tratarlos, especialmente si pertenecen a menores o incluyen informaciÃ³n de salud. La escuela y el docente deben observar las obligaciones que les correspondan. El responsable de la aplicaciÃ³n no determina la base legal del registro que haga cada docente.</p>
          <h3>Derechos y contacto</h3>
          <p>Las finalidades necesarias para operar la aplicaciÃ³n y administrar la licencia se distinguen de las funciones opcionales de IA, que solo se ejecutan cuando el usuario las solicita. Puedes limitar el uso de datos omitiendo campos opcionales, no usando IA, borrando registros locales desde la aplicaciÃ³n y controlando tus respaldos. Para solicitar que el responsable limite el uso o divulgaciÃ³n de datos que sÃ­ estÃ©n en su posesiÃ³n, escribe a <a href="mailto:josue_lo@hotmail.es">josue_lo@hotmail.es</a>.</p>
          <p>Para ejercer derechos de acceso, rectificaciÃ³n, cancelaciÃ³n u oposiciÃ³n, revocar el consentimiento o consultar este aviso, escribe a <a href="mailto:josue_lo@hotmail.es">josue_lo@hotmail.es</a> o presenta una solicitud en el domicilio indicado. Incluye tu nombre, un medio para recibir respuesta, documentos para acreditar identidad o representaciÃ³n, el derecho que deseas ejercer y una descripciÃ³n de los datos o la correcciÃ³n solicitada. Por seguridad, no envÃ­es datos sensibles por correo si no son necesarios. Se comunicarÃ¡ la determinaciÃ³n en un mÃ¡ximo de veinte dÃ­as y, si procede, se harÃ¡ efectiva dentro de los quince dÃ­as siguientes; ambos plazos pueden ampliarse una vez por un periodo igual cuando las circunstancias lo justifiquen.</p>
          <h3>Cambios al aviso</h3>
          <p>Los cambios se comunicarÃ¡n mediante la secciÃ³n â€œPrivacidad y licenciaâ€ de la aplicaciÃ³n y las notas de la versiÃ³n publicada en las pÃ¡ginas oficiales de actualizaciÃ³n de Primaria y Secundaria.</p>
          <h3>Licencia y propiedad intelectual</h3>
          <p>El instalador concede el uso de la aplicaciÃ³n conforme a la licencia autorizada; no concede propiedad ni licencia independiente sobre el cÃ³digo fuente, marcas o materiales. La copia, distribuciÃ³n, publicaciÃ³n, modificaciÃ³n o explotaciÃ³n fuera de esa licencia puede afectar derechos aplicables. El empaquetado busca disuadir la inspecciÃ³n casual, pero ningÃºn instalador impide tÃ©cnicamente toda extracciÃ³n o anÃ¡lisis. La aplicaciÃ³n no sustituye las obligaciones profesionales, escolares ni legales del usuario.</p>
          <p className="legal-info-version">Aviso actualizado para la versiÃ³n 1.0.22. La informaciÃ³n acadÃ©mica local queda bajo control del docente o la escuela; consulta al responsable para dudas o solicitudes sobre datos que estÃ©n en su posesiÃ³n.</p>
        </div>
        <footer><button type="button" onClick={() => setOpen(false)}>Cerrar</button></footer>
      </section>
    </div>}
  </>;
}
