from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Any, List
import datetime
import os
import uuid
import re
from app.database.connection import get_db
from app.database.models import (
    Usuario, Silabo, Curso, PeriodoAcademico, SilaboChunk,
    EstadoVerificacion, AmbitoUso, TipoSilabo,
    TipoIncidenteServicio, RolUsuario, CoincidenciaPeriodo,
    ContextoCursoUsuario, OrigenContexto, IncidenteServicio, EstadoIncidente,
    LogIngestion, TipoSeccionChunk, IncidenteAcademico, SolicitudServicio,
    SugerenciaEstudio
)
from app.services.chunker import ChunkerService
from app.services.pdf_parser import PDFParserService
from app.services.ai_parser import gemini_parser
from app.services.itil_desk import ITILServiceDesk
from app.services.embeddings import embedding_service
from app.api.dependencies import get_current_user_from_token

router = APIRouter(prefix="/silabo", tags=["Gestión de Sílabos"])

class RevisionRequest(BaseModel):
    comentario: Optional[str] = None
    id_periodo_nuevo: Optional[int] = None


from app.services.syllabus_extractor import UntSyllabusExtractor

def generar_y_guardar_chunks(db: Session, silabo: Silabo, curso: Curso) -> int:
    """
    Genera chunks precisos y limpios para el sílabo y los guarda en silabo_chunk.
    Elimina cualquier chunk previo.
    Solo se deben quedar: Sumilla, Competencias, Evaluacion, Contenidos (dividido por Unidad I, II, III), y Tutoria.
    """
    # 1. Eliminar chunks anteriores
    db.query(SilaboChunk).filter(SilaboChunk.id_silabo == silabo.id_silabo).delete(synchronize_session=False)

    texto = silabo.texto_extraido or ""
    if not texto.strip():
        db.commit()
        return 0

    # 2. Segmentar el documento usando el divisor secuencial
    patrones = {
        "sumilla": [
            r"(?:^|\n)\s*(?:II|2)\s*[\.:\s\-—]+(?:SUMILLA|FUNDAMENTACI[ÓO]N)\b",
            r"(?:^|\n)\s*(?:SUMILLA|FUNDAMENTACI[ÓO]N)\s*[\.:\s]*(?:\n|$)"
        ],
        "competencias": [
            r"(?:^|\n)\s*(?:III|3)\s*[\.:\s\-—]+(?:COMPETENCIAS?|COMPETENCIA\s+(?:DE\s+EGRESO|GENERALES?))\b",
            r"(?:^|\n)\s*(?:COMPETENCIAS?|COMPETENCIA\s+DE\s+EGRESO|COMPETENCIAS?\s+GENERALES?)\s*[\.:\s]*(?:\n|$)"
        ],
        "programacion": [
            r"(?:^|\n)\s*(?:IV|V|4|5)\s*[\.:\s\-—]+(?:PROGRAMACI[ÓO]N\s+ACAD[ÉE]MICA|ARTICULACI[ÓO]N|PROGRAMACI[ÓO]N)\b",
            r"(?:^|\n)\s*(?:PROGRAMACI[ÓO]N\s+ACAD[ÉE]MICA|PROGRAMACI[ÓO]N)\s*[\.:\s]*(?:\n|$)"
        ],
        "evaluacion": [
            r"(?:^|\n)\s*(?:V|VI|5|6)\s*[\.:\s\-—]+(?:SISTEMA\s+DE\s+EVALUACI[ÓO]N|EVALUACI[ÓO]N|SISTEMA\s+DE\s+CALIFICACI[ÓO]N|CRITERIOS\s+DE\s+EVALUACI[ÓO]N)\b",
            r"(?:^|\n)\s*(?:SISTEMA\s+DE\s+EVALUACI[ÓO]N|EVALUACI[ÓO]N|SISTEMA\s+DE\s+CALIFICACI[ÓO]N|CRITERIOS\s+DE\s+EVALUACI[ÓO]N)\s*[\.:\s]*(?:\n|$)"
        ],
        "tutoria": [
            r"(?:^|\n)\s*(?:VI|VII|VIII|6|7|8)\s*[\.:\s\-—]+(?:TUTOR[ÍI]A\s+ACAD[ÉE]MICA|TUTOR[ÍI]A|CONSEJER[ÍI]A\s+ACAD[ÉE]MICA|PLAN\s+DE\s+MEJORA)\b",
            r"(?:^|\n)\s*(?:TUTOR[ÍI]A\s+ACAD[ÉE]MICA|TUTOR[ÍI]A|CONSEJER[ÍI]A\s+ACAD[ÉE]MICA|PLAN\s+DE\s+MEJORA)\s*[\.:\s]*(?:\n|$)"
        ],
        "referencias": [
            r"(?:^|\n)\s*(?:VII|VIII|IX|7|8|9)\s*[\.:\s\-—]+(?:REFERENCIAS\s+BIBLIOGR[ÁA]FICAS|BIBLIOGR[ÁA]F[ÍI]A|REFERENCIAS)\b",
            r"(?:^|\n)\s*(?:REFERENCIAS\s+BIBLIOGR[ÁA]FICAS|BIBLIOGR[ÁA]F[ÍI]A|REFERENCIAS)\s*[\.:\s]*(?:\n|$)"
        ]
    }

    posiciones = {}
    for seccion, pats in patrones.items():
        for pat in pats:
            m = re.search(pat, texto, re.IGNORECASE)
            if m:
                posiciones[seccion] = m.start()
                break

    # Ordenar las secciones encontradas por su posición
    secciones_ordenadas = sorted(posiciones.items(), key=lambda x: x[1])

    segmentos = {}
    for i, (seccion, pos_inicio) in enumerate(secciones_ordenadas):
        if i + 1 < len(secciones_ordenadas):
            pos_fin = secciones_ordenadas[i+1][1]
        else:
            pos_fin = len(texto)
        segmentos[seccion] = texto[pos_inicio:pos_fin].strip()

    def limpiar_texto(t: str, header_pat: str = None) -> str:
        t = UntSyllabusExtractor._limpiar_artefactos_pdf(t)
        if header_pat:
            t = re.sub(header_pat, '', t, count=1, flags=re.IGNORECASE).strip()
        # Normalizar espacios/nuevas líneas
        t = re.sub(r'[ \t]+', ' ', t)
        t = re.sub(r'\n\s*\n+', '\n\n', t)
        return t.strip()

    chunks_guardados = 0

    # 3. Guardar Sumilla
    if "sumilla" in segmentos:
        content = limpiar_texto(segmentos["sumilla"], r'^(?:II\s*[\.:\s\-—]+)?(?:SUMILLA|FUNDAMENTACI[ÓO]N)\b')
        if content and len(content) > 10:
            db.add(SilaboChunk(
                id_silabo=silabo.id_silabo,
                tipo_seccion=TipoSeccionChunk.SUMILLA,
                titulo="SUMILLA",
                contenido=content,
                embedding=embedding_service.generar_embedding(content),
                metadata_json={"fuente": curso.nombre_curso}
            ))
            chunks_guardados += 1

    # 4. Guardar Competencias
    if "competencias" in segmentos:
        content = limpiar_texto(segmentos["competencias"], r'^(?:III\s*[\.:\s\-—]+)?(?:COMPETENCIAS?|COMPETENCIA\s+(?:DE\s+EGRESO|GENERALES?))\b')
        if content and len(content) > 10:
            db.add(SilaboChunk(
                id_silabo=silabo.id_silabo,
                tipo_seccion=TipoSeccionChunk.COMPETENCIAS,
                titulo="COMPETENCIAS",
                contenido=content,
                embedding=embedding_service.generar_embedding(content),
                metadata_json={"fuente": curso.nombre_curso}
            ))
            chunks_guardados += 1

    # 5. Guardar Evaluación
    if "evaluacion" in segmentos:
        content = limpiar_texto(segmentos["evaluacion"], r'^(?:V|VI\s*[\.:\s\-—]+)?(?:SISTEMA\s+DE\s+EVALUACI[ÓO]N|EVALUACI[ÓO]N|SISTEMA\s+DE\s+CALIFICACI[ÓO]N|CRITERIOS\s+DE\s+EVALUACI[ÓO]N)\b')
        if content and len(content) > 10:
            db.add(SilaboChunk(
                id_silabo=silabo.id_silabo,
                tipo_seccion=TipoSeccionChunk.EVALUACION,
                titulo="EVALUACIÓN",
                contenido=content,
                embedding=embedding_service.generar_embedding(content),
                metadata_json={"fuente": curso.nombre_curso}
            ))
            chunks_guardados += 1

    # 6. Guardar Tutoría
    if "tutoria" in segmentos:
        content = limpiar_texto(segmentos["tutoria"], r'^(?:VI|VII|VIII\s*[\.:\s\-—]+)?(?:TUTOR[ÍI]A\s+ACAD[ÉE]MICA|TUTOR[ÍI]A|CONSEJER[ÍI]A\s+ACAD[ÉE]MICA|PLAN\s+DE\s+MEJORA)\b')
        if content and len(content) > 10:
            db.add(SilaboChunk(
                id_silabo=silabo.id_silabo,
                tipo_seccion=TipoSeccionChunk.TUTORIA,
                titulo="TUTORÍA ACADÉMICA",
                contenido=content,
                embedding=embedding_service.generar_embedding(content),
                metadata_json={"fuente": curso.nombre_curso}
            ))
            chunks_guardados += 1

    # 7. Guardar Contenidos (Dividido por Unidades U1, U2, U3)
    # Extraer de reglas_json (parsing_data)
    parsing_data = silabo.reglas_json or {}
    unidades = parsing_data.get("unidades", [])

    # Helper para extraer el número de semana
    def extraer_numero_semana(sem_val) -> Optional[int]:
        if isinstance(sem_val, int):
            return sem_val
        if isinstance(sem_val, float):
            return int(sem_val)
        if isinstance(sem_val, str):
            m = re.search(r'\d+', sem_val)
            if m:
                return int(m.group(0))
        return None

    # ── Pre-colectar TODAS las sesiones de TODAS las unidades ────────────────
    # Gemini a veces asigna sesiones a la unidad equivocada, o las pone en el root "sesiones".
    # Redistribuimos por número de semana según SEMANAS_RANGO (la fuente de verdad).
    global_sessions: dict[int, str] = {}  # week_num -> contenido
    
    # 1. Colectar del listado raíz "sesiones"
    for _s in parsing_data.get("sesiones", []):
        _sem = _s.get("semana", _s.get("semana_num", ""))
        _ns = extraer_numero_semana(_sem)
        _cont = _s.get("contenido", _s.get("tema", _s.get("descripcion", ""))).strip()
        if _ns is not None and _cont:
            if _ns not in global_sessions:
                global_sessions[_ns] = _cont

    # 2. Colectar del listado de unidades "unidades[].sesiones"
    for _u in unidades:
        for _s in _u.get("sesiones", []):
            _sem = _s.get("semana", _s.get("semana_num", ""))
            _ns = extraer_numero_semana(_sem)
            _cont = _s.get("contenido", _s.get("tema", _s.get("descripcion", ""))).strip()
            if _ns is not None and _cont:
                if _ns not in global_sessions:
                    global_sessions[_ns] = _cont

    # Determinar dinámicamente si el sílabo tiene 17 semanas
    es_17_semanas = False
    if global_sessions:
        if max(global_sessions.keys(), default=16) >= 17:
            es_17_semanas = True
    if not es_17_semanas and texto:
        if re.search(r'17\s*semanas', texto, re.IGNORECASE):
            es_17_semanas = True

    # Semanas de evaluación fijas del calendario UNT
    EVAL_WEEKS = {
        1: {"semana": 5,  "tipo": "EXAMEN PARCIAL – Unidad I"},
        2: {"semana": 10, "tipo": "EXAMEN PARCIAL – Unidad II"},
        3: {"semana": 16 if es_17_semanas else 15, "tipo": "EXAMEN FINAL – Unidad III"},
    }
    # Semana 16 o 17 se agrega sólo al chunk de Unidad III
    SUSTITUTORIO_WEEK = {"semana": 17 if es_17_semanas else 16, "tipo": "EXAMEN SUSTITUTORIO / APLAZADOS"}

    # Rango completo de semanas por unidad (incluyendo semana de examen)
    SEMANAS_RANGO = {
        1: set(range(1, 6)),    # 1-5
        2: set(range(6, 11)),   # 6-10
        3: set(range(11, 18)) if es_17_semanas else set(range(11, 17)),  # 11-17 o 11-16
    }
    SEMANA_DISPLAY = {
        1: "Semanas 1-5 (Semana 5: Examen Parcial)",
        2: "Semanas 6-10 (Semana 10: Examen Parcial)",
        3: f"Semanas 11-{17 if es_17_semanas else 16} (Semana {16 if es_17_semanas else 15}: Examen Final | Semana {17 if es_17_semanas else 16}: Sustitutorio/Aplazados)",
    }

    for uni in unidades:
        uid = uni.get("id", "")
        numero = uid.replace("U", "").strip()
        nombre = uni.get("nombre", "").strip()
        semanas = uni.get("semanas", "").strip()

        if not numero and "numero_unidad" in uni:
            numero = str(uni.get("numero_unidad"))
            uid = f"U{numero}"

        if not nombre and "titulo_unidad" in uni:
            nombre = uni.get("titulo_unidad", "").strip()

        # Determinar número entero de unidad
        num_entero = None
        norm_num = str(numero).upper().strip()
        if norm_num in {"1", "I"}:
            num_entero = 1
        elif norm_num in {"2", "II"}:
            num_entero = 2
        elif norm_num in {"3", "III"}:
            num_entero = 3
        else:
            if "III" in norm_num:
                num_entero = 3
            elif "II" in norm_num:
                num_entero = 2
            elif "I" in norm_num or "1" in norm_num:
                num_entero = 1
            elif "2" in norm_num:
                num_entero = 2
            elif "3" in norm_num:
                num_entero = 3

        semana_display = SEMANA_DISPLAY.get(num_entero, semanas or f"Unidad {numero}")
        semanas_permitidas = SEMANAS_RANGO.get(num_entero, set())

        # Armar encabezado
        contenido_unidad = f"CURSO: {curso.nombre_curso}\n"
        contenido_unidad += f"UNIDAD {numero}: {nombre}\n"
        contenido_unidad += f"Duración: {semana_display}\n\n"

        # --- Temas por semana (desde el pool global redistribuido) ---
        sesiones_dict: dict = {}  # num_semana -> contenido
        tiene_sesiones_reales = False
        tiene_sesiones = False


        # Usar el pool global de sesiones redistribuidas por semana
        for ns, cont in global_sessions.items():
            if semanas_permitidas and ns not in semanas_permitidas:
                continue
            sesiones_dict[ns] = cont
            tiene_sesiones_reales = True
            tiene_sesiones = True

        # --- Fallback: si faltan sesiones de contenido, minar del texto crudo ---
        # Se activa incluso si hay algunas sesiones (para rellenar las semanas faltantes)
        if not tiene_sesiones_reales and "programacion" in segmentos:
            prog_text = limpiar_texto(segmentos["programacion"])
            patron_unidad_map = {
                1: r'(?i)(?:I\s+UNIDAD|UNIDAD\s+I)\b(?!I)',
                2: r'(?i)(?:II\s+UNIDAD|UNIDAD\s+II)\b(?!I)',
                3: r'(?i)(?:III\s+UNIDAD|UNIDAD\s+III)\b',
            }
            patron_siguiente_map = {
                1: r'(?i)(?:II\s+UNIDAD|UNIDAD\s+II)\b',
                2: r'(?i)(?:III\s+UNIDAD|UNIDAD\s+III)\b',
                3: None,
            }
            patron_unidad = patron_unidad_map.get(num_entero)
            patron_siguiente = patron_siguiente_map.get(num_entero)

            if patron_unidad:
                m_ini = re.search(patron_unidad, prog_text)
                if m_ini:
                    bloque_ini = m_ini.start()
                    bloque_fin = len(prog_text)
                    if patron_siguiente:
                        m_fin = re.search(patron_siguiente, prog_text[bloque_ini + len(m_ini.group()):] )
                        if m_fin:
                            bloque_fin = bloque_ini + len(m_ini.group()) + m_fin.start()
                    bloque = prog_text[bloque_ini:bloque_fin]

                    # Extraer líneas "Semana/Sesión N: contenido" del bloque
                    for m in re.finditer(r'(?i)(?:semana|sesi[oó]n)\s*(\d+)[:\s]+(.+)', bloque):
                        ns = int(m.group(1))
                        cont_raw = m.group(2).strip()
                        if semanas_permitidas and ns not in semanas_permitidas:
                            continue
                        # No sobreescribir si ya fue extraída del JSON
                        if ns not in sesiones_dict and cont_raw:
                            sesiones_dict[ns] = cont_raw
                            tiene_sesiones_reales = True
                            tiene_sesiones = True

        # --- Inyectar semana de examen si no fue extraída como sesión ---
        if num_entero in EVAL_WEEKS:
            ew = EVAL_WEEKS[num_entero]
            if ew["semana"] not in sesiones_dict:
                sesiones_dict[ew["semana"]] = ew["tipo"]
                tiene_sesiones = True

        # Semana de sustitutorio sólo para Unidad III
        if num_entero == 3 and SUSTITUTORIO_WEEK["semana"] not in sesiones_dict:
            sesiones_dict[SUSTITUTORIO_WEEK["semana"]] = SUSTITUTORIO_WEEK["tipo"]
            tiene_sesiones = True

        # Mostrar semanas en orden (contenido real primero)
        if sesiones_dict:
            contenido_unidad += "Temas por Semana:\n"
            for num_sem in sorted(sesiones_dict):
                contenido_unidad += f"- Semana {num_sem}: {sesiones_dict[num_sem]}\n"

        # --- Logros, competencias, capacidades, resultados ---
        logros = uni.get("logros_aprendizaje", "")
        if logros:
            contenido_unidad += f"\nLogros de Aprendizaje:\n{logros}\n"

        competencias_u = uni.get("competencias", [])
        tiene_competencias = False
        if competencias_u:
            contenido_unidad += "\nCompetencias de la Unidad:\n"
            for comp in competencias_u:
                if isinstance(comp, str):
                    contenido_unidad += f"- {comp.strip()}\n"
                    tiene_competencias = True
                elif isinstance(comp, dict) and comp.get("texto"):
                    contenido_unidad += f"- {comp.get('texto').strip()}\n"
                    tiene_competencias = True

        capacidades = uni.get("capacidades", [])
        if capacidades:
            contenido_unidad += "\nCapacidades:\n"
            for cap in capacidades:
                if isinstance(cap, str):
                    contenido_unidad += f"- {cap.strip()}\n"
                elif isinstance(cap, dict) and cap.get("texto"):
                    contenido_unidad += f"- {cap.get('texto').strip()}\n"

        resultados = uni.get("resultados_aprendizaje", [])
        if resultados:
            contenido_unidad += "\nResultados de Aprendizaje:\n"
            for res in resultados:
                if isinstance(res, str):
                    contenido_unidad += f"- {res.strip()}\n"
                elif isinstance(res, dict) and res.get("texto"):
                    contenido_unidad += f"- {res.get('texto').strip()}\n"

        # --- Validar y guardar ---
        tiene_contenido = (tiene_sesiones or logros or capacidades or resultados or tiene_competencias)
        es_nombre_sustancial = nombre and len(nombre.strip()) > 8 and not re.match(
            r'^unidad\s*\d+[\s.:]*$', nombre.strip(), re.IGNORECASE
        )

        if nombre and (tiene_contenido or es_nombre_sustancial):
            content_str = contenido_unidad.strip()
            # 1. Guardar chunk completo de la unidad
            db.add(SilaboChunk(
                id_silabo=silabo.id_silabo,
                tipo_seccion=TipoSeccionChunk.CONTENIDOS,
                titulo=f"Unidad {numero}: {nombre}"[:200],
                contenido=content_str,
                embedding=embedding_service.generar_embedding(content_str),
                metadata_json={
                    "fuente": "Extracted_Units",
                    "unidad": f"U{numero}",
                    "es_unidad_completa": True,
                    "tiene_sesiones": tiene_sesiones,
                }
            ))
            chunks_guardados += 1

            # 2. Guardar chunks individuales de cada semana para RAG altamente preciso
            for num_sem, tema_sem in sesiones_dict.items():
                week_content = f"Curso: {curso.nombre_curso}\nUnidad {numero}: {nombre}\nSemana {num_sem}: {tema_sem}"
                db.add(SilaboChunk(
                    id_silabo=silabo.id_silabo,
                    tipo_seccion=TipoSeccionChunk.CONTENIDOS,
                    titulo=f"Unidad {numero} - Semana {num_sem}"[:200],
                    contenido=week_content,
                    embedding=embedding_service.generar_embedding(week_content),
                    metadata_json={
                        "fuente": "Extracted_Week",
                        "unidad": f"U{numero}",
                        "semana": num_sem,
                        "es_unidad_completa": False,
                    }
                ))
                chunks_guardados += 1
        elif nombre:
            # Registrar incidencia: la unidad fue identificada pero no tiene contenido extraíble
            print(f"[INCIDENCIA] Unidad '{nombre}' (silabo_id={silabo.id_silabo}) sin contenido extraíble. Se omite el chunk.")
            ITILServiceDesk.registrar_incidente_servicio(
                db, silabo.id_silabo,
                TipoIncidenteServicio.FALLO_PARSING,
                f"Unidad '{nombre}' detectada pero sin contenido de sesiones extraíble del JSON ni del texto crudo."
            )

    db.commit()
    return chunks_guardados


def _validar_archivo_pdf(archivo: UploadFile):
    """Valida extensión, MIME type y tamaño del archivo PDF."""
    from app.config import Config
    
    # 1. Validar extensión
    ext = os.path.splitext(archivo.filename)[1].lower() if archivo.filename else ""
    if ext != ".pdf":
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF.")
        
    # 2. Validar tipo MIME
    if archivo.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="El tipo de archivo debe ser application/pdf.")

    # 3. Validar tamaño
    archivo.file.seek(0, 2)
    size = archivo.file.tell()
    archivo.file.seek(0)
    if size > Config.MAX_PDF_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"El archivo excede el tamaño máximo permitido de {Config.MAX_PDF_SIZE_MB}MB."
        )



@router.post("/upload")
async def subir_silabo(
    id_curso: int = Form(...),
    id_periodo: int = Form(...),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_from_token)
):
    """Flujo robusto de subida de sílabo con validación automática"""
    
    # 1. Validar que no exista sílabo oficial publicado
    oficial = db.query(Silabo).filter(
        Silabo.id_curso == id_curso,
        Silabo.id_periodo == id_periodo,
        Silabo.tipo_silabo == TipoSilabo.OFICIAL,
        Silabo.ambito_uso == AmbitoUso.PUBLICADO
    ).first()
    
    if oficial:
        raise HTTPException(status_code=400, detail="Ya existe un sílabo oficial para este curso y periodo")

    # 1.5 Validar el archivo PDF
    _validar_archivo_pdf(archivo)

    # 2. Procesar PDF
    contenido = await archivo.read()
    
    # 2.1 Guardar archivo físico para consulta administrativa
    filename = f"{uuid.uuid4()}_{archivo.filename}"
    filepath = os.path.join("app", "static", "uploads", "syllabi", filename)
    with open(filepath, "wb") as f:
        f.write(contenido)
    
    relative_path = f"/static/uploads/syllabi/{filename}"
    texto = PDFParserService.extraer_texto(contenido)
    
    # 3. Obtener referencias para el score
    curso = db.query(Curso).filter(Curso.id_curso == id_curso).first()
    periodo = db.query(PeriodoAcademico).filter(PeriodoAcademico.id_periodo == id_periodo).first()
    
    if not curso or not periodo:
        raise HTTPException(status_code=404, detail="Curso o Periodo no encontrado")

    # 4. Parsing Gemini + Confidence Score
    parsing_data = gemini_parser.extraer_estructura_completa(
        texto, f"{curso.codigo_curso} - {curso.nombre_curso}", periodo.nombre
    )
    
    score = parsing_data["puntaje_confianza"]
    coincidencias = parsing_data["coincidencias"]
    
    # 5. Determinar estado y ámbito según score (Reglas ITIL 4)
    # REGLA ESTRICTA DE NEGOCIO: No aprobar automáticamente si el periodo no es el ACTUAL
    estado = EstadoVerificacion.PENDIENTE_CONFIRMACION
    ambito = AmbitoUso.PRIVADO
    
    # Aprobación automática si el puntaje de confianza es mayor o igual al 70%
    if score >= 70:
        estado = EstadoVerificacion.APROBADO
        ambito = AmbitoUso.COMPARTIBLE if score >= 80 else AmbitoUso.PRIVADO
    else:
        if score < 40:
            estado = EstadoVerificacion.RECHAZADO
        else:
            estado = EstadoVerificacion.PENDIENTE_CONFIRMACION
        ambito = AmbitoUso.PRIVADO

    # 5.4 Validar fórmulas y evidencias con ITILServiceDesk
    errores_formulas = ITILServiceDesk.validar_formulas_evidencias(parsing_data)
    if errores_formulas:
        # Se penaliza el score pero mantenemos el estado APROBADO si sigue siendo >= 70
        score = max(10, score - 30)
        if score < 70:
            estado = EstadoVerificacion.PENDIENTE_CONFIRMACION

    # 6. Guardar Sílabo (Guardamos parsing_data completo en reglas_json para mejor RAG)
    nuevo_silabo = Silabo(
        id_curso=id_curso,
        id_periodo=id_periodo,
        id_usuario_subida=current_user.id,
        nombre_archivo=archivo.filename,
        ruta_pdf=relative_path,
        texto_extraido=texto,
        tipo_silabo=TipoSilabo.SUBIDO_USUARIO,
        ambito_uso=ambito,
        estado_validacion=estado,
        puntaje_confianza=score,
        coincidencia_periodo=coincidencias["periodo"],
        reglas_json=parsing_data
    )
    
    db.add(nuevo_silabo)
    db.commit()
    db.refresh(nuevo_silabo)

    # Generar chunks para RAG
    generar_y_guardar_chunks(db, nuevo_silabo, curso)

    # Actualizar el contexto del estudiante que acaba de subir el sílabo
    contexto_usuario = db.query(ContextoCursoUsuario).filter(
        ContextoCursoUsuario.id_usuario == current_user.id,
        ContextoCursoUsuario.id_curso == id_curso,
        ContextoCursoUsuario.id_periodo == id_periodo
    ).first()

    if contexto_usuario:
        contexto_usuario.id_silabo_asignado = nuevo_silabo.id_silabo
        contexto_usuario.estado_verificacion = estado
        contexto_usuario.puntaje_confianza = score
        db.commit()
    
    # 7. Registrar incidente de servicio si falló el parsing o hay errores de fórmula
    if errores_formulas:
        desc_errores = "; ".join(errores_formulas)
        ITILServiceDesk.registrar_incidente_servicio(
            db, nuevo_silabo.id_silabo, 
            TipoIncidenteServicio.FORMULA_AMBIGUA,
            f"Errores en fórmulas de evaluación: {desc_errores}",
            id_usuario=current_user.id
        )
    elif score < 50:
        ITILServiceDesk.registrar_incidente_servicio(
            db, nuevo_silabo.id_silabo, 
            TipoIncidenteServicio.FALLO_PARSING if score > 20 else TipoIncidenteServicio.PDF_ILEGIBLE,
            f"Bajo score de confianza: {score}%",
            id_usuario=current_user.id
        )
        
    # 8. Procesar agrupamiento
    ITILServiceDesk.procesar_agrupamiento_conocimiento(db, id_curso, id_periodo)
    
    return {
        "success": True,
        "id_silabo": nuevo_silabo.id_silabo,
        "id_curso": id_curso,
        "id_periodo": id_periodo,
        "nombre_archivo": archivo.filename,
        "score": score,
        "estado": estado,
        "ambito": ambito,
        "mensaje": f"Sílabo procesado con {score}% de confianza.",
        "nombre_curso": curso.nombre_curso,
        "codigo_curso": curso.codigo_curso,
        "datos_extraidos": {
            "unidades": parsing_data.get("unidades", []),
            "formulas": parsing_data.get("formulas", {}),
            "evidencias": parsing_data.get("evidencias", {}),
            "capacidades": parsing_data.get("capacidades", []),
            "resultados_aprendizaje": parsing_data.get("resultados_aprendizaje", []),
            "metodologia": parsing_data.get("metodologia", []),
            "niveles_logro": parsing_data.get("niveles_logro", []),
            "tutoria": parsing_data.get("tutoria", {}),
        }
    }

@router.get("/revisar", response_model=List[dict])
async def listar_pendientes_revision(
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Acceso denegado")
        
    silabos = db.query(Silabo).filter(
        Silabo.estado_validacion == EstadoVerificacion.PENDIENTE_CONFIRMACION
    ).order_by(Silabo.fecha_subida.desc()).all()
    
    result = []
    for s in silabos:
        # Generar advertencias basadas en metadatos para ayudar al Admin
        advertencias = []
        if s.coincidencia_periodo == CoincidenciaPeriodo.ANTERIOR:
            advertencias.append("Este sílabo pertenece a un periodo académico anterior.")
        elif s.coincidencia_periodo == CoincidenciaPeriodo.NO_COINCIDE:
            advertencias.append("⚠️ El periodo detectado en el PDF no coincide con el curso actual.")
            
        if s.puntaje_confianza < 50:
            advertencias.append("La IA tuvo dificultades para extraer las fórmulas de calificación.")

        result.append({
            "id_silabo": s.id_silabo,
            "id_curso": s.id_curso,
            "id_periodo": s.id_periodo,
            "codigo_curso": s.curso.codigo_curso if s.curso else "N/A",
            "nombre_curso": s.curso.nombre_curso if s.curso else "Curso Desconocido",
            "codigo_periodo": s.periodo.nombre if s.periodo else "N/A",
            "puntaje_confianza": s.puntaje_confianza,
            "usuario_nombre": f"{s.usuario_subida.nombres} {s.usuario_subida.apellidos}" if s.usuario_subida else "Sistema",
            "codigo_universitario": s.usuario_subida.codigo_universitario if s.usuario_subida else "N/A",
            "fecha_subida": s.fecha_subida.isoformat() if s.fecha_subida else None,
            "fiabilidad": s.aviso_fiabilidad or "Requiere validación humana para asegurar precisión.",
            "ruta_pdf": s.ruta_pdf,
            "advertencias": advertencias
        })
    
    return result

@router.post("/aprobar/{id_silabo}")
async def aprobar_silabo(
    id_silabo: int,
    request: RevisionRequest,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    print(f"DEBUG: Intentando aprobar silabo {id_silabo}")
    print(f"DEBUG: Request: {request.dict()}")
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Acceso denegado")
        
    silabo = db.query(Silabo).filter(Silabo.id_silabo == id_silabo).first()
    if not silabo:
        raise HTTPException(status_code=404, detail="Sílabo no encontrado")

    # LÓGICA DE CORRECCIÓN DE PERIODO (Si el admin detectó que el alumno se equivocó al matricularse)
    periodo_original = silabo.id_periodo
    if request.id_periodo_nuevo and request.id_periodo_nuevo != periodo_original:
        silabo.id_periodo = request.id_periodo_nuevo
        
        # Migrar la matrícula del alumno al periodo correcto si es necesario
        contexto_estudiante = db.query(ContextoCursoUsuario).filter(
            ContextoCursoUsuario.id_usuario == silabo.id_usuario_subida,
            ContextoCursoUsuario.id_curso == silabo.id_curso,
            ContextoCursoUsuario.id_periodo == periodo_original
        ).first()
        
        if contexto_estudiante:
            # Verificar si ya existe matrícula en el nuevo periodo
            existe_en_nuevo = db.query(ContextoCursoUsuario).filter(
                ContextoCursoUsuario.id_usuario == silabo.id_usuario_subida,
                ContextoCursoUsuario.id_curso == silabo.id_curso,
                ContextoCursoUsuario.id_periodo == request.id_periodo_nuevo
            ).first()
            
            if not existe_en_nuevo:
                contexto_estudiante.id_periodo = request.id_periodo_nuevo
            else:
                # Si ya existe, simplemente vinculamos el sílabo a esa y borramos la "errónea"
                db.delete(contexto_estudiante)
                contexto_estudiante = existe_en_nuevo

    silabo.estado_validacion = EstadoVerificacion.APROBADO
    silabo.ambito_uso = AmbitoUso.PUBLICADO
    silabo.observaciones_validacion = request.comentario

    # Sincronizar el estado del sílabo con los contextos del estudiante
    contextos_actualizados = db.query(ContextoCursoUsuario).filter(
        ContextoCursoUsuario.id_curso == silabo.id_curso,
        ContextoCursoUsuario.id_periodo == silabo.id_periodo
    ).all()

    for contexto in contextos_actualizados:
        contexto.id_silabo_asignado = silabo.id_silabo
        contexto.origen_contexto = OrigenContexto.OFICIAL
        contexto.estado_verificacion = EstadoVerificacion.OFICIAL
        contexto.puntaje_confianza = silabo.puntaje_confianza or contexto.puntaje_confianza

    db.commit()

    # Generar chunks para RAG (si no existían)
    if silabo.texto_extraido and silabo.curso:
        generar_y_guardar_chunks(db, silabo, silabo.curso)

    return {
        "message": f"Sílabo aprobado y publicado. Se actualizaron {len(contextos_actualizados)} contextos.",
        "periodo_corregido": request.id_periodo_nuevo is not None,
        "id_silabo": silabo.id_silabo,
        "estado_validacion": silabo.estado_validacion,
        "ambito_uso": silabo.ambito_uso,
    }

@router.post("/rechazar/{id_silabo}")
async def rechazar_silabo(
    id_silabo: int,
    request: RevisionRequest,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Acceso denegado")
        
    silabo = db.query(Silabo).filter(Silabo.id_silabo == id_silabo).first()
    if not silabo:
        raise HTTPException(status_code=404, detail="Sílabo no encontrado")

    silabo.estado_validacion = EstadoVerificacion.RECHAZADO
    silabo.observaciones_validacion = request.comentario
    db.commit()
    return {
        "message": "Sílabo rechazado",
        "id_silabo": silabo.id_silabo,
        "id_curso": silabo.id_curso,
        "id_periodo": silabo.id_periodo,
        "estado_validacion": silabo.estado_validacion,
    }

# ==================== ADMIN: GESTIÓN OFICIAL DE SÍLABOS ====================

@router.get("/test-cors")
async def test_cors():
    """Endpoint de prueba para verificar CORS"""
    from fastapi.responses import JSONResponse
    return JSONResponse(
        content={"message": "CORS test successful"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "*"
        }
    )

@router.post("/upload-oficial")
async def subir_silabo_oficial(
    id_curso: int = Form(...),
    id_periodo: int = Form(...),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_from_token)
):
    """Subida de sílabo oficial por el Administrador"""
    
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden subir sílabos oficiales")
        
    # 1. Validar que no exista sílabo oficial publicado para este curso/periodo
    oficial = db.query(Silabo).filter(
        Silabo.id_curso == id_curso,
        Silabo.id_periodo == id_periodo,
        Silabo.tipo_silabo == TipoSilabo.OFICIAL,
    ).first()
    
    if oficial:
        raise HTTPException(status_code=400, detail="Ya existe un sílabo oficial para este curso y periodo. Elimínelo primero si desea reemplazarlo.")

    # 2. Validar el archivo PDF
    _validar_archivo_pdf(archivo)

    # 3. Procesar PDF
    contenido = await archivo.read()
    
    # Guardar archivo físico
    filename = f"oficial_{uuid.uuid4()}_{archivo.filename}"
    filepath = os.path.join("app", "static", "uploads", "syllabi", filename)
    with open(filepath, "wb") as f:
        f.write(contenido)
    
    relative_path = f"/static/uploads/syllabi/{filename}"
    texto = PDFParserService.extraer_texto(contenido)
    
    curso = db.query(Curso).filter(Curso.id_curso == id_curso).first()
    periodo = db.query(PeriodoAcademico).filter(PeriodoAcademico.id_periodo == id_periodo).first()
    
    if not curso or not periodo:
        raise HTTPException(status_code=404, detail="Curso o Periodo no encontrado")

    # 4. Parsing Gemini + Confidence Score
    parsing_data = gemini_parser.extraer_estructura_completa(
        texto, f"{curso.codigo_curso} - {curso.nombre_curso}", periodo.nombre
    )
    
    score = parsing_data.get("puntaje_confianza", 100)
    
    # 5. Guardar Sílabo Oficial
    nuevo_silabo = Silabo(
        id_curso=id_curso,
        id_periodo=id_periodo,
        id_usuario_subida=current_user.id,
        nombre_archivo=archivo.filename,
        ruta_pdf=relative_path,
        texto_extraido=texto,
        tipo_silabo=TipoSilabo.OFICIAL,
        ambito_uso=AmbitoUso.PUBLICADO,
        estado_validacion=EstadoVerificacion.APROBADO,
        puntaje_confianza=score,
        coincidencia_periodo=parsing_data.get("coincidencias", {}).get("periodo", CoincidenciaPeriodo.ACTUAL),
        reglas_json=parsing_data
    )
    
    db.add(nuevo_silabo)
    db.commit()
    db.refresh(nuevo_silabo)

    # 6. Generar chunks estándar y específicos
    generar_y_guardar_chunks(db, nuevo_silabo, curso)

    # 7. Sincronizar todos los contextos de estudiantes matriculados en este curso y periodo
    contextos = db.query(ContextoCursoUsuario).filter(
        ContextoCursoUsuario.id_curso == id_curso,
        ContextoCursoUsuario.id_periodo == id_periodo
    ).all()

    for contexto in contextos:
        contexto.id_silabo_asignado = nuevo_silabo.id_silabo
        contexto.origen_contexto = OrigenContexto.OFICIAL
        contexto.estado_verificacion = EstadoVerificacion.OFICIAL
        contexto.puntaje_confianza = score
    db.commit()
    
    # 8. Procesar agrupamiento ITIL
    ITILServiceDesk.procesar_agrupamiento_conocimiento(db, id_curso, id_periodo)
    
    return {
        "success": True,
        "id_silabo": nuevo_silabo.id_silabo,
        "message": "Sílabo oficial subido y publicado correctamente.",
        "score": score,
        "contextos_sincronizados": len(contextos)
    }

@router.delete("/oficial/{id_silabo}")
async def eliminar_silabo_oficial(
    id_silabo: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_from_token)
):
    """Endpoint para que ADMIN elimine un sílabo oficial existente"""

    # 1. Validar que sea ADMIN
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden eliminar sílabos oficiales")

    # 2. Buscar el sílabo
    silabo = db.query(Silabo).filter(Silabo.id_silabo == id_silabo).first()
    if not silabo:
        raise HTTPException(status_code=404, detail="Sílabo no encontrado")

    if silabo.tipo_silabo != TipoSilabo.OFICIAL:
        raise HTTPException(status_code=400, detail="Solo se pueden eliminar sílabos oficiales")

    # 3. Desvincular contextos de estudiantes que usan este sílabo
    contextos = db.query(ContextoCursoUsuario).filter(
        ContextoCursoUsuario.id_silabo_asignado == id_silabo
    ).all()
    for ctx in contextos:
        ctx.id_silabo_asignado = None
        ctx.origen_contexto = OrigenContexto.DECLARADO_USUARIO
        ctx.estado_verificacion = EstadoVerificacion.PENDIENTE_CONFIRMACION

    # 4. Eliminar chunks relacionados
    db.query(SilaboChunk).filter(SilaboChunk.id_silabo == id_silabo).delete(synchronize_session=False)

    # 5. Eliminar registros que dependen del sílabo con FK NOT NULL y sin CASCADE
    db.query(IncidenteServicio).filter(IncidenteServicio.id_silabo == id_silabo).delete(synchronize_session=False)
    db.query(LogIngestion).filter(LogIngestion.id_silabo == id_silabo).delete(synchronize_session=False)

    # 6. Guardar ruta del PDF antes de eliminar
    ruta_pdf = silabo.ruta_pdf

    # 6. Eliminar el sílabo de la base de datos
    db.delete(silabo)
    db.commit()

    # 7. Eliminar archivo físico si existe
    if ruta_pdf:
        filepath = os.path.join("app", ruta_pdf.lstrip("/").replace("/", os.sep))
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
        except OSError:
            pass  # No crítico si el archivo no se puede eliminar

    return {
        "success": True,
        "id_silabo": id_silabo,
        "mensaje": "Sílabo oficial eliminado exitosamente",
        "contextos_desvinculados": len(contextos)
    }

@router.delete("/{id_silabo}")
async def eliminar_silabo(
    id_silabo: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_from_token)
):
    """Endpoint para que el ADMIN elimine cualquier sílabo (Oficial o subido por Usuario)"""

    # 1. Validar permisos
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Acceso denegado: solo administradores pueden eliminar sílabos."
        )

    # 2. Buscar el sílabo
    silabo = db.query(Silabo).filter(Silabo.id_silabo == id_silabo).first()
    if not silabo:
        raise HTTPException(status_code=404, detail="Sílabo no encontrado")

    # 3. Desvincular contextos de estudiantes que usan este sílabo
    contextos = db.query(ContextoCursoUsuario).filter(
        ContextoCursoUsuario.id_silabo_asignado == id_silabo
    ).all()
    for ctx in contextos:
        ctx.id_silabo_asignado = None
        ctx.origen_contexto = OrigenContexto.DECLARADO_USUARIO
        ctx.estado_verificacion = EstadoVerificacion.PENDIENTE_CONFIRMACION

    # 4. Eliminar chunks relacionados
    db.query(SilaboChunk).filter(SilaboChunk.id_silabo == id_silabo).delete(synchronize_session=False)

    # 5. Eliminar registros que dependen del sílabo con FK NOT NULL y sin CASCADE
    db.query(IncidenteServicio).filter(IncidenteServicio.id_silabo == id_silabo).delete(synchronize_session=False)
    db.query(IncidenteAcademico).filter(IncidenteAcademico.id_silabo == id_silabo).delete(synchronize_session=False)
    db.query(SolicitudServicio).filter(SolicitudServicio.id_silabo == id_silabo).delete(synchronize_session=False)
    db.query(LogIngestion).filter(LogIngestion.id_silabo == id_silabo).delete(synchronize_session=False)
    db.query(SugerenciaEstudio).filter(SugerenciaEstudio.id_silabo == id_silabo).update(
        {SugerenciaEstudio.id_silabo: None},
        synchronize_session=False
    )

    # 6. Guardar ruta del PDF antes de eliminar
    ruta_pdf = silabo.ruta_pdf

    # 7. Eliminar el sílabo de la base de datos
    db.delete(silabo)
    db.commit()

    # 8. Eliminar archivo físico si existe
    if ruta_pdf:
        filepath = os.path.join("app", ruta_pdf.lstrip("/").replace("/", os.sep))
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
        except OSError:
            pass  # No crítico si el archivo no se puede eliminar

    return {
        "success": True,
        "id_silabo": id_silabo,
        "mensaje": "Sílabo y recursos asociados eliminados exitosamente",
        "contextos_desvinculados": len(contextos)
    }

@router.get("/list-oficial")
async def listar_silabos_oficiales(
    id_curso: Optional[int] = None,
    id_periodo: Optional[int] = None,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Lista todos los sílabos oficiales y subidos por usuarios (admin only) - incluye pendientes, aprobados y rechazados"""
    
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden listar sílabos")
    
    query = db.query(Silabo)
    
    if id_curso:
        query = query.filter(Silabo.id_curso == id_curso)
    if id_periodo:
        query = query.filter(Silabo.id_periodo == id_periodo)
    
    silabos = query.order_by(Silabo.fecha_subida.desc()).all()
    
    return [
        {
            "id_silabo": s.id_silabo,
            "id_curso": s.id_curso,
            "id_periodo": s.id_periodo,
            "nombre_archivo": s.nombre_archivo,
            "nombre_curso": s.curso.nombre_curso if s.curso else "Curso Desconocido",
            "codigo_curso": s.curso.codigo_curso if s.curso else "N/A",
            "escuela": s.curso.escuela if s.curso else "N/A",
            "periodo": s.periodo.nombre if s.periodo else "N/A",
            "score": s.puntaje_confianza,
            "estado": s.estado_validacion,
            "ambito_uso": s.ambito_uso,
            "tipo_silabo": s.tipo_silabo.value if hasattr(s.tipo_silabo, "value") else s.tipo_silabo,
            "observaciones": s.observaciones_validacion,
            "fecha_subida": s.fecha_subida.isoformat() if s.fecha_subida else None,
            "subido_por": s.usuario_subida.email if s.usuario_subida else "Sistema"
        } for s in silabos
    ]

@router.get("/mis-silabos")
async def listar_mis_silabos(
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Lista todos los sílabos a los que tiene acceso el estudiante actual.
    Esto incluye:
    1. Sílabos oficiales de cursos en los que está matriculado.
    2. Sílabos propios (subidos por él).
    """
    # 1. Obtener cursos en los que está matriculado
    contextos = db.query(ContextoCursoUsuario).filter(
        ContextoCursoUsuario.id_usuario == current_user.id
    ).all()
    id_cursos_matriculados = [ctx.id_curso for ctx in contextos]
    
    # 2. Obtener sílabos oficiales publicados de esos cursos
    silabos_oficiales = db.query(Silabo).filter(
        Silabo.id_curso.in_(id_cursos_matriculados),
        Silabo.tipo_silabo == TipoSilabo.OFICIAL,
        Silabo.ambito_uso == AmbitoUso.PUBLICADO
    ).all()
    
    # 3. Obtener sílabos subidos por el propio estudiante
    silabos_propios = db.query(Silabo).filter(
        Silabo.id_usuario_subida == current_user.id
    ).all()
    
    # Combinar y evitar duplicados por id_silabo
    todos_silabos = {s.id_silabo: s for s in silabos_oficiales + silabos_propios}.values()
    
    return [
        {
            "id_silabo": s.id_silabo,
            "id_curso": s.id_curso,
            "id_periodo": s.id_periodo,
            "nombre_archivo": s.nombre_archivo,
            "nombre_curso": s.curso.nombre_curso if s.curso else "N/A",
            "codigo_curso": s.curso.codigo_curso if s.curso else "N/A",
            "periodo": s.periodo.nombre if s.periodo else "N/A",
            "score": s.puntaje_confianza,
            "estado": s.estado_validacion,
            "ambito_uso": s.ambito_uso,
            "ruta_pdf": s.ruta_pdf,
            "tipo_silabo": s.tipo_silabo.value if hasattr(s.tipo_silabo, "value") else s.tipo_silabo,
            "fecha_subida": s.fecha_subida.isoformat() if s.fecha_subida else None
        } for s in todos_silabos
    ]

# NOTE: All static paths MUST come before /{id_silabo}/... parameterized routes.
# FastAPI matches routes in registration order; static segments take priority.

@router.get("/incidentes-servicio")
async def listar_incidentes_servicio(
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Lista todos los incidentes de servicio activos (Admin only)"""
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Acceso denegado")
        
    incidentes = db.query(IncidenteServicio).filter(
        IncidenteServicio.estado == EstadoIncidente.ACTIVO
    ).order_by(IncidenteServicio.fecha_creacion.desc()).all()
    
    return [
        {
            "id_incidente_servicio": inc.id_incidente_servicio,
            "id_silabo": inc.id_silabo,
            "tipo_incidente": inc.tipo_incidente,
            "descripcion": inc.descripcion,
            "fecha_creacion": inc.fecha_creacion.isoformat() if inc.fecha_creacion else None,
            "nombre_archivo": inc.silabo.nombre_archivo if inc.silabo else "N/A",
            "nombre_curso": inc.silabo.curso.nombre_curso if inc.silabo and inc.silabo.curso else "N/A",
            "periodo": inc.silabo.periodo.nombre if inc.silabo and inc.silabo.periodo else "N/A",
            "usuario": f"{inc.silabo.usuario_subida.nombres} {inc.silabo.usuario_subida.apellidos}" if inc.silabo and inc.silabo.usuario_subida else "Sistema"
        } for inc in incidentes
    ]

@router.post("/incidentes-servicio/{id_incidente}/resolver")
async def resolver_incidente_servicio(
    id_incidente: int,
    accion: str = Form(...),
    archivo: Optional[UploadFile] = File(None),
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Resuelve un incidente de servicio con opciones de reemplazar PDF o mantenerlo"""
    import datetime as _dt
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Acceso denegado")
        
    incidente = db.query(IncidenteServicio).filter(
        IncidenteServicio.id_incidente_servicio == id_incidente
    ).first()
    
    if not incidente:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
        
    silabo = incidente.silabo
    if not silabo:
        raise HTTPException(status_code=404, detail="Sílabo asociado no encontrado")

    if accion == "REEMPLAZAR_PDF":
        if not archivo:
            raise HTTPException(status_code=400, detail="Debe proporcionar un nuevo archivo PDF")
            
        _validar_archivo_pdf(archivo)
            
        contenido = await archivo.read()
        filename = f"{uuid.uuid4()}_{archivo.filename}"
        filepath = os.path.join("app", "static", "uploads", "syllabi", filename)
        with open(filepath, "wb") as f:
            f.write(contenido)
        
        relative_path = f"/static/uploads/syllabi/{filename}"
        texto = PDFParserService.extraer_texto(contenido)
        
        curso = silabo.curso
        periodo = silabo.periodo
        
        parsing_data = gemini_parser.extraer_estructura_completa(
            texto, f"{curso.codigo_curso} - {curso.nombre_curso}", periodo.nombre
        )
        
        score = parsing_data["puntaje_confianza"]
        
        silabo.nombre_archivo = archivo.filename
        silabo.ruta_pdf = relative_path
        silabo.texto_extraido = texto[:15000]
        silabo.reglas_json = parsing_data
        silabo.puntaje_confianza = score
        silabo.estado_validacion = EstadoVerificacion.APROBADO
        silabo.ambito_uso = AmbitoUso.PUBLICADO
        
        generar_y_guardar_chunks(db, silabo, curso)
        
    elif accion == "MANTENER":
        silabo.estado_validacion = EstadoVerificacion.APROBADO
        silabo.ambito_uso = AmbitoUso.PUBLICADO
    else:
        raise HTTPException(status_code=400, detail="Acción no válida")
        
    contextos = db.query(ContextoCursoUsuario).filter(
        ContextoCursoUsuario.id_curso == silabo.id_curso,
        ContextoCursoUsuario.id_periodo == silabo.id_periodo
    ).all()

    for contexto in contextos:
        contexto.id_silabo_asignado = silabo.id_silabo
        contexto.origen_contexto = OrigenContexto.OFICIAL
        contexto.estado_verificacion = EstadoVerificacion.OFICIAL
        contexto.puntaje_confianza = silabo.puntaje_confianza

    incidente.estado = EstadoIncidente.RESUELTO
    incidente.fecha_cierre = _dt.datetime.now()
    db.commit()
    
    return {
        "success": True, 
        "message": "Incidente resuelto y sílabo publicado exitosamente",
        "contextos_sincronizados": len(contextos)
    }


@router.get("/{id_silabo}/detalle")
async def obtener_detalle_silabo(
    id_silabo: int,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Obtiene toda la información detallada de un sílabo"""
    
    silabo = db.query(Silabo).filter(Silabo.id_silabo == id_silabo).first()
    if not silabo:
        raise HTTPException(status_code=404, detail="Sílabo no encontrado")
    
    # Validar acceso: Admin siempre, estudiantes solo si es el creador o si es oficial publicado
    if current_user.rol != RolUsuario.ADMIN:
        es_creador = silabo.id_usuario_subida == current_user.id
        es_oficial_publicado = (silabo.tipo_silabo == TipoSilabo.OFICIAL and silabo.ambito_uso == AmbitoUso.PUBLICADO)
        if not es_creador and not es_oficial_publicado:
            raise HTTPException(status_code=403, detail="Acceso denegado a este sílabo")
    
    return {
        "id_silabo": silabo.id_silabo,
        "id_curso": silabo.id_curso,
        "id_periodo": silabo.id_periodo,
        "nombre_archivo": silabo.nombre_archivo,
        "nombre_curso": silabo.curso.nombre_curso,
        "codigo_curso": silabo.curso.codigo_curso,
        "periodo": silabo.periodo.nombre,
        "tipo_silabo": silabo.tipo_silabo,
        "ambito_uso": silabo.ambito_uso,
        "estado_validacion": silabo.estado_validacion,
        "score": silabo.puntaje_confianza,
        "ruta_pdf": silabo.ruta_pdf,
        "texto_extraido": silabo.texto_extraido,
        "reglas_json": silabo.reglas_json,
        "coincidencia_periodo": silabo.coincidencia_periodo,
        "observaciones_validacion": silabo.observaciones_validacion,
        "fecha_subida": silabo.fecha_subida.isoformat() if silabo.fecha_subida else None,
        "subido_por": {
            "id": silabo.usuario_subida.id if silabo.usuario_subida else None,
            "email": silabo.usuario_subida.email if silabo.usuario_subida else None,
            "nombre": f"{silabo.usuario_subida.nombres} {silabo.usuario_subida.apellidos}" if silabo.usuario_subida else None
        },
        "estudiantes_asignados": len([
            ec for ec in db.query(ContextoCursoUsuario).filter(
                ContextoCursoUsuario.id_silabo_asignado == id_silabo
            ).all()
        ]) if silabo.tipo_silabo == TipoSilabo.OFICIAL else 0,
        "incidentes": [
            {
                "id_incidente_servicio": inc.id_incidente_servicio,
                "tipo_incidente": inc.tipo_incidente,
                "estado": inc.estado,
                "descripcion": inc.descripcion
            } for inc in db.query(IncidenteServicio).filter(IncidenteServicio.id_silabo == id_silabo).all()
        ]
    }

# ==================== ADMIN: EDIT ENDPOINTS ====================

@router.get("/{id_silabo}/chunks")
async def listar_chunks_silabo(
    id_silabo: int,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Lista todos los chunks RAG de un sílabo (Admin only)"""
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden ver los chunks")

    silabo = db.query(Silabo).filter(Silabo.id_silabo == id_silabo).first()
    if not silabo:
        raise HTTPException(status_code=404, detail="Sílabo no encontrado")

    chunks = db.query(SilaboChunk).filter(SilaboChunk.id_silabo == id_silabo).all()
    return [
        {
            "id_chunk": c.id_seccion,
            "tipo_seccion": c.tipo_seccion,
            "titulo": c.titulo,
            "contenido": c.contenido,
            "metadata_json": c.metadata_json,
        }
        for c in chunks
    ]


class ChunkUpdateRequest(BaseModel):
    titulo: Optional[str] = None
    contenido: str


@router.put("/{id_silabo}/chunks/{id_chunk}")
async def actualizar_chunk(
    id_silabo: int,
    id_chunk: int,
    body: ChunkUpdateRequest,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Actualiza el título y contenido de un chunk RAG (Admin only). Regenera el embedding."""
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden editar chunks")

    chunk = db.query(SilaboChunk).filter(
        SilaboChunk.id_seccion == id_chunk,
        SilaboChunk.id_silabo == id_silabo
    ).first()
    if not chunk:
        raise HTTPException(status_code=404, detail="Chunk no encontrado")

    if body.titulo is not None:
        chunk.titulo = body.titulo
    chunk.contenido = body.contenido
    chunk.embedding = embedding_service.generar_embedding(body.contenido)
    db.commit()

    return {
        "success": True,
        "id_chunk": chunk.id_seccion,
        "titulo": chunk.titulo,
        "contenido": chunk.contenido,
    }


class ReglasJsonUpdateRequest(BaseModel):
    reglas_json: Any


@router.put("/{id_silabo}/reglas-json")
async def actualizar_reglas_json(
    id_silabo: int,
    body: ReglasJsonUpdateRequest,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Actualiza el JSON de reglas/estructura de un sílabo (Admin only)."""
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden editar reglas")

    silabo = db.query(Silabo).filter(Silabo.id_silabo == id_silabo).first()
    if not silabo:
        raise HTTPException(status_code=404, detail="Sílabo no encontrado")

    silabo.reglas_json = body.reglas_json
    db.commit()

    return {"success": True, "message": "reglas_json actualizado correctamente"}


@router.post("/{id_silabo}/regenerar-chunks")
async def regenerar_chunks_silabo(
    id_silabo: int,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Regenera todos los chunks RAG de un sílabo (Admin only)."""
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden regenerar chunks")

    silabo = db.query(Silabo).filter(Silabo.id_silabo == id_silabo).first()
    if not silabo:
        raise HTTPException(status_code=404, detail="Sílabo no encontrado")

    if not silabo.texto_extraido:
        raise HTTPException(status_code=400, detail="El sílabo no tiene texto extraído")

    if not silabo.curso:
        raise HTTPException(status_code=400, detail="El sílabo no tiene curso asociado")

    chunks_creados = generar_y_guardar_chunks(db, silabo, silabo.curso)

    return {
        "success": True,
        "chunks_creados": chunks_creados,
        "message": f"{chunks_creados} chunks regenerados exitosamente"
    }

