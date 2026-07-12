# Reglas de Desarrollo del Proyecto: Secundaria - Integración ELARA

- **Planificador de Secundaria**: Este proyecto es una versión de Secundaria. La navegación debe estar estrictamente vinculada a un grupo activo (`grupoActual`). No uses selectores de grados de primaria (1-6) ni asumas un único grado general.
- **Validaciones de SQLite**: Todas las operaciones de guardado de criterios, planeaciones o proyectos deben incluir la validación de `grupo_id` para evitar registros huérfanos con valor `NULL`.
- **Integración de ELARA**: El asistente cognitivo ELARA debe usar el contexto `window.plannerContext` para interactuar con la aplicación. Al configurar criterios de evaluación por voz/texto, valida que haya un grupo activo o auto-selecciónalo antes de realizar la persistencia.
