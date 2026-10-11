# ALUMNO: perfil y expediente

El menú principal incluye ALUMNO en Primaria y Secundaria para Windows, macOS y Android.

- Búsqueda por nombre y apellido, sin distinguir acentos; Secundaria admite filtro de grado y muestra grupo, materia y ciclo para distinguir homónimos.
- Perfil con foto, datos personales, salud, domicilio, familia, tutor y contacto de emergencia. Comparte los datos con Bitácora; guardar desde Bitácora conserva la foto y los campos adicionales.
- Calificaciones trimestrales con los mismos cálculos del evaluador, incluyendo vínculos QR, filtradas por alumno, grupo, materia/campo y fechas configuradas. Los registros de distintos grupos no se fusionan por nombre.
- Expediente con categorías: comprobante de domicilio, INE del tutor, acta de nacimiento, CURP, examen trimestral, trabajo y otro. Carga múltiple de archivos, exportación individual y eliminación con confirmación.
- Seguimiento con incidencias y asistencia existentes.
- Exportación ZIP con Perfil.html, Perfil.json y los archivos originales organizados por categoría. Perfil.html se abre sin internet y se puede imprimir. El ZIP es una exportación para consulta; no reemplaza el respaldo restaurable de la app.
- Imprimir / PDF prepara toda la ficha, sus calificaciones, incidencias, asistencias y el índice de documentos aunque se esté viendo otra pestaña. Para imprimir el contenido de un documento, exportarlo y abrirlo en su visor correspondiente.

Los documentos se almacenan en la base SQLite local, no como referencias al archivo original. Los respaldos completos de SQLite incluyen el expediente. Cada archivo admite hasta 20 MB; la exportación completa admite hasta 200 MB por operación. La lectura de contenido se fragmenta para ser compatible con CursorWindow de Android. La foto se adapta a un máximo de 800 píxeles.

Las migraciones agregan una tabla e índices y columnas opcionales al perfil sin borrar registros anteriores. No se modifican bases reales durante las pruebas: se utilizan bases temporales.
