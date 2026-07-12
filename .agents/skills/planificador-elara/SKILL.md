---
name: planificador-elara-secundaria
description: "Bitácora, especificación y guías de desarrollo para el Planificador Docente de Secundaria con Integración ELARA."
---

# Planificador Docente Secundaria - Integración ELARA

Este documento registra la arquitectura, estructura de datos y las reglas del sistema de integración de **ELARA** (Epistemic Logic and Adaptive Relational Agent) en el **Planificador Docente para Secundaria (NEM 2025-2026)**.

---

## 🛠️ Stack Tecnológico

1. **Frontend**: React 18, Vite, Vanilla CSS.
2. **Backend / Proceso Principal**: Electron (CJS).
3. **Persistencia**: SQLite3.
   - Base de datos del usuario: `nem_elara_integration.db` (ubicada en `userData` en producción y en el directorio raíz en desarrollo).
   - Base de datos universal SEP: `nem_universal.db` (solo lectura, contiene asignaturas, contenidos y PDAs de la Nueva Escuela Mexicana).

---

## 🗄️ Esquema de la Base de Datos (`nem_elara_integration.db`)

El planificador de secundaria almacena su información en las siguientes tablas críticas:

### 1. `grupos_maestro`
Registra los grupos creados por el docente (tutorías, asignaturas regulares, talleres).
```sql
CREATE TABLE grupos_maestro (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grado INTEGER,            -- 1, 2 o 3 (Secundaria)
    seccion TEXT,             -- Letra del grupo (ej: A, B, C)
    disciplina_id INTEGER,    -- Relacionado con nem_universal.db -> disciplinas
    tipo TEXT,                -- 'Materia Regular', 'Grupo Asesorado', 'Taller'
    ciclo_escolar TEXT        -- Ej: '2025-2026'
);
```

### 2. `criterios`
Criterios de evaluación (rúbricas) asignados a cada grupo.
```sql
CREATE TABLE criterios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campo TEXT,               -- Campo formativo (ej: LENGUAJES)
    nombre TEXT,              -- Nombre del criterio (ej: Tareas)
    porcentaje REAL,          -- Ponderación (0-100)
    grupo_id INTEGER          -- Llave foránea hacia grupos_maestro(id). NO debe ser NULL.
);
```

### 3. `alumnos`
Lista de alumnos registrados.
```sql
CREATE TABLE alumnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    grupo_id INTEGER          -- Llave foránea hacia grupos_maestro(id)
);
```

### 4. `notas`
Calificaciones asignadas a los alumnos por criterio y fecha.
```sql
CREATE TABLE notas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alumno_id INTEGER,
    criterio_id INTEGER,
    fecha TEXT,               -- Formato YYYY-MM-DD
    valor REAL                -- Calificación
);
```

### 5. `planeacion`
Planeación didáctica semanal por grupo.
```sql
CREATE TABLE planeacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grado INTEGER,
    grupo_id INTEGER,
    semana INTEGER,
    lunes_inicio TEXT, lunes_desarrollo TEXT, lunes_cierre TEXT,
    martes_inicio TEXT, martes_desarrollo TEXT, martes_cierre TEXT,
    miercoles_inicio TEXT, miercoles_desarrollo TEXT, miercoles_cierre TEXT,
    jueves_inicio TEXT, jueves_desarrollo TEXT, jueves_cierre TEXT,
    viernes_inicio TEXT, viernes_desarrollo TEXT, viernes_cierre TEXT,
    recursos TEXT, evaluacion TEXT, adecuaciones TEXT,
    confidence_score REAL DEFAULT 1.0  -- Puntuación de coherencia didáctica
);
```

---

## 🧭 Enrutamiento y Guardia de Grupos (Secundaria)

A diferencia de la versión de primaria, la aplicación de secundaria funciona de forma **estricta por grupo**. 

- **Guardia de Vista**: Si `grupoActual` en el estado global es `null`, la aplicación redirige de manera automática al usuario a la vista de selección/administración de grupos (`GRUPOS`).
- **Vistas Protegidas**: `MENU`, `EVAL`, `TRIMESTRAL`, `PLANNER`, `DOSIF`, `PROYECTOS`, `BITACORA`, `GRUPO`.
- **Vistas Libres**: `CONFIG` (Ajustes Ciclo), `CALENDARIO` (Eventos SEP generales), `COMISIONES` (Pendientes de guardias), `LICENCIA` (Activación).

---

## 🧬 Integración Cognitiva de ELARA

ELARA es un asistente de voz y texto con acceso total a las APIs de Electron y a los estados de React a través del contexto global `window.plannerContext`.

### Flujo de Asignación de Criterios (Fail-Safe)
Cuando se solicita asignar criterios (ej. *"Pon asistencia 10% y examen 90%"*):
1. **Validación de Grupo**: Se comprueba si hay un grupo activo (`grupoActual`).
2. **Auto-selección por Texto**: Si no hay grupo activo, el parser local busca menciones en el texto (ej: "1A", "1ºA", "3B", "3ºB"). Si se detecta, se conecta mediante IPC, consulta la tabla de grupos, selecciona el grupo en React y guarda de forma inmediata los criterios vinculados a su ID.
3. **Bypass del Retardo de Estado**: El método de guardado en el frontend llama a `guardarConfig(criterios, grupoId)` de manera explícita para evitar que la actualización asíncrona de React cause una escritura con `grupo_id = NULL`.
4. **Protección DB**: El proceso principal de Electron rechaza cualquier llamada a `save-criterios`, `save-proyecto` o `save-planeacion` si el parámetro de grupo es nulo.

---

## 🏃 Comandos Útiles

- **Iniciar en desarrollo**: `npm run dev` (Vite) y `npm start` (Electron) / ejecutar `lanzar_elara.bat`.
- **Compilar**: `npm run build`
- **Limpieza SQLite**: `DELETE FROM criterios WHERE grupo_id IS NULL;`
