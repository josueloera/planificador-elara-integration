import sqlite3

DB_NAME = "nem_primaria.db"

def actualizar_eventos():
    print("🔧 Creando tabla de Eventos del Calendario...")
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # Tabla para guardar: 2026-01-30 -> 'CTE'
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS eventos_calendario (
        fecha TEXT PRIMARY KEY,
        tipo TEXT
    )
    """)

    conn.commit()
    conn.close()
    print("✅ ¡Tabla 'eventos_calendario' lista!")

if __name__ == "__main__":
    actualizar_eventos()