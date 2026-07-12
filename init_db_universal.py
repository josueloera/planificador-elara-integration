import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(BASE_DIR, "nem_universal.db")

def inicializar_bd_universal():
    print(f"🚀 Creando la nueva arquitectura universal en: {DB_NAME}")
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # Habilitar claves foráneas
    cursor.execute("PRAGMA foreign_keys = ON;")

    # 1. FASES
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fases (
        id INTEGER PRIMARY KEY,
        nombre TEXT NOT NULL
    )
    """)

    # 2. GRADOS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS grados (
        id INTEGER PRIMARY KEY,
        fase_id INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        FOREIGN KEY (fase_id) REFERENCES fases(id)
    )
    """)

    # 3. CAMPOS FORMATIVOS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS campos_formativos (
        id INTEGER PRIMARY KEY,
        nombre TEXT NOT NULL
    )
    """)

    # 4. DISCIPLINAS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS disciplinas (
        id INTEGER PRIMARY KEY,
        campo_id INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        FOREIGN KEY (campo_id) REFERENCES campos_formativos(id)
    )
    """)

    # 5. CONTENIDOS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS contenidos (
        id INTEGER PRIMARY KEY,
        disciplina_id INTEGER NOT NULL,
        fase_id INTEGER NOT NULL,
        descripcion TEXT NOT NULL,
        FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id),
        FOREIGN KEY (fase_id) REFERENCES fases(id)
    )
    """)

    # 6. PDAS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pdas (
        id INTEGER PRIMARY KEY,
        contenido_id INTEGER NOT NULL,
        grado INTEGER NOT NULL,
        descripcion TEXT NOT NULL,
        FOREIGN KEY (contenido_id) REFERENCES contenidos(id)
    )
    """)

    # 7. DOSIFICACION (contenido_pda)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS contenido_pda (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contenido_id INTEGER NOT NULL,
        grado INTEGER NOT NULL,
        trimestre INTEGER,
        semanas_sugeridas INTEGER,
        FOREIGN KEY (contenido_id) REFERENCES contenidos(id)
    )
    """)

    # --- DATOS SEMILLA BÁSICOS (Fases y Campos) ---
    fases = [
        (1, "Fase 1 (Inicial)"),
        (2, "Fase 2 (Preescolar)"),
        (3, "Fase 3 (Primaria 1º y 2º)"),
        (4, "Fase 4 (Primaria 3º y 4º)"),
        (5, "Fase 5 (Primaria 5º y 6º)"),
        (6, "Fase 6 (Secundaria)")
    ]
    cursor.executemany("INSERT OR IGNORE INTO fases (id, nombre) VALUES (?, ?)", fases)

    campos = [
        (1, "Lenguajes"),
        (2, "Saberes y Pensamiento Científico"),
        (3, "Ética, Naturaleza y Sociedades"),
        (4, "De lo Humano y lo Comunitario")
    ]
    cursor.executemany("INSERT OR IGNORE INTO campos_formativos (id, nombre) VALUES (?, ?)", campos)

    conn.commit()
    conn.close()
    print("✅ ¡Arquitectura Universal de la NEM creada exitosamente!")
    print("   Lista para recibir los datos de Español (Fase 6) de ChatGPT.")

if __name__ == "__main__":
    inicializar_bd_universal()
