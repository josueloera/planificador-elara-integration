import sqlite3

DB_NAME = "nem_primaria.db"

def sembrar_datos_pdf():
    print("📚 Sembrando PDAs del documento 'Mtra. de Apoyo'...")
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # 1. LIMPIEZA TOTAL
    cursor.execute("DELETE FROM pdas")
    cursor.execute("DELETE FROM contenidos")
    cursor.execute("DELETE FROM campos_formativos")
    cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('pdas', 'contenidos', 'campos_formativos')")

    # 2. CAMPOS FORMATIVOS
    campos = [
        (1, "Lenguajes"),
        (2, "Saberes y Pensamiento Científico"),
        (3, "Ética, Naturaleza y Sociedades"),
        (4, "De lo Humano y lo Comunitario")
    ]
    cursor.executemany("INSERT INTO campos_formativos (id, nombre) VALUES (?, ?)", campos)

    # 3. DATOS MASIVOS DEL PDF (FASES 3, 4 y 5)
    # Formato: (Campo_ID, Fase, Contenido, [ (Grado, PDA), (Grado, PDA) ])
    
    datos_completos = [
        # --- FASE 3 (1º y 2º GRADO) ---
        (1, 3, "Escritura de nombres en la lengua materna.", [
            (1, "Escribe su nombre y lo compara con los nombres de sus compañeros, lo usa para indicar la autoría de sus trabajos, marcar sus útiles escolares, etc."),
            (2, "Escribe su nombre y apellidos y de sus familiares, profesores, compañeros y otras personas de su entorno para indicar autoría, pertenencia e identidad.")
        ]),
        (1, 3, "Descripción de objetos, personas, seres vivos y lugares.", [
            (1, "Describe de manera oral y/o escrita, en su lengua materna, objetos, personas, seres vivos y lugares que conoce en su contexto real o en la fantasía."),
            (2, "Describe en forma oral y escrita, en su lengua materna, objetos, personas, seres vivos y lugares de su entorno natural y social.")
        ]),
        (1, 3, "Uso de elementos y convenciones de la escritura presentes en la cotidianidad.", [
            (1, "Distingue letras de números, u otros signos o marcas gráficas que identifica y traza en textos de uso cotidiano."),
            (2, "Identifica letras en escritos en español y en lengua(s) indígena(s). Diferencia elementos y convenciones de la escritura.")
        ]),
        (1, 3, "Empleo de instrucciones para participar en juegos, usar o elaborar objetos.", [
            (1, "Sigue instrucciones, orales o escritas, para preparar un alimento sencillo y saludable (receta), utilizar o construir un objeto y/o participar en un juego."),
            (2, "Realiza actividades a partir de la lectura de instructivos. Explica a sus compañeros el proceso a seguir para uso o construcción de objetos.")
        ]),
        (2, 3, "Cuerpo humano: estructura externa, acciones para su cuidado y sus cambios.", [
            (1, "Compara, representa y nombra, en su lengua materna, las partes externas del cuerpo humano, explica su funcionamiento."),
            (2, "Reconoce y describe los órganos de los sentidos y su función; explica y representa acciones que los ponen en riesgo.")
        ]),
        (2, 3, "Estudio de los números.", [
            (1, "Expresa oralmente la sucesión numérica en su lengua materna y en español, primero hasta 20, luego hasta 40, posteriormente hasta 60 y finalmente hasta 120."),
            (2, "Expresa oralmente la sucesión numérica hasta 1000, en español y hasta donde sea posible en su lengua materna, de manera ascendente y descendente.")
        ]),
        (2, 3, "Construcción de la noción de suma y resta como operaciones inversas.", [
            (1, "Reconoce, a partir de la resolución de situaciones que implican agregar, quitar, juntar, comparar y completar, que la suma es el total de dos o más cantidades."),
            (2, "Resuelve situaciones problemáticas vinculadas a su contexto que implican sumas utilizando agrupamientos y el algoritmo convencional con números de hasta dos cifras.")
        ]),
        (3, 3, "Diversos contextos sociales, naturales y territoriales: cambios y continuidades.", [
            (1, "Identifica que es parte de un barrio, colonia, vecindad, comunidad, pueblo o localidad, y describe las características y diversidad de su entorno."),
            (2, "Comprende que, tanto de forma individual como colectiva, es parte de un contexto social, natural y territorial que se distingue de otros contextos.")
        ]),
        (3, 3, "Historia personal y familiar, diversidad de familias y el derecho a pertenecer a una.", [
            (1, "Indaga en diversas fuentes orales, escritas, digitales, objetos y testimonios, para construir la historia personal y familiar."),
            (2, "Valora la diversidad de familias y promueve el respeto entre las y los integrantes de esta, para el cuidado de sí y de su familia.")
        ]),
        (4, 3, "La comunidad como el espacio en el que se vive y se encuentra la escuela.", [
            (1, "Ubica algunos referentes del lugar donde vive y se encuentra la escuela. Platica sobre las características geográficas, climáticas, ambientales y socioculturales."),
            (2, "Identifica las ventajas que conlleva: la seguridad, el intercambio, el sentido de pertenencia, la afectividad, el ser parte de una comunidad.")
        ]),
        (4, 3, "Actitudes y prácticas que prevalecen entre los hombres y las mujeres en la familia.", [
            (1, "Platica acerca de la organización de las responsabilidades y tareas en su familia. Identifica la importancia de la participación equilibrada."),
            (2, "Analiza las situaciones acerca de la participación de hombres y mujeres, en las actividades familiares, incluyendo el sostenimiento económico.")
        ]),

        # --- FASE 4 (3º y 4º GRADO) ---
        (1, 4, "Narración de sucesos del pasado y del presente.", [
            (3, "Identifica y comprende la función y las características principales de la narración. Reconoce y usa las estructuras narrativas: lineal, circular, in media res."),
            (4, "Reconoce y usa diversos estilos, recursos y estrategias narrativas. Establece relaciones causales y temporales entre acontecimientos.")
        ]),
        (1, 4, "Descripción de personas, lugares, hechos y procesos.", [
            (3, "Comprende, a partir de la lectura de textos descriptivos, que hay formas detalladas para describir a las personas y los lugares."),
            (4, "Planea, escribe, revisa y corrige textos donde describe, de manera lógica, procesos con los que tiene cierta familiaridad.")
        ]),
        (2, 4, "Estructura y funcionamiento del cuerpo humano: sistemas locomotor y digestivo.", [
            (3, "Identifica y describe que el sistema locomotor está conformado por el sistema óseo y el sistema muscular, y sus funciones."),
            (4, "Identifica y describe la estructura y funciones del sistema digestivo, así como su relación con el sistema circulatorio.")
        ]),
        (2, 4, "Suma y resta, su relación como operaciones inversas.", [
            (3, "Resuelve situaciones problemáticas vinculadas a su contexto que implican sumas de números naturales de hasta tres cifras utilizando el algoritmo convencional."),
            (4, "Resuelve situaciones problemáticas vinculadas a su contexto que implican sumas o restas de números naturales de hasta cuatro cifras.")
        ]),
        (3, 4, "Representaciones cartográficas de la localidad y/o comunidad.", [
            (3, "Elabora representaciones cartográficas de la localidad o pueblo donde vive, considerando los puntos cardinales dentro de la entidad."),
            (4, "Elabora representaciones cartográficas de la entidad y el territorio nacional, considerando los puntos cardinales.")
        ]),
        (3, 4, "Interculturalidad y sustentabilidad: Formas de relación con la naturaleza.", [
            (3, "Conoce y analiza otras cosmovisiones o formas de relación de la sociedad con la naturaleza de pueblos originarios y campesinos."),
            (4, "Indaga y analiza formas diversas en que las mujeres contribuyen en el cuidado y la preservación del ambiente y la salud.")
        ]),
        (4, 4, "La escuela como espacio de convivencia, colaboración y aprendizaje.", [
            (3, "Participa en la organización del aula y en la generación de normas, para el uso y disfrute de los materiales de apoyo y otros recursos."),
            (4, "Participa en la toma de decisiones sobre el funcionamiento de la escuela, y la relación escuela-comunidad, para favorecer la colaboración.")
        ]),
        (4, 4, "Entendimiento mutuo en la escuela.", [
            (3, "Participa en distintas situaciones para acordar reglas en la familia, la escuela y la comunidad."),
            (4, "Comparte ideas y experiencias sobre diferentes temas, para aprender la importancia de escuchar.")
        ]),

        # --- FASE 5 (5º y 6º GRADO) ---
        (1, 5, "Narración de sucesos autobiográficos.", [
            (5, "Lee textos autobiográficos y reflexiona sobre las razones por las que suelen estar narrados en primera persona del singular."),
            (6, "Lee textos autobiográficos e identifica las relaciones temporales de secuencia, simultaneidad y duración.")
        ]),
        (1, 5, "Comprensión y producción de textos informativos.", [
            (5, "Selecciona y lee textos informativos sobre temas de su interés. Formula preguntas para guiar la búsqueda de información."),
            (6, "Lee textos informativos y reflexiona sobre su organización. Identifica información específica sobre asuntos de su interés.")
        ]),
        (2, 5, "Estructura y funcionamiento del cuerpo humano: sistemas circulatorio y respiratorio.", [
            (5, "Indaga, describe y representa con modelos, la función general del corazón y los vasos sanguíneos que forman parte del sistema circulatorio."),
            (6, "Explica la participación del sistema inmunológico en la defensa y protección del cuerpo humano ante infecciones y enfermedades.")
        ]),
        (2, 5, "Estudio de los números.", [
            (5, "Expresa oralmente la sucesión numérica hasta seis cifras, en español y hasta donde sea posible, en su lengua materna."),
            (6, "Expresa oralmente la sucesión numérica hasta billones, en español y hasta donde sea posible, en su lengua materna.")
        ]),
        (3, 5, "Valoración de la biodiversidad en la localidad, entidad, México y el mundo.", [
            (5, "Comprende la biodiversidad, su función como elemento vital en la Tierra y en el equilibrio de la biosfera."),
            (6, "Comprende la biodiversidad en la Tierra, su sistema de relaciones e interdependencia global.")
        ]),
        (3, 5, "La democracia como forma de gobierno en México y su construcción.", [
            (5, "Indaga acerca de las transformaciones en las formas de gobierno de nuestro país, durante el siglo XIX."),
            (6, "Analiza críticamente las transformaciones en la forma de gobierno en México durante el siglo XX: el fin del porfiriato y la Revolución.")
        ]),
        (4, 5, "La comunidad, como espacio para el aprendizaje y el bienestar común.", [
            (5, "Argumenta la pertinencia y vigencia de las ideas, conocimientos y prácticas culturales de su comunidad."),
            (6, "Profundiza acerca de ideas, conocimientos y prácticas culturales, para proponer alternativas orientadas a promover el bien común.")
        ]),
        (4, 5, "Toma de decisiones y creatividad, ante problemas de la vida.", [
            (5, "Describe los problemas que se presentan en su vida, para reflexionar sobre posibles soluciones."),
            (6, "Describe los problemas de vida que ha enfrentado para reflexionar sobre la resolución con base en el juicio crítico.")
        ])
    ]

    # 4. INSERTAR TODO
    print(f"⏳ Insertando {len(datos_completos)} temas principales con sus respectivos PDAs...")
    
    for campo_id, fase_id, desc_contenido, lista_pdas in datos_completos:
        # 1. Crear Contenido
        cursor.execute("INSERT INTO contenidos (campo_id, fase_id, descripcion) VALUES (?, ?, ?)", (campo_id, fase_id, desc_contenido))
        contenido_id = cursor.lastrowid
        
        # 2. Crear sus PDAs
        for grado, desc_pda in lista_pdas:
            cursor.execute("INSERT INTO pdas (contenido_id, grado, descripcion, estado) VALUES (?, ?, ?, ?)", (contenido_id, grado, desc_pda, 'Pendiente'))

    conn.commit()
    conn.close()
    print("✅ ¡BASE DE DATOS ACTUALIZADA CON DATOS DEL PDF!")

if __name__ == "__main__":
    sembrar_datos_pdf()