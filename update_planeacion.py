import sqlite3

DB_NAME = "nem_primaria.db"

def actualizar_planeacion():
    print("🔧 Creando tabla de Planeación...")
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # Tabla para guardar lo que escribas por semana y grado
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS planeaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grado INTEGER,
        semana INTEGER,
        lunes TEXT,
        martes TEXT,
        miercoles TEXT,
        jueves TEXT,
        viernes TEXT,
        recursos TEXT,
        evaluacion TEXT,
        UNIQUE(grado, semana)
    )
    """)

    conn.commit()
    conn.close()
    print("✅ ¡Tabla 'planeaciones' lista!")

if __name__ == "__main__":
    actualizar_planeacion()