import sqlite3
import os

# Ruta de la base de datos
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(BASE_DIR, "nem_primaria.db")

def sembrar_dosificacion_completa():
    print(f"🚀 Iniciando CARGA MASIVA REAL (1º a 6º Grado) en: {DB_NAME}")
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # 1. LIMPIEZA TOTAL
    tablas = ['proyectos_sugeridos', 'pdas', 'contenidos', 'campos_formativos']
    for t in tablas:
        cursor.execute(f"DROP TABLE IF EXISTS {t}")
    
    # 2. CREAR ESTRUCTURA DE TABLAS
    print("🏗️ Reconstruyendo tablas...")
    
    # Campos Formativos
    cursor.execute("CREATE TABLE campos_formativos (id INTEGER PRIMARY KEY, nombre TEXT)")
    campos = [(1, "Lenguajes"), (2, "Saberes y Pensamiento Científico"), 
              (3, "Ética, Naturaleza y Sociedades"), (4, "De lo Humano y lo Comunitario")]
    cursor.executemany("INSERT INTO campos_formativos VALUES (?,?)", campos)

    # Contenidos
    cursor.execute("""
    CREATE TABLE contenidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campo_id INTEGER,
        descripcion TEXT,
        FOREIGN KEY(campo_id) REFERENCES campos_formativos(id)
    )""")

    # PDAs
    cursor.execute("""
    CREATE TABLE pdas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contenido_id INTEGER,
        grado INTEGER,
        descripcion TEXT,
        estado TEXT DEFAULT 'Pendiente',
        FOREIGN KEY(contenido_id) REFERENCES contenidos(id)
    )""")

    # PROYECTOS SUGERIDOS (Dosificación)
    cursor.execute("""
    CREATE TABLE proyectos_sugeridos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pda_id INTEGER,
        nombre_proyecto TEXT,
        mes_sugerido TEXT,
        paginas_libro TEXT,
        escenario TEXT,
        producto_final TEXT,
        FOREIGN KEY(pda_id) REFERENCES pdas(id)
    )""")

    # 3. DATOS DE TUS ARCHIVOS (EXTRACCIÓN REAL)
    # Formato: (Grado, Mes, Proyecto, Paginas, Campo_ID, Escenario, Contenido, PDA, Producto)
    
    datos_reales = [
        # === 1º GRADO ===
        (1, "Septiembre", "Nombrario de Grupo", "18-25", 1, "Aula", "Escritura de nombres en la lengua materna", "Escribe su nombre y lo compara con los de sus compañeros, lo usa para autoría, útiles, asistencia, etc.", "Nombrario de grupo"),
        (1, "Septiembre", "Reglamento del aula y su importancia", "132-137", 3, "Aula", "Democracia como forma de vida", "Participa en la revisión y construcción de acuerdos y reglas de convivencia", "Reglamento del aula"),
        (1, "Septiembre", "Conozco, cuido y aprecio mi comunidad", "142-157", 4, "Comunidad", "Formas de ser, pensar, actuar y relacionarse", "Reconoce y descubre características y cambios que le hacen una persona única", "Campaña informativa"),
        (1, "Octubre", "Juntos fomentamos la Lectura", "184-197", 4, "Comunidad", "Apoyos mutuos para favorecer los aprendizajes", "Identifica y valora la presencia de diferentes lenguas y ofrece apoyos a sus pares", "Café literario"),
        (1, "Octubre", "Mi cuerpo y sus movimientos", "194-205", 2, "Aula", "Cuerpo humano: estructura externa, cuidado y cambios", "Compara y representa las partes externas del cuerpo, sus funciones y acciones de cuidado", "Mano robótica"),
        (1, "Noviembre", "Yo me cuido, tú me cuidas", "68-79", 1, "Escolar", "Producción e interpretación de avisos, carteles", "Identifica funciones de carteles, propone elaboración colectiva para lograr propósitos", "Álbum de plantas"),
        (1, "Diciembre", "Celebramos la navidad", "SN", 4, "Escolar", "Tradiciones y celebraciones culturales", "Reconoce y valora manifestaciones culturales a través de relatos y cantos", "Pastorela"),
        (1, "Enero", "Los beneficios de las plantas", "120-127", 3, "Comunidad", "Responsabilidad compartida en el cuidado de sí y del entorno", "Identifica y describe responsabilidades compartidas en la familia, escuela y comunidad", "Farmacia de plantas medicinales"),
        (1, "Febrero", "¿Cómo mover los objetos a lugares alto?", "256-265", 2, "Comunidad", "Efectos de la aplicación de fuerzas", "Observa, experimenta y registra trayectorias, rapidez y movimiento de objetos", "Propuesta de solución con rampa"),
        (1, "Marzo", "Una escuela llena de emociones", "156-165", 4, "Escolar", "Construcción del proyecto de vida", "Explica situaciones cotidianas de la escuela y casa, propone acuerdos para mejorar convivencia", "Feria de emociones"),
        (1, "Abril", "El Rincón de los juegos", "178-191", 4, "Aula", "Interacción motriz", "Colabora en la definición de normas básicas de convivencia en juegos y situaciones cotidianas", "Juegos de mesa"),
        (1, "Mayo", "¡Bailamos palabras musicalizadas!", "54-67", 1, "Comunidad", "Experimentación con elementos sonoros", "Escucha y lee poemas, adivinanzas, trabalenguas; produce rimas", "Canciones y coreografías"),
        (1, "Junio", "La importancia del Bosque", "116-123", 3, "Aula", "Impacto de las actividades humanas en la naturaleza", "Describe actividades cotidianas y su relación con la naturaleza para reconocer acciones que benefician o dañan", "Experimento “El bosque limpia el agua”"),
        (1, "Julio", "Museo de las emociones", "158-173", 4, "Comunidad", "Construcción del proyecto de vida", "Identifica logros y cambios que fortalecen autonomía", "Museo de las emociones"),

        # === 2º GRADO ===
        (2, "Septiembre", "Conozcamos mejor para hacer equipo", "10-17", 1, "Aula", "Exploración de testimonios del pasado familiar", "Expresa ideas y emociones del pasado familiar y comunitario a través de fotografías y objetos", "Collage"),
        (2, "Septiembre", "Cuidamos nuestra escuela", "142-149", 3, "Escolar", "Impacto de las actividades humanas en la naturaleza", "Relaciona actividades humanas con efectos en la naturaleza y propone acciones de cuidado", "Actividades vinculadas"),
        (2, "Octubre", "Una mano a la alimentación", "114-125", 2, "Aula", "Beneficios del consumo de alimentos saludables", "Reconoce y clasifica alimentos y bebidas; describe alimentos locales", "Diseño de vasos medidores"),
        (2, "Noviembre", "Teatro Guiñol por la convivencia", "236-249", 4, "Aula", "Situaciones de riesgo social en la familia", "Propone prácticas de autocuidado y convivencia pacífica", "Obra de teatro Guiñol"),
        (2, "Diciembre", "Celebremos la navidad", "SN", 1, "Escolar", "Manifestaciones culturales y tradiciones", "Investiga costumbres y tradiciones navideñas en su comunidad y otras regiones", "Pastorela y villancicos"),
        (2, "Enero", "Acciones comunitarias sostenibles", "156-165", 3, "Comunidad", "Cambios en la naturaleza y su relación con actividades humanas", "Identifica cambios en la naturaleza y propone cambios individuales y comunitarios", "Mural sobre el ambiente"),
        (2, "Febrero", "Convivencia armónica en el aula", "194-199", 3, "Aula", "Democracia como forma de vida", "Participa en la revisión y construcción de acuerdos y normas", "Álbum de la Convivencia"),
        (2, "Marzo", "La diversidad nos enriquece", "72-89", 1, "Comunidad", "Manifestaciones culturales y símbolos", "Reconoce y valora símbolos nacionales; representa cambios y permanencias", "Actividades de ayuda comunitaria"),
        (2, "Abril", "Feria de la Salud", "208-217", 4, "Comunidad", "Acciones individuales que repercuten en la conservación de la salud", "Reflexiona sobre comportamientos de riesgo; socializa alternativas de solución", "Feria de la Salud"),
        (2, "Mayo", "Actividades artesanales", "184-193", 3, "Escolar", "Manifestaciones culturales y símbolos", "Reconoce y valora símbolos nacionales; representa cambios en la vida cotidiana", "Artesanía"),
        (2, "Junio", "El muro de los deseos", "60-71", 1, "Escolar", "Producción e interpretación de avisos y carteles", "Reconoce características y funciones de anuncios publicitarios; elabora avisos", "Muro de los deseos"),
        (2, "Julio", "Libro de álbum de historias", "40-51", 1, "Escolar", "Recreación de historias", "Lee historietas sencillas, reconoce recursos gráficos y elabora cómics", "Libro de álbum de historias"),

        # === 3º GRADO ===
        (3, "Septiembre", "¿A dónde pertenezco?", "262-283", 4, "Comunidad", "Sentido de pertenencia, identidad personal y social", "Identifica eventos importantes de la historia de la comunidad (fundación, logros)", "Ciclo de conferencias"),
        (3, "Septiembre", "Acordamos reglas para convivir mejor", "278-287", 4, "Escolar", "La escuela como espacio de convivencia", "Participa en la organización del aula y en la generación de normas", "Reglamento escolar"),
        (3, "Octubre", "Decidimos y convivimos", "280-293", 4, "Aula", "Pensamiento lúdico, estratégico y creativo", "Toma decisiones estratégicas en situaciones de juego y cotidianas", "Manual ilustrado"),
        (3, "Noviembre", "Ganar, ganar", "102-113", 2, "Comunidad", "Alimentación saludable con base en el Plato del Bien Comer", "Explica la importancia de una alimentación higiénica y variada", "Control de gastos"),
        (3, "Diciembre", "Nosotros, nosotras y las cartas", "72-85", 1, "Comunidad", "Comunicación a distancia con interlocutores y propósitos diversos", "Lee y comenta cartas reales o literarias; identifica funciones de textos epistolares", "Escribir cartas"),
        (3, "Enero", "El placer de aprender a través de los instructivos", "26-39", 1, "Escolar", "Comprensión y producción de textos instructivos", "Identifica y reflexiona sobre la función de los textos instructivos; organiza datos", "Instructivo"),
        (3, "Febrero", "Los símbolos me dan identidad", "220-231", 3, "Aula", "Origen histórico de símbolos (territorio, banderas, himnos)", "Indaga símbolos de identidad en comunidad, localidad y país", "Chocolate literario"),
        (3, "Marzo", "El jardín del Sol", "174-193", 2, "Escolar", "Sistema Tierra-Luna-Sol: interacciones", "Realiza observaciones y mediciones de los astros; analiza fenómenos naturales", "Observaciones del Sistema Solar"),
        (3, "Abril", "Expo actívate", "320-337", 4, "Escolar", "Interacción motriz", "Establece acuerdos ante situaciones de juego; reflexiona sobre resultados", "Exposición de juegos tradicionales"),
        (3, "Mayo", "Una historia extraordinaria", "20-31", 1, "Comunidad", "Comprensión y producción de resúmenes", "Reconoce función y características del resumen; selecciona información relevante", "Foro escolar de historia"),
        (3, "Junio", "Recorrido por nuestro espacio vital", "180-193", 3, "Comunidad", "Valoración de los ecosistemas", "Representa cartográficamente el territorio; indaga interacciones comunidad-ecosistema", "Recorrido comunitario"),
        (3, "Julio", "¿Qué te dice mi cuerpo?", "302-319", 4, "Escolar", "Posibilidades cognitivas, expresivas, motrices", "Elabora códigos de comunicación corporal; otorga intención a sus movimientos", "Rally con la comunidad"),

        # === 4º GRADO ===
        (4, "Septiembre", "Aprendo a escuchar para poder dialogar", "10-21", 1, "Aula", "Diálogo para la toma de acuerdos", "Indica de manera respetuosa cuando no comprende, utiliza varias fuentes para explicar y argumentar", "Cómics"),
        (4, "Septiembre", "Detectives del conflicto", "246-255", 3, "Aula", "La construcción colectiva de la paz", "Comprende que la paz es una construcción colectiva, analiza causas de conflictos", "Decálogo para resolver conflictos"),
        (4, "Octubre", "Nuestra revista escolar", "10-25", 1, "Escolar", "Comprensión y producción de textos expositivos", "Identifica efectos en un texto expositivo, planea y redacta sus textos", "Revista Escolar"),
        (4, "Noviembre", "Reciclamos la vida", "162-175", 2, "Comunidad", "Impacto de las actividades humanas en la naturaleza", "Indaga y describe problemas de contaminación; analiza causas y efectos", "Prototipo de filtro"),
        (4, "Diciembre", "El juego es un espacio para todos", "294-309", 4, "Aula", "Interacción motriz", "Experimenta situaciones cooperativas y de oposición en juegos", "Manual de Juegos Tradicionales"),
        (4, "Enero", "Niñas y niños de mi aula, somos noticia", "22-33", 1, "Aula", "Indagación y difusión de notas informativas", "Conoce noticias en distintos medios, compara su tratamiento, identifica semejanzas", "Boletín informativo"),
        (4, "Febrero", "Optimizando las fuerzas", "174-193", 2, "Aula", "Efectos de la aplicación de fuerzas y del calor", "Experimenta con fricción y calor, describe efectos del calor en objetos", "Construcción de un Carro"),
        (4, "Marzo", "La Tierra, la Luz del Sol y la cara oculta de la Luna", "184-195", 2, "Escolar", "Sistema Tierra-Luna-Sol: interacciones", "Indaga la formación de eclipses solares y lunares, describe fenómenos astronómicos", "Calendario Lunar"),
        (4, "Abril", "Festival de talentos", "272-287", 4, "Escolar", "Formas de ser, pensar, actuar y relacionarse", "Comparte cambios en capacidades y formas de ser, reconoce la influencia de otros", "Diseño de Festival de Talentos"),
        (4, "Mayo", "Nos preparamos para estar a salvo", "230-239", 3, "Escolar", "Acciones de prevención ante fenómenos naturales", "Indaga sobre desastres ocurridos, elabora mapas, identifica protocolos de emergencia", "Guía para ubicar zonas de seguridad"),
        (4, "Junio", "El trueque en la comunidad", "186-201", 3, "Comunidad", "Valoración de ecosistemas y prácticas sustentables", "Reconoce relación comunidad-naturaleza, analiza impacto de prácticas económicas", "Organización de trueques"),
        (4, "Julio", "Anécdotas animadas de mi comunidad", "88-103", 1, "Comunidad", "Comprensión y producción de cuentos", "Lee y escucha cuentos, reflexiona sobre tiempos verbales, escribe un cuento colectivo", "Cuento narrado y folioscopio"),

        # === 5º GRADO ===
        (5, "Septiembre", "Acordamos colectivamente normas y reglas", "64-79", 1, "Aula", "Comparación y producción de documentos que regulan la convivencia", "Analiza reglamentos escolares, identifica características y participa en la elaboración", "Acuerdo Escolar"),
        (5, "Septiembre", "Construyamos ideas para la paz", "246-261", 4, "Escolar", "Alternativas ante conflictos y problemas", "Reflexiona sobre conflictos en escuela y familia, valora alternativas de solución", "Exposición artística"),
        (5, "Octubre", "Un menú saludable", "152-161", 2, "Aula", "Alimentación saludable: dieta correcta", "Explica características de la dieta correcta, analiza riesgos y diseña menús", "Menús saludables"),
        (5, "Noviembre", "Las historias que nos unen", "50-64", 1, "Aula", "Elaboración e intercambio de reseñas", "Reconoce características y función de las reseñas, redacta opiniones", "Antología de reseñas"),
        (5, "Diciembre", "Tianguis lúdico", "316-325", 4, "Aula", "Pensamiento lúdico, estratégico y creativo", "Planifica e implementa estrategias en juegos de mesa y de patio tradicionales", "Tianguis lúdico"),
        (5, "Enero", "Migrar es un derecho humano", "246-263", 3, "Aula", "Migración y derechos humanos", "Reconoce procesos de migración, analiza testimonios y noticias, ubica rutas migratorias", "Campaña de difusión"),
        (5, "Febrero", "El espacio entre tú y yo", "118-129", 2, "Escolar", "Propiedades de materiales y caracterización de los gases", "Experimenta con materiales, relaciona propiedades con su uso, construye objetos", "Experimentos sobre propiedades"),
        (5, "Marzo", "La perspectiva de género mediante la música", "50-63", 1, "Escolar", "Apropiación e intervención artística", "Plantea propuestas creativas, representa problemáticas sociales y modifica letras de canciones", "Canción intervenida"),
        (5, "Abril", "Los sabores y saberes que rodean al maíz", "80-91", 1, "Comunidad", "Elaboración de un tríptico informativo", "Analiza trípticos informativos, investiga en fuentes diversas, organiza información", "Tríptico ilustrado"),
        (5, "Mayo", "Sobre cuentos y poemas", "64-75", 1, "Escolar", "Análisis de cuentos y poemas", "Lee y selecciona cuentos y poemas mexicanos, los analiza y organiza un recital", "Exposición de poemas"),
        (5, "Junio", "Los niños y las niñas también hacemos democracia", "210-221", 3, "Escolar", "La democracia como forma de gobierno", "Investiga transformaciones en las formas de gobierno, analiza la participación política", "Galería de arte sobre derechos"),
        (5, "Julio", "Lo que soy, lo que quiero ser", "278-289", 4, "Aula", "Construcción del proyecto de vida", "Analiza intereses individuales y colectivos, identifica metas y diseña un tríptico", "Tríptico de logros"),

        # === 6º GRADO ===
        (6, "Septiembre", "El reglamento ilustrado", "50-59", 1, "Aula", "Comparación y producción de documentos", "Reconoce la función de reglamentos, reflexiona sobre verbos y numerales", "Elaboración de reglamento ilustrado"),
        (6, "Septiembre", "Conflictos que rompen la paz", "208-227", 3, "Comunidad", "Construcción de la cultura de paz", "Analiza conflictos territoriales en México y realiza propuestas para la cultura de paz", "Propuesta de resolución"),
        (6, "Octubre", "Mi comunidad se expresa", "96-107", 1, "Comunidad", "Análisis de cuentos y poemas", "Selecciona y lee cuentos, elabora antología e interpreta textos", "Cuento compartido"),
        (6, "Noviembre", "Violencia de género, un problema que nos afecta", "228-241", 3, "Comunidad", "Desafíos para la construcción de sociedades inclusivas", "Analiza causas de violencia de género y propone acciones de equidad", "Conferencia"),
        (6, "Diciembre", "Juguemos entre Todxs", "318-327", 4, "Comunidad", "Formas de ser, pensar, actuar y relacionarse", "Valora experiencias de convivencia, fomenta empatía y organiza juegos comunitarios", "Juegos representativos"),
        (6, "Enero", "La migración, una cambio en mis fronteras", "246-261", 3, "Aula", "Migración y derechos humanos", "Reconoce flujos migratorios, analiza causas y consecuencias, ubica rutas", "Guelaguetza de aprendizajes"),
        (6, "Febrero", "Comunidades por correspondencia", "36-49", 1, "Comunidad", "Producción y envío de cartas personales", "Lee y analiza cartas personales, distingue ventajas del correo postal y electrónico", "Cartas para amistades"),
        (6, "Marzo", "¿Por qué ellos sí y nosotras no?", "86-95", 1, "Aula", "Comprensión y producción de textos informativos", "Lee y organiza textos informativos, identifica información específica", "Diario de acuerdos"),
        (6, "Abril", "Construyamos el bien común y evitemos la violencia", "328-339", 4, "Comunidad", "Equidad de género", "Reflexiona sobre situaciones de discriminación y violencia, analiza riesgos", "Foro Ciudadano para la Paz"),
        (6, "Mayo", "Cuidándonos del impostor", "50-61", 1, "Comunidad", "Seguimiento crítico de noticias", "Consulta y analiza noticias en diversos medios, identifica fuentes confiables", "Infografía"),
        (6, "Junio", "Mi familia es mi gran equipo", "264-277", 4, "Aula", "La familia como espacio para el desarrollo", "Diseña e interactúa en escenarios de convivencia familiar, promueve valores", "Exposición y plática"),
        (6, "Julio", "Con los pies ligeros ¡Todos ganamos!", "278-287", 4, "Aula", "Capacidades, habilidades y destrezas motrices", "Aplica sus habilidades motrices en juegos y actividades deportivas", "Coreografía"),
    ]

    print(f"⏳ Procesando {len(datos_reales)} proyectos oficiales...")

    count = 0
    for fila in datos_reales:
        grado, mes, proy, pags, campo_id, escenario, cont_desc, pda_desc, prod = fila
        
        # 1. Buscar o Crear Contenido
        cursor.execute("SELECT id FROM contenidos WHERE descripcion = ?", (cont_desc,))
        res = cursor.fetchone()
        if res:
            contenido_id = res[0]
        else:
            cursor.execute("INSERT INTO contenidos (campo_id, descripcion) VALUES (?, ?)", (campo_id, cont_desc))
            contenido_id = cursor.lastrowid

        # 2. Buscar o Crear PDA
        cursor.execute("SELECT id FROM pdas WHERE descripcion = ? AND grado = ?", (pda_desc, grado))
        res_pda = cursor.fetchone()
        if res_pda:
            pda_id = res_pda[0]
        else:
            cursor.execute("INSERT INTO pdas (contenido_id, grado, descripcion) VALUES (?, ?, ?)", (contenido_id, grado, pda_desc))
            pda_id = cursor.lastrowid

        # 3. Insertar Proyecto Sugerido
        cursor.execute("""
            INSERT INTO proyectos_sugeridos 
            (pda_id, nombre_proyecto, mes_sugerido, paginas_libro, escenario, producto_final)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (pda_id, proy, mes, pags, escenario, prod))
        
        count += 1

    conn.commit()
    conn.close()
    print(f"✅ ¡BASE DE DATOS ACTUALIZADA CON ÉXITO! Se cargaron {count} proyectos de los Libros de Texto.")

if __name__ == "__main__":
    sembrar_dosificacion_completa()