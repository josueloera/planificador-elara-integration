import sqlite3

DB_NAME = "nem_primaria.db"

def sembrar_datos():
    print("🌱 Sembrando PDAs y Contenidos de la NEM...")
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # 1. LIMPIEZA INICIAL (Para no duplicar si lo corres dos veces)
    cursor.execute("DELETE FROM pdas")
    cursor.execute("DELETE FROM contenidos")
    cursor.execute("DELETE FROM campos_formativos")
    
    # Reiniciar contadores de ID
    cursor.execute("DELETE FROM sqlite_sequence WHERE name='pdas'")
    cursor.execute("DELETE FROM sqlite_sequence WHERE name='contenidos'")
    cursor.execute("DELETE FROM sqlite_sequence WHERE name='campos_formativos'")

    # 2. INSERTAR CAMPOS FORMATIVOS
    campos = [
        (1, "Lenguajes"),
        (2, "Saberes y Pensamiento Científico"),
        (3, "Ética, Naturaleza y Sociedades"),
        (4, "De lo Humano y lo Comunitario")
    ]
    cursor.executemany("INSERT INTO campos_formativos (id, nombre) VALUES (?, ?)", campos)
    print("✅ Campos Formativos insertados.")

    # DATOS MACRO (Ejemplos reales del Programa Sintético)
    # Estructura: (Campo_ID, Fase_ID, Descripción_Contenido, [ (Grado, Descripción_PDA), ... ])
    # Fase 3: 1º y 2º | Fase 4: 3º y 4º | Fase 5: 5º y 6º
    
    datos_nem = [
        # --- LENGUAJES (FASE 3 - 1º y 2º) ---
        (1, 3, "Escritura de nombres en la lengua materna.", [
            (1, "Escribe su nombre y lo compara con los nombres de sus compañeros, lo usa para indicar la autoría de sus trabajos."),
            (2, "Escribe su nombre y apellidos y los de sus de familiares y profesores para su uso en situaciones cotidianas.")
        ]),
        (1, 3, "Descripción de objetos, personas, seres vivos y lugares.", [
            (1, "Describe de manera oral y/o escrita, en su lengua materna, objetos, personas, seres vivos y lugares que conoce."),
            (2, "Describe de forma oral y escrita, en su lengua materna, objetos, lugares y seres vivos de su entorno natural y social.")
        ]),
        
        # --- SABERES Y PENSAMIENTO CIENTÍFICO (FASE 3 - 1º y 2º) ---
        (2, 3, "Cuerpo humano: estructura externa, acciones para su cuidado.", [
            (1, "Compara, representa y nombra las partes externas del cuerpo humano, explica su funcionamiento."),
            (2, "Reconoce y describe los órganos de los sentidos y su función; explica y representa acciones que los ponen en riesgo.")
        ]),
        (2, 3, "Estudio de los números.", [
            (1, "Expresa oralmente la sucesión numérica hasta 120 elementos, de manera ascendente y descendente."),
            (2, "Expresa oralmente la sucesión numérica hasta 1000, en español y en su lengua materna.")
        ]),

        # --- ÉTICA, NATURALEZA Y SOCIEDADES (FASE 4 - 3º y 4º) ---
        (3, 4, "Representaciones cartográficas de la localidad y/o comunidad.", [
            (3, "Elabora representaciones cartográficas de la localidad o pueblo donde vive, considerando los puntos cardinales."),
            (4, "Elabora representaciones cartográficas de la entidad y el territorio nacional, considerando los puntos cardinales.")
        ]),
        (3, 4, "El derecho a la protección de la integridad propia y la de todas las personas.", [
            (3, "Identifica situaciones y personas que representan un riesgo para la protección de la dignidad y la integridad."),
            (4, "Propone y practica acciones para prevenir situaciones de riesgo y proteger la integridad personal.")
        ]),

        # --- DE LO HUMANO Y LO COMUNITARIO (FASE 4 - 3º y 4º) ---
        (4, 4, "La comunidad como el espacio en el que se vive y se encuentra la escuela.", [
            (3, "Indaga acerca de ideas, conocimientos, prácticas culturales, formas de organización y acuerdos familiares."),
            (4, "Reconoce ideas, conocimientos, prácticas culturales y formas de organización, para explicar el significado en su comunidad.")
        ]),
        (4, 4, "Entendimiento mutuo en la escuela.", [
            (3, "Participa en distintas situaciones para acordar reglas en la familia, la escuela y la comunidad."),
            (4, "Comparte ideas y experiencias sobre diferentes temas, para aprender la importancia de escuchar.")
        ]),

        # --- LENGUAJES (FASE 5 - 5º y 6º) ---
        (1, 5, "Narración de sucesos autobiográficos.", [
            (5, "Lee textos autobiográficos e identifica las relaciones temporales de secuencia, simultaneidad y duración."),
            (6, "Lee textos autobiográficos e identifica las relaciones temporales de secuencia, simultaneidad y duración.")
        ]),
        (1, 5, "Comprensión y producción de textos informativos.", [
            (5, "Selecciona y lee textos informativos sobre temas de su interés."),
            (6, "Lee textos informativos y reflexiona sobre su organización.")
        ]),

        # --- SABERES Y PENSAMIENTO (FASE 5 - 5º y 6º) ---
        (2, 5, "Estructura y funcionamiento del cuerpo humano: sistemas circulatorio.", [
            (5, "Indaga y explica con modelos, la función general del corazón y los vasos sanguíneos."),
            (6, "Explica la participación del sistema inmunológico en la defensa y protección del cuerpo humano.")
        ]),
        (2, 5, "Suma y resta, su relación como operaciones inversas.", [
            (5, "Propone y resuelve situaciones problemáticas que implican sumas y restas con números decimales."),
            (6, "A partir de situaciones problemáticas, resuelve sumas y restas con números decimales y fracciones.")
        ])
    ]

    # 3. INSERTAR CONTENIDOS Y PDAS
    for campo_id, fase_id, desc_contenido, lista_pdas in datos_nem:
        # Insertar Contenido
        cursor.execute("INSERT INTO contenidos (campo_id, fase_id, descripcion) VALUES (?, ?, ?)", (campo_id, fase_id, desc_contenido))
        contenido_id = cursor.lastrowid
        
        # Insertar sus PDAs correspondientes
        for grado, desc_pda in lista_pdas:
            cursor.execute("INSERT INTO pdas (contenido_id, grado, descripcion, estado) VALUES (?, ?, ?, ?)", (contenido_id, grado, desc_pda, 'Pendiente'))

    conn.commit()
    conn.close()
    print(f"✅ ¡Base de datos poblada con éxito! Se insertaron {len(datos_nem)} contenidos y sus PDAs.")

if __name__ == "__main__":
    sembrar_datos()