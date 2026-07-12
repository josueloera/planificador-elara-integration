import sqlite3

DB_NAME = "nem_primaria.db"

def actualizar_comisiones():
    print("🔧 Creando tabla de Comisiones Docentes...")
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS comisiones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        descripcion TEXT,
        fecha TEXT,
        tipo TEXT  -- Ej: Civica, Guardia, Administrativa
    )
    """)

    conn.commit()
    conn.close()
    print("✅ ¡Tabla 'comisiones' lista!")

if __name__ == "__main__":
    actualizar_comisiones()