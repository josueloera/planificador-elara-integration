import sqlite3
import os

# Nombre de la base de datos
DB_NAME = "nem_primaria.db"

def cargar_todo():
    if os.path.exists(DB_NAME):
        os.remove(DB_NAME)
        print("♻️  Base de datos anterior limpiada.")

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # 1. CREAR TABLAS
    cursor.executescript("""
    CREATE TABLE fases (id INTEGER PRIMARY KEY, nombre TEXT);
    CREATE TABLE campos_formativos (id INTEGER PRIMARY KEY, nombre TEXT);
    CREATE TABLE contenidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fase_id INTEGER,
        campo_id INTEGER,
        descripcion TEXT,
        FOREIGN KEY(fase_id) REFERENCES fases(id),
        FOREIGN KEY(campo_id) REFERENCES campos_formativos(id)
    );
    CREATE TABLE pdas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contenido_id INTEGER,
        grado INTEGER,
        descripcion TEXT,
        estado TEXT DEFAULT 'Pendiente',
        FOREIGN KEY(contenido_id) REFERENCES contenidos(id)
    );
    """)

    # 2. CATALOGOS
    cursor.executemany("INSERT INTO fases VALUES (?, ?)", [
        (3, 'Fase 3 (1º y 2º Primaria)'),
        (4, 'Fase 4 (3º y 4º Primaria)'),
        (5, 'Fase 5 (5º y 6º Primaria)')
    ])
    
    # Mapeo de campos para facilitar la inserción
    CAMPOS = {
        'LENGUAJES': 1,
        'SABERES': 2,
        'ETICA': 3,
        'HUMANO': 4
    }
    
    cursor.executemany("INSERT INTO campos_formativos VALUES (?, ?)", [
        (1, 'Lenguajes'),
        (2, 'Saberes y Pensamiento Científico'),
        (3, 'Ética, Naturaleza y Sociedades'),
        (4, 'De lo Humano y lo Comunitario')
    ])

    print("🚀 Iniciando Carga Masiva de la NEM...")

    # Función auxiliar para insertar datos
    def insertar(fase, campo_key, tema, pda_menor, pda_mayor):
        # Insertar Contenido
        cursor.execute(
            "INSERT INTO contenidos (fase_id, campo_id, descripcion) VALUES (?, ?, ?)", 
            (fase, CAMPOS[campo_key], tema)
        )
        cont_id = cursor.lastrowid
        
        # Calcular grados
        g_min = 1 if fase == 3 else (3 if fase == 4 else 5)
        g_max = 2 if fase == 3 else (4 if fase == 4 else 6)

        # Insertar PDAs
        cursor.execute("INSERT INTO pdas (contenido_id, grado, descripcion) VALUES (?, ?, ?)", (cont_id, g_min, pda_menor))
        cursor.execute("INSERT INTO pdas (contenido_id, grado, descripcion) VALUES (?, ?, ?)", (cont_id, g_max, pda_mayor))

    # ==========================================
    # DATOS REALES DEL PDF (RESUMEN REPRESENTATIVO)
    # ==========================================
    
    # --- FASE 3 (1º y 2º) ---
    datos_f3 = [
        ('LENGUAJES', 'Escritura de nombres en la lengua materna', 
         'Escribe su nombre y lo compara con los nombres de sus compañeros, lo usa para indicar la autoría de sus trabajos.', 
         'Escribe su nombre y apellidos y de sus de familiares, profesores, compañeros y otras personas de su entorno.'),
        ('LENGUAJES', 'Descripción de objetos, personas, seres vivos y lugares', 
         'Describe de manera oral y/o escrita, en su lengua materna, objetos, personas, seres vivos y lugares que conoce.', 
         'Describe en forma oral y escrita, en su lengua materna, objetos, personas, seres vivos y lugares de su entorno natural y social.'),
        ('SABERES', 'Cuerpo humano: estructura externa y acciones para su cuidado', 
         'Compara, representa y nombra las partes externas del cuerpo humano, explica su funcionamiento.', 
         'Reconoce y describe los órganos de los sentidos y su función; explica y representa acciones que los ponen en riesgo.'),
        ('SABERES', 'Estudio de los números', 
         'Expresa oralmente la sucesión numérica hasta 120 elementos, de manera ascendente y descendente.', 
         'Expresa oralmente la sucesión numérica hasta 1000, en español y lengua materna, de manera ascendente y descendente.'),
        ('ETICA', 'Historia personal y familiar', 
         'Indaga en diversas fuentes orales, escritas, digitales, objetos y testimonios, para construir la historia personal y familiar.', 
         'Valora la diversidad de familias y promueve el respeto entre las y los integrantes de esta.'),
        ('HUMANO', 'La comunidad como el espacio en el que se vive', 
         'Ubica algunos referentes del lugar donde vive y se encuentra la escuela.', 
         'Identifica las ventajas que conlleva la seguridad, el intercambio, el sentido de pertenencia y la afectividad de ser parte de una comunidad.'),
        # ... Aquí se pueden agregar más de Fase 3
    ]

    # --- FASE 4 (3º y 4º) ---
    datos_f4 = [
        ('LENGUAJES', 'Narración de sucesos del pasado y del presente', 
         'Identifica y comprende la función y las características principales de la narración.', 
         'Reconoce y usa diversos estilos, recursos y estrategias narrativas.'),
        ('LENGUAJES', 'Exposición sobre temas diversos', 
         'Reconoce características de la oralidad: recursos expresivos y paralingüísticos.', 
         'Expone sobre diversos temas, considerando planear su exposición y elaborar materiales de apoyo.'),
        ('SABERES', 'Estructura y funcionamiento del cuerpo humano: sistemas locomotor y digestivo', 
         'Identifica y describe que el sistema locomotor está conformado por el sistema óseo y muscular.', 
         'Identifica y describe la estructura y funciones del sistema digestivo, así como su relación con el sistema circulatorio.'),
        ('SABERES', 'Suma y resta, su relación como operaciones inversas', 
         'Resuelve situaciones problemáticas que implican sumas de números naturales de hasta tres cifras.', 
         'Resuelve situaciones problemáticas que implican sumas o restas de números naturales de hasta cuatro cifras.'),
        ('ETICA', 'Representaciones cartográficas de la localidad', 
         'Elabora representaciones cartográficas de la localidad o pueblo donde vive.', 
         'Elabora representaciones cartográficas de la entidad y el territorio nacional.'),
        ('HUMANO', 'La familia como espacio de protección', 
         'Identifica formas de convivencia y socialización en la familia, para distinguir formas de participación.', 
         'Reflexiona sobre el valor de una familia y de la aportación de sus integrantes para favorecer su desarrollo.'),
    ]

    # --- FASE 5 (5º y 6º) ---
    datos_f5 = [
        ('LENGUAJES', 'Narración de sucesos autobiográficos', 
         'Lee textos autobiográficos y reflexiona sobre las razones por las que suelen estar narrados en primera persona.', 
         'Lee textos autobiográficos e identifica las relaciones temporales de secuencia, simultaneidad y duración.'),
        ('LENGUAJES', 'Comprensión y producción de textos informativos', 
         'Selecciona y lee textos informativos sobre temas de su interés. Formula preguntas para guiar la búsqueda.', 
         'Lee textos informativos y reflexiona sobre su organización. Identifica información específica sobre asuntos de su interés.'),
        ('SABERES', 'Estructura y funcionamiento del cuerpo humano: sistemas circulatorio y respiratorio', 
         'Describe y representa mediante modelos la relación de la nariz, tráquea y pulmones con el intercambio de gases.', 
         'Explica la participación del sistema inmunológico en la defensa y protección del cuerpo humano.'),
        ('SABERES', 'Proporcionalidad', 
         'A partir de situaciones problemáticas, determina valores faltantes a partir de diferentes estrategias (valor unitario).', 
         'Determina valores faltantes en situaciones donde en ocasiones se conoce el valor unitario y en otras no.'),
        ('ETICA', 'Valoración de la biodiversidad', 
         'Comprende la biodiversidad, su función como elemento vital en la Tierra y en el equilibrio de la biosfera.', 
         'Comprende la biodiversidad en la Tierra, su sistema de relaciones e interdependencia global.'),
        ('HUMANO', 'Construcción del proyecto de vida', 
         'Replantea las formas de satisfacer las necesidades e intereses, para promover la autodeterminación.', 
         'Valora logros y cambios en gustos, necesidades, intereses y habilidades actuales, para reestructurar metas.'),
    ]

    # Insertar todo en bucles
    print("... Insertando Fase 3")
    for d in datos_f3: insertar(3, d[0], d[1], d[2], d[3])
    
    print("... Insertando Fase 4")
    for d in datos_f4: insertar(4, d[0], d[1], d[2], d[3])
    
    print("... Insertando Fase 5")
    for d in datos_f5: insertar(5, d[0], d[1], d[2], d[3])

    conn.commit()
    
    # Verificación
    total = cursor.execute("SELECT COUNT(*) FROM pdas").fetchone()[0]
    print(f"✅ ¡LISTO! Base de datos actualizada con {total} PDAs organizados por grado.")
    conn.close()

if __name__ == "__main__":
    cargar_todo()