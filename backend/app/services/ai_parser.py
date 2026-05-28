"""
Servicio de parsing de sílabos usando Gemini API
Una sola llamada para extraer toda la estructura del sílabo
Optimizado para minimizar consumo de tokens
"""

import json
import re
from typing import Dict, Optional, List

from app.config import Config
from app.services.syllabus_extractor import UntSyllabusExtractor

# Configurar Gemini en modo lazy (no falla el arranque del servidor si no está disponible)
GEMINI_DISPONIBLE: bool = False
MODEL = None
_GEMINI_INIT_ATTEMPTED: bool = False


def _unique_model_names(names: List[Optional[str]]) -> List[str]:
    unique: List[str] = []
    for name in names:
        if not name:
            continue
        if name not in unique:
            unique.append(name)
    return unique


def _init_gemini() -> None:
    global GEMINI_DISPONIBLE, MODEL, _GEMINI_INIT_ATTEMPTED

    if _GEMINI_INIT_ATTEMPTED:
        return
    _GEMINI_INIT_ATTEMPTED = True

    if not Config.USE_GEMINI:
        return
    if not Config.GEMINI_API_KEY:
        return

    try:
        import google.generativeai as genai  # type: ignore
    except Exception:
        return

    try:
        genai.configure(api_key=Config.GEMINI_API_KEY)

        modelos_a_probar = _unique_model_names(
            [
                Config.GEMINI_MODEL,
                "gemini-flash-lite-latest",
                "gemini-2.5-flash",
                "gemini-2.5-pro",
                "gemini-2.0-flash",
                "gemini-2.0-pro",
                "gemini-1.5-flash",
                "gemini-1.5-pro",
                "gemini-1.5-flash-latest",
                "gemini-1.5-pro-latest",
            ]
        )

        for modelo in modelos_a_probar:
            try:
                MODEL = genai.GenerativeModel(modelo)
                GEMINI_DISPONIBLE = True
                print(f"✅ Gemini API configurada (modelo: {modelo})")
                return
            except Exception:
                continue
    except Exception:
        GEMINI_DISPONIBLE = False
        MODEL = None


class GeminiParserService:
    """
    Servicio de parsing con UNA SOLA llamada a Gemini
    Extrae toda la estructura del sílabo en un solo prompt
    """
    
    # Prompt específico para formato UNT
    PROMPT_BASE = """
    Analiza este sílabo universitario de la UNT (Universidad Nacional de Trujillo) y extrae SOLO la información solicitada.
    Responde EXCLUSIVAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, sin explicaciones.

    REGLAS DE EXTRACCIÓN POR SECCIÓN (SIGUE ESTRICTAMENTE ESTAS UBICACIONES):

    1. DATOS DE IDENTIFICACIÓN (Sección I del documento):
       - "codigo_curso": Busca EXACTAMENTE la línea "Código de la experiencia curricular" o "Código del curso". Extrae SOLO el número (ej: "3448"). No uses "0000".
       - "nombre_curso": El nombre REAL del curso aparece en el TÍTULO del documento, después de "SILABO DE LA EXPERIENCIA CURRICULAR" entre comillas, o en la cabecera. Ejemplo: si dice 'SILABO DE LA EXPERIENCIA CURRICULAR "REDES Y COMUNICACIONES I"', el nombre es "REDES Y COMUNICACIONES I". NUNCA uses el texto genérico "LA EXPERIENCIA CURRICULAR".
       - "ciclo": Busca "Ciclo" en la sección I (ej: "VII").
       - "periodo": Busca "Año - Semestre académico" o "Periodo". Extrae el valor completo (ej: "2026-I", "2025-II").
       - "docente": Busca la tabla "Docente / Equipo Docente(s)". Extrae el nombre del COORDINADOR(A) (primera fila). Ej: "Arellano Salazar César".
       - "email_docente": Extrae el correo de la misma fila del coordinador.

    2. SISTEMA DE EVALUACIÓN (Sección V del documento):
       - "evidencias": Lee las fórmulas de PU1, PU2, PU3 y PP. Las VARIABLES que aparecen en esas fórmulas son las evidencias. Extrae CADA variable como clave en MAYÚSCULA.
         Ejemplo: si la fórmula dice "PU1 = 0.2 PT + 0.4 EO + 0.4 EL", las evidencias son: PT, EO, EL.
         Para cada evidencia, asigna el peso que aparece en la fórmula (ej: PT → 0.2, EO → 0.4, EL → 0.4).
         Si en otro curso las fórmulas usan "PC1, PC2, EF", esas son las evidencias. Usa EXACTAMENTE las siglas del documento.
       - "formulas": Copia las fórmulas EXACTAMENTE como aparecen en el documento, usando las siglas originales.
         Ejemplo exacto de un sílabo real:
         "PU1": "0.2*PT + 0.4*EO + 0.4*EL",
         "PU2": "0.2*PT + 0.3*EO + 0.5*ST",
         "PU3": "0.3*ST + 0.2*EO + 0.5*EXPO",
         "PP": "0.3*PU1 + 0.3*PU2 + 0.4*PU3"
       - "nota_aprobatoria": Busca "La nota aprobatoria es" o similar. Normalmente 14.

    3. REGLAS GENERALES:
       - "asistencia_minima": Si el documento dice "más del X% de inasistencia... inhabilitación", calcula asistencia_minima = 100 - X. Ej: "más del 30% de inasistencia" → asistencia_minima = 70.
       - "inhabilitacion_umbral": El porcentaje de inasistencia mencionado (ej: 30).
       - "redondeo": Busca frases como "medio punto (0.5) favorece al estudiante".

    4. TUTORÍA ACADÉMICA (Sección VI):
       - "tutoria.dia": Busca "Día:" (ej: "Miércoles", "S", "Jueves").
       - "tutoria.horario": Busca "Horario:" (ej: "12.00m - 1.00pm", "13:00").
       - "tutoria.email": Correo del docente.
       - "tutoria.canales": Lista de canales (Email, WhatsApp, Google Meet, etc.).

    5. PROGRAMACIÓN ACADÉMICA (Sección IV - TABLA):
       Si la sección IV es una TABLA con columnas (Capacidades, Resultados de Aprendizaje, Contenidos, Estrategias, Evidencias, Instrumentos, Semana):

       a) "sesiones": Lista de sesiones por semana. Para CADA semana (01, 02, 03...), extrae el tema/contenido correspondiente de la columna "Contenidos por Unidades". NO pongas estrategias didácticas como contenido (ej: "Motivación", "Exposición docente" NO son contenidos).
          Ejemplo de sesión correcta:
          {{"semana": "1", "semana_num": 1, "contenido": "Panorama general de la gestión de la cadena de suministro", "unidad": 1}}
          {{"semana": "2", "semana_num": 2, "contenido": "Función de la logística en las cadenas de suministro", "unidad": 1}}

       b) "capacidades": Lista de textos. Extrae las capacidades de la primera columna (ej: "Analiza las características propias de la cadena de suministro...").

       c) "resultados_aprendizaje": Lista de textos. Extrae los resultados de aprendizaje de la segunda columna (ej: "Analiza los componentes de la cadena de suministro...").

       d) "metodologia": Lista de textos. Extrae las estrategias didácticas numeradas (1. Motivación..., 2. Exposición docente...).

       e) "niveles_logro": Lista de objetos con semana y texto. Extrae los indicadores/niveles de logro por semana si existen.
          Ejemplo: {{"semana": 1, "texto": "Identifica los componentes de la cadena de suministro", "unidad": 1}}

       Si NO es tabla, extrae sesiones semanales de la forma que encuentres: busca "Semana X" o números de semana con sus temas.

    6. UNIDADES (Sección IV):
       - Extrae hasta 3 unidades con id (U1, U2, U3), nombre y rango de semanas.
       - Si no hay nombre explícito de unidad, usa el PRIMER contenido de esa unidad como nombre.

    JSON requerido (rellena con datos EXACTOS del documento, no inventes):
    {{
        "codigo_curso": "",
        "nombre_curso": "",
        "ciclo": "",
        "periodo": "",
        "docente": "",
        "email_docente": "",
        "nota_aprobatoria": 14,
        "evidencias": {{}},
        "unidades": [],
        "formulas": {{}},
        "tutoria": {{"dia": "", "horario": "", "email": "", "canales": []}},
        "reglas": {{"asistencia_minima": 70, "redondeo": "", "inhabilitacion_umbral": 30}},
        "sesiones": [],
        "capacidades": [],
        "resultados_aprendizaje": [],
        "metodologia": [],
        "niveles_logro": []
    }}

    NOTAS IMPORTANTES:
    - Si una sección NO existe en el documento, usa "" o valores por defecto, pero NUNCA inventes datos.
    - El nombre del curso NUNCA debe ser "LA EXPERIENCIA CURRICULAR"; busca el nombre entre comillas en el título.
    - Las evidencias DEBEN ser las siglas EXACTAS que aparecen en las fórmulas del Sistema de Evaluación.
    - Las sesiones DEBEN ser TEMAS DE CONTENIDO, no estrategias didácticas ni instrumentos de evaluación.
    - Si los contenidos vienen como lista numerada (1., 2., etc.) y las semanas como 01, 02, etc., asigna el contenido N a la semana N dentro de cada unidad.
    """
    
    @classmethod
    def extraer_estructura_completa(cls, texto: str, curso_esperado: str = "", periodo_esperado: str = "") -> Dict:
        """
        Extracción híbrida: patrones determinísticos primero, Gemini SIEMPRE como complemento.
        
        Paso 1: UntPatternExtractor extrae datos estructurados con regex
        Paso 2: Gemini LLM SIEMPRE se llama para complementar/validar fórmulas, evidencias y narrativos
        Paso 3: Merge inteligente: patrón gana en datos verificables, LLM en datos narrativos
        """
        # ─── Paso 1: Extracción por patrones ───
        resultado_pattern = UntSyllabusExtractor.extraer(texto, curso_esperado, periodo_esperado)
        score_pattern = resultado_pattern.get("puntaje_confianza", 0)
        print(f"📊 Patrones: score {score_pattern}%")

        # ─── Paso 2: Gemini SIEMPRE como complemento ───
        _init_gemini()
        resultado_llm = None

        if GEMINI_DISPONIBLE and MODEL:
            try:
                texto_limitado = texto[:35000] if len(texto) > 35000 else texto
                import google.generativeai as genai

                # Construir prompt con hints del extractor de patrones
                hints = cls._construir_hints(resultado_pattern, curso_esperado, periodo_esperado)
                contexto = f"""
    CONTEXTO DEL CURSO ESPERADO (útil para verificación externa):
    - Curso esperado: {curso_esperado or "(no especificado)"}
    - Periodo esperado: {periodo_esperado or "(no especificado)"}
"""
                prompt = cls.PROMPT_BASE + contexto + hints + "\n\n--- INICIO DEL SÍLABO ---\n" + texto_limitado

                response = MODEL.generate_content(
                    prompt,
                    generation_config=genai.GenerationConfig(
                        temperature=0.1,
                        max_output_tokens=8192
                    )
                )
                respuesta_texto = response.text
                # Logging detallado para debug
                preview = repr(respuesta_texto[:200]) if respuesta_texto else "None"
                print(f"🤖 Gemini raw ({len(respuesta_texto or '')} chars): {preview}")

                if respuesta_texto and respuesta_texto.strip():
                    # Si Gemini devolvió solo un fragmento de campo sin valor, ignorar
                    stripped = respuesta_texto.strip()
                    if stripped.count('"') <= 2 and '\n' not in stripped:
                        print(f"⚠️ Gemini devolvió fragmento incompleto, ignorando")
                        resultado_llm = None
                    else:
                        resultado_llm = cls._limpiar_y_parsear_json(respuesta_texto)
                        if resultado_llm:
                            resultado_llm = cls._validar_estructura(resultado_llm)
                            print(f"🤖 Gemini OK: extrajo {len(resultado_llm)} campos")
                else:
                    print(f"⚠️ Gemini respuesta vacía")
            except Exception as e:
                import traceback
                print(f"⚠️ Gemini falló: {e}")
                print(traceback.format_exc())

        # ─── Paso 3: Merge inteligente ───
        if resultado_llm:
            resultado = cls._merge_extracciones(resultado_pattern, resultado_llm)
            print(f"🔀 Merge aplicado")
        else:
            resultado = resultado_pattern
            print(f"⚠️ Sin Gemini, usando solo patrones")

        # Recalcular score final con el merged result
        puntaje, coincidencias = cls.calcular_puntaje_confianza(
            resultado, texto, curso_esperado, periodo_esperado
        )
        resultado["puntaje_confianza"] = puntaje
        resultado["coincidencias"] = coincidencias
        return resultado

    @classmethod
    def _construir_hints(cls, pattern: Dict, curso_esperado: str, periodo_esperado: str) -> str:
        """Construye hints basados en lo que el extractor de patrones ya encontró."""
        hints = []
        if pattern.get("codigo_curso"):
            hints.append(f'- El código del curso parece ser: {pattern["codigo_curso"]}')
        if pattern.get("nombre_curso"):
            hints.append(f'- El nombre del curso parece ser: {pattern["nombre_curso"]}')
        if pattern.get("periodo"):
            hints.append(f'- El periodo parece ser: {pattern["periodo"]}')
        if pattern.get("formulas", {}).get("PP"):
            hints.append(f'- La fórmula de PP es: {pattern["formulas"]["PP"]}')
        if pattern.get("formulas", {}).get("PU1"):
            hints.append(f'- La fórmula de PU1 es: {pattern["formulas"]["PU1"]}')
        if pattern.get("formulas", {}).get("PU2"):
            hints.append(f'- La fórmula de PU2 es: {pattern["formulas"]["PU2"]}')
        if pattern.get("formulas", {}).get("PU3"):
            hints.append(f'- La fórmula de PU3 es: {pattern["formulas"]["PU3"]}')
        if pattern.get("docente"):
            hints.append(f'- El docente parece ser: {pattern["docente"]}')
        if pattern.get("nota_aprobatoria") and pattern["nota_aprobatoria"] != 14:
            hints.append(f'- La nota aprobatoria parece ser: {pattern["nota_aprobatoria"]}')
        if hints:
            return "\n\nHINTS DEL EXTRACTOR AUTOMÁTICO (verifica y complementa):\n" + "\n".join(hints)
        return ""

    @classmethod
    def _limpiar_y_parsear_json(cls, texto_respuesta: str) -> Optional[Dict]:
        """
        Parser ultra-robusto para respuestas de Gemini.
        Maneja markdown, comentarios, JSON incompleto, campos sueltos, etc.
        """
        import json
        texto_original = texto_respuesta.strip()

        # Si está vacío, nada que hacer
        if not texto_original:
            return None

        # Estrategia 1: Quitar markdown y buscar JSON entre { }
        texto = texto_original
        m = re.search(r'```(?:json)?\s*(.*?)\s*```', texto, re.DOTALL)
        if m:
            texto = m.group(1).strip()

        # Quitar comentarios
        texto = re.sub(r'//.*$', '', texto, flags=re.MULTILINE)
        texto = re.sub(r'/\*.*?\*/', '', texto, flags=re.DOTALL)
        texto = re.sub(r',(\s*[}\]])', r'\1', texto)

        # Buscar objeto JSON balanceado
        for match in re.finditer(r'\{', texto):
            start = match.start()
            depth = 0
            for i, c in enumerate(texto[start:], start):
                if c == '{':
                    depth += 1
                elif c == '}':
                    depth -= 1
                    if depth == 0:
                        try:
                            return json.loads(texto[start:i+1])
                        except json.JSONDecodeError:
                            break

        # Estrategia 2: Buscar array JSON y tomar primer elemento
        for match in re.finditer(r'\[', texto):
            start = match.start()
            depth = 0
            for i, c in enumerate(texto[start:], start):
                if c == '[':
                    depth += 1
                elif c == ']':
                    depth -= 1
                    if depth == 0:
                        try:
                            arr = json.loads(texto[start:i+1])
                            if isinstance(arr, list) and len(arr) > 0 and isinstance(arr[0], dict):
                                return arr[0]
                        except json.JSONDecodeError:
                            break

        # Estrategia 3: Intentar parsear todo como JSON
        try:
            parsed = json.loads(texto)
            if isinstance(parsed, dict):
                return parsed
            elif isinstance(parsed, list) and len(parsed) > 0:
                return parsed[0] if isinstance(parsed[0], dict) else None
        except json.JSONDecodeError:
            pass

        # Estrategia 4: Gemini devolvió un fragmento que empieza con un campo suelto
        # como '\n        "codigo_curso": ...'. Extraer bloque completo y reconstruir.
        if '"codigo_curso"' in texto or '"nombre_curso"' in texto:
            # Encontrar el primer campo clave
            first_pos = float('inf')
            for kw in ['"codigo_curso"', '"nombre_curso"', '"periodo"', '"docente"', '"formulas"']:
                pos = texto.find(kw)
                if pos != -1 and pos < first_pos:
                    first_pos = pos

            if first_pos != float('inf'):
                # Buscar el final del bloque JSON (último } o ] significativo)
                candidate = texto[first_pos:]
                # Encontrar el cierre balanceado
                depth = 0
                last_valid = len(candidate)
                i = 0
                while i < len(candidate):
                    c = candidate[i]
                    if c == '"':
                        # saltar string completo
                        j = i + 1
                        while j < len(candidate):
                            if candidate[j] == '\\':
                                j += 2
                            elif candidate[j] == '"':
                                break
                            else:
                                j += 1
                        i = j + 1
                        continue
                    elif c in '{[':
                        depth += 1
                    elif c in '}]':
                        depth -= 1
                        if depth == 0:
                            last_valid = i + 1
                            break
                    i += 1

                block = candidate[:last_valid].strip()
                # Asegurar que empieza con llave
                if not block.startswith('{'):
                    block = '{' + block
                if not block.endswith('}'):
                    block = block + '}'
                # Limpiar comas finales
                block = re.sub(r',\s*}', '}', block)
                block = re.sub(r',\s*]', ']', block)
                # Asegurar comas entre campos sueltos (líneas con "campo": valor sin coma)
                block = re.sub(r'("[^"]+":\s*[^,\s{}\[\]][^,]*?)\n\s*(?="[^"]+":)', r'\1,\n', block)
                try:
                    return json.loads(block)
                except json.JSONDecodeError:
                    pass

                # Si aún falla, extraer campo por campo
                resultado = {}
                campos_re = re.findall(r'"(\w+)"\s*:\s*(?:("(?:[^"\\]|\\.)*")|(\[[^\]]*\])|(\{[^}]*\})|([\w\s.,-]+))', block)
                for campo, str_val, arr_val, obj_val, plain_val in campos_re:
                    val = str_val or arr_val or obj_val or plain_val
                    val = val.strip().strip('"').strip("'")
                    if val:
                        resultado[campo] = val
                if resultado:
                    return resultado

        # Estrategia 5: Extraer campos clave-valor manualmente
        resultado = {}
        campos_clave = [
            ("codigo_curso", r'"codigo_curso"\s*[:\-]?\s*"([^"]*)"'),
            ("nombre_curso", r'"nombre_curso"\s*[:\-]?\s*"([^"]*)"'),
            ("periodo", r'"periodo"\s*[:\-]?\s*"([^"]*)"'),
            ("docente", r'"docente"\s*[:\-]?\s*"([^"]*)"'),
            ("ciclo", r'"ciclo"\s*[:\-]?\s*"([^"]*)"'),
            ("nota_aprobatoria", r'"nota_aprobatoria"\s*[:\-]?\s*([0-9.]+)'),
        ]
        for campo, patron in campos_clave:
            m = re.search(patron, texto_original, re.IGNORECASE)
            if m:
                val = m.group(1).strip()
                if campo == "nota_aprobatoria":
                    try:
                        resultado[campo] = float(val)
                    except ValueError:
                        resultado[campo] = val
                else:
                    resultado[campo] = val

        if resultado:
            print(f"⚠️ Gemini devolvió JSON malformado, pero extraje {len(resultado)} campos manualmente")
            return resultado

        print(f"⚠️ Gemini: no se pudo parsear respuesta")
        return None

    @classmethod
    def _merge_extracciones(cls, pattern: Dict, llm: Dict) -> Dict:
        """
        Merge: patrón gana en campos verificables (código, nombre estructurado).
        LLM gana en TODO lo que el patrón no tenga o tenga genérico.
        """
        merged = dict(pattern)

        # ─── Código: patrón gana si es válido, sino LLM ───
        codigo_pat = merged.get("codigo_curso", "").strip()
        if not codigo_pat or codigo_pat in {"0000", "", "N/A"}:
            llm_codigo = llm.get("codigo_curso", "").strip()
            if llm_codigo and llm_codigo not in {"0000", "", "N/A"}:
                merged["codigo_curso"] = llm_codigo

        # ─── Nombre: patrón gana si es real, sino LLM ───
        nombre_pat = merged.get("nombre_curso", "").upper().strip()
        if not nombre_pat or nombre_pat in {"LA EXPERIENCIA CURRICULAR", "EXPERIENCIA CURRICULAR", "CURSO", "ASIGNATURA", ""}:
            llm_nombre = llm.get("nombre_curso", "").strip()
            if llm_nombre and llm_nombre.upper() not in {"LA EXPERIENCIA CURRICULAR", "EXPERIENCIA CURRICULAR", "CURSO", "ASIGNATURA", ""}:
                merged["nombre_curso"] = llm_nombre

        # ─── Fórmulas: LLM complementa lo que falta ───
        llm_formulas = llm.get("formulas", {})
        if llm_formulas:
            if not merged.get("formulas"):
                merged["formulas"] = {}
            for key in ["PU1", "PU2", "PU3", "PP"]:
                if not merged["formulas"].get(key) and llm_formulas.get(key):
                    merged["formulas"][key] = llm_formulas[key]

        # ─── Evidencias: normalizar y fusionar inteligentemente ───
        llm_evidencias = llm.get("evidencias", {})
        if llm_evidencias:
            if not merged.get("evidencias"):
                merged["evidencias"] = {}

            # Normalizar nombres a siglas estándar
            normalizacion = {
                "prácticas": "PRÁ", "practicas": "PRÁ", "práctica": "PRÁ", "practica": "PRÁ",
                "informes": "INF", "informe": "INF",
                "examen parcial": "EP", "examen_parcial": "EP", "examen mixto": "EP",
                "examen final": "EF", "examen_final": "EF",
                "trabajo": "TRAB", "tarea": "TAR", "participación": "PART",
                "proyecto": "PROY", "monografía": "MONO", "cuestionario": "CUES",
                "foro": "FORO", "exposición": "EXPO", "exposicion": "EXPO"
            }

            # Construir mapa de evidencias del patrón por nombre normalizado
            pattern_names = {}
            for sigla, data in merged.get("evidencias", {}).items():
                if isinstance(data, dict):
                    nombre_lower = data.get("nombre", "").lower()
                    pattern_names[nombre_lower] = sigla
                    # También por sigla
                    pattern_names[sigla.lower()] = sigla

            for sigla, ev_data in llm_evidencias.items():
                # Si Gemini devolvió un valor plano (número), convertir a dict
                if isinstance(ev_data, (int, float)):
                    ev_data = {"nombre": sigla.replace("_", " ").title(), "peso": float(ev_data)}

                llm_nombre = ""
                llm_peso = 0.0
                if isinstance(ev_data, dict):
                    llm_nombre = ev_data.get("nombre", "").lower()
                    llm_peso = ev_data.get("peso", 0.0)

                # Buscar si ya existe por nombre normalizado
                nombre_norm = normalizacion.get(llm_nombre, "")
                existe = False
                for existente_sigla, existente_data in merged["evidencias"].items():
                    existente_nombre = ""
                    if isinstance(existente_data, dict):
                        existente_nombre = existente_data.get("nombre", "").lower()
                    # Match por nombre normalizado o por sigla similar
                    if (nombre_norm and nombre_norm == existente_sigla) or \
                       (llm_nombre and llm_nombre == existente_nombre) or \
                       (sigla.lower() == existente_sigla.lower()):
                        existe = True
                        break

                if not existe:
                    # Usar sigla normalizada si existe
                    nueva_sigla = normalizacion.get(llm_nombre, sigla.upper())
                    merged["evidencias"][nueva_sigla] = ev_data

        # ─── Periodo: patrón gana si es válido, sino LLM ───
        periodo_pat = merged.get("periodo", "").strip()
        if not periodo_pat or not re.match(r"^\d{4}-[IV12]+$", periodo_pat):
            llm_periodo = llm.get("periodo", "").strip()
            if llm_periodo and re.match(r"^\d{4}-[IV12]+$", llm_periodo):
                merged["periodo"] = llm_periodo

        # ─── Nota aprobatoria: LLM si es diferente de default ───
        nota_pat = merged.get("nota_aprobatoria", 14)
        llm_nota = llm.get("nota_aprobatoria")
        if llm_nota is not None and llm_nota != 14 and llm_nota != nota_pat:
            try:
                n = float(llm_nota)
                if 10 <= n <= 20:
                    merged["nota_aprobatoria"] = n
            except (ValueError, TypeError):
                pass

        # ─── Docente: patrón gana si parece real, sino LLM ───
        docente_pat = merged.get("docente", "").strip()
        if not docente_pat or len(docente_pat) < 8 or "UNIVERSIDAD" in docente_pat.upper():
            llm_docente = llm.get("docente", "").strip()
            if llm_docente and len(llm_docente) > 5 and "UNIVERSIDAD" not in llm_docente.upper():
                merged["docente"] = llm_docente

        # ─── Email: LLM si patrón no tiene ───
        if not merged.get("email_docente"):
            llm_email = llm.get("email_docente", "").strip()
            if llm_email:
                merged["email_docente"] = llm_email

        # ─── Tutoría: fusionar campos faltantes ───
        llm_tutoria = llm.get("tutoria", {})
        if llm_tutoria:
            if not merged.get("tutoria"):
                merged["tutoria"] = {}
            for key in ["dia", "horario", "email", "canales"]:
                if not merged["tutoria"].get(key) and llm_tutoria.get(key):
                    merged["tutoria"][key] = llm_tutoria[key]

        # ─── Unidades: LLM mejora nombres genéricos ───
        llm_unidades = llm.get("unidades", [])
        pattern_unidades = merged.get("unidades", [])
        if llm_unidades and not pattern_unidades:
            merged["unidades"] = llm_unidades
        elif llm_unidades and pattern_unidades:
            for i in range(min(len(llm_unidades), len(pattern_unidades))):
                llm_nombre = llm_unidades[i].get("nombre", "")
                pat_nombre = pattern_unidades[i].get("nombre", "")
                # Si el patrón tiene nombre genérico o truncado, usar LLM
                if llm_nombre and (not pat_nombre or "Unidad " in pat_nombre or len(pat_nombre) < len(llm_nombre)):
                    pattern_unidades[i]["nombre"] = llm_nombre
                # Semanas del LLM si el patrón tiene default
                llm_semanas = llm_unidades[i].get("semanas", "")
                pat_semanas = pattern_unidades[i].get("semanas", "")
                if llm_semanas and pat_semanas and "Semana 1-6" in pat_semanas and llm_semanas != pat_semanas:
                    pattern_unidades[i]["semanas"] = llm_semanas

        # ─── Competencias: LLM siempre gana ───
        llm_comp = llm.get("competencias", [])
        if llm_comp:
            merged["competencias"] = llm_comp

        # ─── Sesiones: NO fusionar del LLM (el extractor por patrones es más confiable) ───
        # Solo si el patrón tiene sesiones y el LLM añade semanas que faltan,
        # validamos que el contenido sea real (no estrategia/evidencia pura)
        llm_unidades = llm.get("unidades", [])
        pattern_unidades = merged.get("unidades", [])
        if llm_unidades and pattern_unidades:
            for i in range(min(len(llm_unidades), len(pattern_unidades))):
                llm_sesiones = llm_unidades[i].get("sesiones", [])
                pat_sesiones = pattern_unidades[i].get("sesiones", [])
                if llm_sesiones and pat_sesiones:
                    # Fusionar: LLM añade las que falten, pero solo contenidos válidos
                    semanas_pat = {s.get("semana", "") for s in pat_sesiones}
                    for s in llm_sesiones:
                        sem = s.get("semana", "")
                        if sem and sem not in semanas_pat:
                            contenido = s.get("contenido", "")
                            # Rechazar si es estrategia pura, evidencia o fragmento corto
                            if len(contenido) < 20:
                                continue
                            lower = contenido.lower()
                            estrategias = {"desarrollo de", "uso de", "realización de", "realizacion de",
                                           "aplicación del", "aplicacion del", "exposición", "exposicion",
                                           "motivación", "motivacion", "rúbrica de", "rubrica de",
                                           "examen mixto", "examen parcial", "examen final"}
                            if any(e in lower for e in estrategias):
                                continue
                            # Rechazar si termina en preposición
                            terminaciones = {" de", " del", " la", " el", " los", " las"}
                            if any(lower.endswith(t) for t in terminaciones):
                                continue
                            pat_sesiones.append(s)

        # ─── Sesiones globales (lista flat) del LLM ───
        llm_sesiones = llm.get("sesiones", [])
        if llm_sesiones and not any(u.get("sesiones") for u in merged.get("unidades", [])):
            # Si el patrón no tiene sesiones en ninguna unidad, usar las del LLM
            validas = []
            for s in llm_sesiones:
                contenido = s.get("contenido", "")
                if len(contenido) < 20:
                    continue
                lower = contenido.lower()
                estrategias = {"desarrollo de", "uso de", "realización de", "realizacion de",
                               "aplicación del", "aplicacion del", "exposición", "exposicion",
                               "motivación", "motivacion", "rúbrica de", "rubrica de",
                               "examen mixto", "examen parcial", "examen final"}
                if any(e in lower for e in estrategias):
                    continue
                if any(lower.endswith(t) for t in {" de", " del", " la", " el", " los", " las"}):
                    continue
                validas.append(s)
            # Asignar a unidades por rango de semana
            for s in validas:
                sem = s.get("semana_num", 0)
                unidad = 1 if sem <= 6 else 2 if sem <= 11 else 3
                s["unidad"] = unidad
                if unidad <= len(merged.get("unidades", [])):
                    merged["unidades"][unidad - 1].setdefault("sesiones", []).append(s)

        # ─── Capacidades: fusionar ───
        llm_caps = llm.get("capacidades", [])
        if llm_caps:
            pat_caps = merged.get("capacidades", [])
            if not pat_caps:
                merged["capacidades"] = llm_caps
            else:
                # Añadir capacidades del LLM que no estén ya
                existentes = {c.lower().strip() for c in pat_caps if isinstance(c, str)}
                for c in llm_caps:
                    txt = c if isinstance(c, str) else c.get("texto", "")
                    if txt and txt.lower().strip() not in existentes:
                        pat_caps.append(txt)

        # ─── Resultados de aprendizaje: fusionar ───
        llm_res = llm.get("resultados_aprendizaje", [])
        if llm_res:
            pat_res = merged.get("resultados_aprendizaje", [])
            if not pat_res:
                merged["resultados_aprendizaje"] = llm_res
            else:
                existentes = {r.lower().strip() for r in pat_res if isinstance(r, str)}
                for r in llm_res:
                    txt = r if isinstance(r, str) else r.get("texto", "")
                    if txt and txt.lower().strip() not in existentes:
                        pat_res.append(txt)

        # ─── Metodología: fusionar ───
        llm_met = llm.get("metodologia", [])
        if llm_met:
            pat_met = merged.get("metodologia", [])
            if not pat_met:
                merged["metodologia"] = llm_met
            else:
                existentes = {m.lower().strip() for m in pat_met if isinstance(m, str)}
                for m in llm_met:
                    txt = m if isinstance(m, str) else m.get("texto", "")
                    if txt and txt.lower().strip() not in existentes:
                        pat_met.append(txt)

        # ─── Niveles de logro: fusionar ───
        llm_niveles = llm.get("niveles_logro", [])
        if llm_niveles:
            pat_niveles = merged.get("niveles_logro", [])
            if not pat_niveles:
                merged["niveles_logro"] = llm_niveles
            else:
                # Fusionar por semana, preferir LLM si hay datos
                existentes = {n.get("semana") for n in pat_niveles if isinstance(n, dict)}
                for n in llm_niveles:
                    if isinstance(n, dict) and n.get("semana") not in existentes:
                        pat_niveles.append(n)

        # ─── Reglas: fusionar ───
        llm_reglas = llm.get("reglas", {})
        if llm_reglas:
            if not merged.get("reglas"):
                merged["reglas"] = {}
            for key in ["asistencia_minima", "redondeo", "inhabilitacion_umbral"]:
                if not merged["reglas"].get(key) and llm_reglas.get(key):
                    merged["reglas"][key] = llm_reglas[key]

        return merged

    @classmethod
    def calcular_puntaje_confianza(cls, data: Dict, texto_completo: str, curso_ref: str, periodo_ref: str) -> tuple:
        """
        Calcula score 0-100 basado en reglas ITIL 4
        """
        score = 0
        coincidencias = {
            "curso": False,
            "codigo": False,
            "periodo": "DESCONOCIDO",
            "estructura": False,
            "legibilidad": True
        }

        # 1. Coincidencia de nombre de curso (25 pts)
        nombre_extraido = data.get("nombre_curso", "").upper()
        if curso_ref and curso_ref.upper() in nombre_extraido:
            score += 25
            coincidencias["curso"] = True
        elif curso_ref and any(word in nombre_extraido for word in curso_ref.upper().split() if len(word) > 3):
            score += 15
            coincidencias["curso"] = True

        # 2. Coincidencia de código (20 pts) - validar contra curso esperado
        codigo_extraido = data.get("codigo_curso", "").strip()
        codigo_fallbacks = {"0000", "9999", "N/A", "", "S/C"}
        curso_encontrado = False

        if codigo_extraido and codigo_extraido not in codigo_fallbacks and len(codigo_extraido) > 2:
            if curso_ref:
                # Extraer código del curso_ref si tiene formato "COD - Nombre"
                match = re.search(r'^(\d{3,4})\s*[-–]', curso_ref)
                if match:
                    codigo_esperado = match.group(1)
                    if codigo_esperado == codigo_extraido:
                        score += 20
                        coincidencias["codigo"] = True
                        curso_encontrado = True
                    elif codigo_esperado in codigo_extraido or codigo_extraido in codigo_esperado:
                        # Código parcialmente relacionado
                        score += 10
                        coincidencias["codigo"] = True
                        curso_encontrado = True
                    else:
                        # Código completamente diferente: penalización fuerte
                        score = max(0, score - 30)
                        coincidencias["codigo"] = False
                else:
                    # No se pudo extraer código del curso esperado, verificar que no sea fallback
                    score += 10
                    coincidencias["codigo"] = True
            else:
                score += 10
                coincidencias["codigo"] = True
        else:
            # Código vacío o fallback: no puntos, penalización leve
            coincidencias["codigo"] = False

        # Si el curso es completamente diferente o el código es fallback, penalizar fuertemente
        if not curso_encontrado and curso_ref:
            nombre_extraido = data.get("nombre_curso", "").upper()
            curso_ref_upper = curso_ref.upper()
            # Si no hay ninguna palabra compartida significativa (más de 3 letras)
            palabras_ref = {w for w in re.findall(r'[A-ZÁÉÍÓÚÑ]{4,}', curso_ref_upper)}
            palabras_ext = {w for w in re.findall(r'[A-ZÁÉÍÓÚÑ]{4,}', nombre_extraido)}
            if palabras_ref and palabras_ext and not palabras_ref.intersection(palabras_ext):
                score = max(0, score - 40)
                coincidencias["curso"] = False
            elif codigo_extraido in codigo_fallbacks:
                # Código no extraído correctamente pero nombre tampoco coincide
                score = max(0, score - 20)

        # 3. Coincidencia de periodo (20 pts)
        periodo_extraido = data.get("periodo", "")
        if periodo_ref and periodo_ref in periodo_extraido:
            score += 20
            coincidencias["periodo"] = "ACTUAL"
        elif periodo_extraido and periodo_ref:
            # Lógica para detectar si es un periodo anterior
            try:
                # Extraer año y término (ej: 2025-I, 2025-II, 2025-1, 2025-2)
                match_ref = re.search(r'(\d{4})[- ]?([IV120]+)', periodo_ref)
                match_ext = re.search(r'(\d{4})[- ]?([IV120]+)', periodo_extraido)
                
                if match_ref and match_ext:
                    anio_ref = int(match_ref.group(1))
                    anio_ext = int(match_ext.group(1))
                    
                    if anio_ext < anio_ref:
                        coincidencias["periodo"] = "ANTERIOR"
                        score += 5 # Bono parcial por ser el mismo curso aunque sea otro año
                    else:
                        coincidencias["periodo"] = "NO_COINCIDE"
                else:
                    coincidencias["periodo"] = "NO_COINCIDE"
            except:
                coincidencias["periodo"] = "NO_COINCIDE"
        else:
            coincidencias["periodo"] = "DESCONOCIDO"

        # 4. Estructura mínima - Evaluación (25 pts)
        formulas = data.get("formulas", {})
        if formulas.get("PU1") and formulas.get("PP"):
            score += 25
            coincidencias["estructura"] = True

        # 5. Legibilidad / Extracción (10 pts)
        if len(texto_completo) > 500:
            score += 10
            
        return min(score, 100), coincidencias
    
    @classmethod
    def _extraer_fallback(cls, texto: str) -> Dict:
        """Fallback rápido cuando Gemini no está disponible"""
        from app.services.ai_parser_fallback import FallbackParser
        return FallbackParser.extraer(texto)
    
    @classmethod
    def _validar_estructura(cls, resultado: Dict) -> Dict:
        """Valida y completa la estructura extraída"""
        
        defaults = {
            "codigo_curso": "0000",
            "nombre_curso": "Curso sin nombre",
            "ciclo": "No especificado",
            "periodo": "No especificado",
            "docente": "No especificado",
            "email_docente": "",
            "nota_aprobatoria": 14,
            "evidencias": {},
            "unidades": [],
            "formulas": {},
            "tutoria": {
                "dia": "Jueves",
                "horario": "12:00 - 13:00",
                "email": "",
                "canales": ["Email", "WhatsApp"]
            },
            "reglas": {
                "asistencia_minima": 70,
                "redondeo": "Medio punto (0.5) favorece al estudiante",
                "inhabilitacion_umbral": 30
            },
            "sesiones": [],
            "competencias": [],
            "capacidades": [],
            "resultados_aprendizaje": [],
            "metodologia": [],
            "niveles_logro": [],
        }

        # Completar campos faltantes
        for key, default_value in defaults.items():
            if key not in resultado or not resultado.get(key):
                resultado[key] = default_value

        # Asegurar que tenga al menos 3 unidades
        if len(resultado.get("unidades", [])) < 3:
            unidades_existentes = {u.get("id", "") for u in resultado.get("unidades", [])}
            for i in range(1, 4):
                unidad_id = f"U{i}"
                if unidad_id not in unidades_existentes:
                    resultado["unidades"].append({
                        "id": unidad_id,
                        "nombre": f"Unidad {i}",
                        "semanas": cls._get_semanas_default(i),
                        "competencias": [],
                        "capacidades": [],
                        "resultados_aprendizaje": [],
                        "sesiones": []
                    })
        return resultado
    
    @classmethod
    def _get_semanas_default(cls, unidad_num: int) -> str:
        rangos = {1: "Semana 1-6", 2: "Semana 7-11", 3: "Semana 12-16"}
        return rangos.get(unidad_num, f"Semana {(unidad_num-1)*5+1}-{unidad_num*5}")


# Instancia global
gemini_parser = GeminiParserService()
