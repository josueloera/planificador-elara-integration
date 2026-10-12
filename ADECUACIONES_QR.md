# Adecuaciones curriculares en Control QR

En **Control de Asistencia y Trabajos por Código QR → Adecuaciones curriculares**:

1. Seleccionar la materia/campo y marcar los alumnos con adecuaciones. Pulsar **Guardar alumnos con adecuaciones**.
2. Crear una actividad adaptada y seleccionar sus destinatarios. Se pueden crear actividades diferentes para cada alumno.
3. Las nuevas tareas generales excluyen por defecto a los alumnos marcados de esa materia y ciclo. La opción compartida permite incluir a todo el grupo; las casillas permiten ajustar cualquier tarea.
4. En la lista de actividades se pueden editar destinatarios y pulsar **Calificar** para activar una tarea en el escáner.

La matriz diaria, el historial y Excel muestran **No aplica** para tareas ajenas. El progreso cuenta las entregas sobre las actividades asignadas a cada alumno, incluyendo tareas que todavía no tienen entregas. Un alumno sin tareas asignadas no recibe un porcentaje artificial. La vinculación con Evaluación sigue usando las calificaciones recibidas de su materia y fecha.

Las asignaciones se guardan en SQLite y están incluidas en los respaldos de la base. La selección predeterminada se separa por grupo, materia y fechas del ciclo. Cada actividad conserva una copia de sus destinatarios: cambiar las marcas no modifica actividades anteriores.

Las actividades existentes se consideran compartidas hasta editar sus destinatarios. Para excluir a alguien que ya tiene una calificación, primero se debe eliminar esa entrega si no le corresponde; el sistema lo indica y conserva los datos mientras tanto. Renombrar una actividad mantiene su asignación. Los nombres deben ser únicos dentro del grupo y fecha, como en el registro QR existente.

## Validación

- Escritorio: `node --test scripts/test-qr-assignments.cjs scripts/test-evaluation-daily.cjs scripts/test-alumno.mjs scripts/test-release-seeds.cjs`.
- Android: `npm test`, incluida la prueba con el puente SQLite real y reapertura de la base temporal.
- Compilaciones web de las cuatro variantes en carpetas de validación separadas.
- El navegador integrado no estuvo disponible para una prueba visual interactiva. No se generó ni publicó un nuevo instalador/APK en este cambio.
