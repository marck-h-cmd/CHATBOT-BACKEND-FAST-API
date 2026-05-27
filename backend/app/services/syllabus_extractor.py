"""
Extractor de sílabos UNT por SECCIONES DELIMITADAS.

PRINCIPIO: Nunca buscar en todo el texto. Cada campo se extrae de su sección específica.

Secciones UNT estándar:
  I.   DATOS DE IDENTIFICACIÓN       → código, nombre, ciclo, periodo, docente
  II.  SUMILLA                        → (ignorar para datos estructurados)
  III. COMPETENCIA                    → (ignorar)
  IV.  PROGRAMACIÓN ACADÉMICA         → unidades
  V.   SISTEMA DE EVALUACIÓN         → fórmulas, evidencias, nota
  VI.  TUTORÍA ACADÉMICA              → tutoría
  VII. REFERENCIAS BIBLIOGRÁFICAS    → (ignorar)
"""

import re
from typing import Dict, List, Tuple
from collections import Counter


class UntSyllabusExtractor:
    """Extractor que respeta la estructura por secciones del documento UNT."""

    # ─── Secciones UNT conocidas ───
    SECCIONES = {
        "identificacion": [
            r"I\.\s*DATOS\s+DE\s+IDENTIFICACI[ÓO]N",
            r"I\.\s*IDENTIFICACI[ÓO]N",
            r"DATOS\s+DE\s+IDENTIFICACI[ÓO]N",
        ],
        "programacion": [
            r"IV\.\s*PROGRAMACI[ÓO]N\s+ACAD[ÉE]MICA",
            r"IV\.\s*PROGRAMA\s+ACAD[ÉE]MICO",
            r"PROGRAMACI[ÓO]N\s+ACAD[ÉE]MICA",
        ],
        "evaluacion": [
            r"V\.\s*SISTEMA\s+DE\s+EVALUACI[ÓO]N",
            r"V\.\s*SISTEMA\s+DE\s+CALIFICACI[ÓO]N",
            r"SISTEMA\s+DE\s+EVALUACI[ÓO]N",
            r"SISTEMA\s+DE\s+CALIFICACI[ÓO]N",
            r"EVALUACI[ÓO]N\s+POR\s+COMPETENCIAS",
        ],
        "tutoria": [
            r"VI\.\s*TUTOR[ÍI]A\s+ACAD[ÉE]MICA",
            r"VI\.\s*PLAN\s+DE\s+MEJORA",
            r"TUTOR[ÍI]A\s+ACAD[ÉE]MICA",
            r"PLAN\s+DE\s+MEJORA",
        ],
    }

    @classmethod
    def extraer(cls, texto: str, curso_esperado: str = "", periodo_esperado: str = "") -> Dict:
        """Pipeline: segmentar → extraer por sección → validar → puntuar"""

        # 1. Segmentar el documento por secciones
        secciones = cls._segmentar(texto)

        # 2. Extraer campos de cada sección
        prog_limpio = cls._limpiar_artefactos_pdf(secciones.get("programacion", texto))

        # Detectar y extraer tabla multicolumna de programación (capacidades, resultados, contenidos, etc.)
        tabla_prog = cls._extraer_tabla_programacion_completa(prog_limpio)

        resultado = {
            "codigo_curso": cls._extraer_codigo(secciones.get("identificacion", ""), texto),
            "nombre_curso": cls._extraer_nombre_curso(texto),
            "ciclo": cls._extraer_ciclo(secciones.get("identificacion", "")),
            "periodo": cls._extraer_periodo(secciones.get("identificacion", "")),
            "docente": cls._extraer_docente(secciones.get("identificacion", "")),
            "email_docente": cls._extraer_email(secciones.get("identificacion", "")),
            "nota_aprobatoria": cls._extraer_nota(secciones.get("evaluacion", texto)),
            "formulas": cls._extraer_formulas(secciones.get("evaluacion", "")),
            "evidencias": {},
            "unidades": cls._extraer_unidades(prog_limpio, tabla_prog),
            "tutoria": cls._extraer_tutoria(secciones.get("tutoria", texto)),
            "sesiones": [],
            "reglas": cls._extraer_reglas(texto),
            "competencias": cls._extraer_competencias(
                cls._limpiar_artefactos_pdf(texto)
            ),
            "capacidades": tabla_prog.get("capacidades", []),
            "resultados_aprendizaje": tabla_prog.get("resultados", []),
            "metodologia": tabla_prog.get("metodologia", []),
            "niveles_logro": tabla_prog.get("niveles_logro", []),
        }

        # Derivar evidencias de las fórmulas extraídas
        resultado["evidencias"] = cls._derivar_evidencias(resultado["formulas"])

        # Extraer sesiones/semanas de la programación académica (limpio)
        prog_limpio = cls._limpiar_artefactos_pdf(secciones.get("programacion", texto))
        sesiones = cls._extraer_sesiones(prog_limpio)
        # Asignar sesiones a cada unidad según rango de semanas
        for u in resultado["unidades"]:
            semanas_rango = u.get("semanas", "")
            m = re.search(r"Semana\s+(\d+)-(\d+)", semanas_rango)
            if m:
                inicio, fin = int(m.group(1)), int(m.group(2))
                u["sesiones"] = [s for s in sesiones if inicio <= s.get("semana_num", 0) <= fin]
            else:
                u["sesiones"] = []

        # 3. Correcciones con curso_esperado
        resultado = cls._corregir(resultado, curso_esperado, periodo_esperado)

        # 4. Calcular score
        score, coincidencias = cls._calcular_score(resultado, texto, curso_esperado, periodo_esperado)
        resultado["puntaje_confianza"] = score
        resultado["coincidencias"] = coincidencias

        return resultado

    # ─── Segmentación ───

    @classmethod
    def _segmentar(cls, texto: str) -> Dict[str, str]:
        """Divide el texto en secciones según los encabezados UNT."""
        # Índices de inicio de cada sección
        indices = {}
        for nombre_seccion, patrones in cls.SECCIONES.items():
            for patron in patrones:
                m = re.search(patron, texto, re.IGNORECASE)
                if m:
                    indices[nombre_seccion] = m.start()
                    break

        # Ordenar por posición
        ordenados = sorted(indices.items(), key=lambda x: x[1])

        # Extraer texto de cada sección
        secciones = {}
        for i, (nombre, inicio) in enumerate(ordenados):
            if i + 1 < len(ordenados):
                fin = ordenados[i + 1][1]
            else:
                fin = len(texto)
            secciones[nombre] = texto[inicio:fin]

        return secciones

    # ─── Extracción por campo ───

    @classmethod
    def _extraer_codigo(cls, seccion_id: str, texto_completo: str) -> str:
        """Extrae código SOLO de la sección de identificación o primeras 30 líneas."""
        # Buscar primero en sección de identificación
        m = re.search(r"Código\s+(?:de\s+la\s+experiencia\s+curricular|del\s+curso)\s*[:\-]?\s*(\d{3,5})\s*$", seccion_id, re.IGNORECASE | re.MULTILINE)
        if m:
            return m.group(1)

        # Fallback: primeras 30 líneas del documento
        lineas = texto_completo.splitlines()[:30]
        for linea in lineas:
            m = re.search(r"Código\s+(?:de\s+la\s+experiencia\s+curricular|del\s+curso)\s*[:\-]?\s*(\d{3,5})", linea, re.IGNORECASE)
            if m:
                return m.group(1)
            m = re.search(r"Código\s*[:\-]?\s*(\d{3,5})", linea, re.IGNORECASE)
            if m:
                return m.group(1)
        return ""

    @classmethod
    def _extraer_nombre_curso(cls, texto: str) -> str:
        """
        El nombre del curso está en el TÍTULO del documento.
        Busca en las primeras 10 líneas: comillas después de 'SILABO...'
        """
        lineas = texto.splitlines()[:10]
        texto_inicio = "\n".join(lineas)

        # Patrón 1: SILABO ... "NOMBRE DEL CURSO"
        m = re.search(r'(?:SILABO|SÍLABO|SYLLABUS).*?(?:CURRICULAR|CURSO|ASIGNATURA)\s*["\'“”]([^"\'“”\n]{5,80})["\'“”]', texto_inicio, re.IGNORECASE)
        if m:
            nombre = m.group(1).strip()
            if nombre.upper() not in {"LA EXPERIENCIA CURRICULAR", "EXPERIENCIA CURRICULAR", "CURSO", "ASIGNATURA", ""}:
                return nombre

        # Patrón 2: línea que empieza con comillas
        for linea in lineas:
            m = re.search(r'^\s*["\'“”]([^"\'“”\n]{5,80})["\'“”]', linea)
            if m:
                nombre = m.group(1).strip()
                if nombre.upper() not in {"LA EXPERIENCIA CURRICULAR", "EXPERIENCIA CURRICULAR", "CURSO", "ASIGNATURA", ""}:
                    return nombre

        # Patrón 3: después de "Asignatura:" o "Curso:" en las primeras líneas
        for linea in lineas:
            m = re.search(r"(?:Asignatura|Curso|Materia)\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ\s&]{5,80})\s*$", linea, re.IGNORECASE)
            if m:
                return m.group(1).strip()

        return ""

    @classmethod
    def _extraer_ciclo(cls, seccion_id: str) -> str:
        m = re.search(r"Ciclo\s*[:\-]?\s*([IVX0-9]+)\s*$", seccion_id, re.IGNORECASE | re.MULTILINE)
        if m:
            return m.group(1).strip()
        return ""

    @classmethod
    def _extraer_periodo(cls, seccion_id: str) -> str:
        """Extrae periodo SOLO de la sección de identificación. Valida año 2020-2030."""
        patrones = [
            r"Año\s*[-–]\s*Semestre\s+acad[eé]mico\s*[:\-]?\s*(\d{4}[-–][IV12]+)",
            r"Año\s*[-–]?\s*Semestre\s*[:\-]?\s*(\d{4}[-–][IV12]+)",
            r"Periodo\s*Acad[eé]mico\s*[:\-]?\s*(\d{4}[-–][IV12]+)",
            r"Año\s+lectivo\s*[:\-]?\s*(\d{4}[-–][IV12]+)",
        ]
        for patron in patrones:
            m = re.search(patron, seccion_id, re.IGNORECASE)
            if m:
                periodo = m.group(1).replace('–', '-').strip()
                # Validar que el año sea razonable (2020-2030)
                anio_match = re.match(r"^(\d{4})-", periodo)
                if anio_match:
                    anio = int(anio_match.group(1))
                    if 2020 <= anio <= 2030:
                        return periodo
        return ""

    @classmethod
    def _extraer_docente(cls, seccion_id: str) -> str:
        """Extrae docente de la tabla en la sección de identificación."""
        # Buscar línea que contenga "Coordinador" seguido de nombre
        for linea in seccion_id.splitlines():
            m = re.search(r"Coordinador\(a\)?\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)", linea, re.IGNORECASE)
            if m:
                nombre = m.group(1).strip()
                # Validar que parezca un nombre real (al menos 2 palabras, no texto genérico)
                palabras = nombre.split()
                if len(palabras) >= 2 and len(nombre) > 8 and "UNIVERSIDAD" not in nombre.upper():
                    return nombre

        # Buscar cualquier nombre en formato Apellido Apellido Nombre
        for linea in seccion_id.splitlines():
            m = re.search(r"([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)", linea)
            if m:
                nombre = m.group(1).strip()
                if "UNIVERSIDAD" not in nombre.upper() and "NACIONAL" not in nombre.upper() and len(nombre) > 8:
                    return nombre
        return ""

    @classmethod
    def _extraer_email(cls, seccion_id: str) -> str:
        m = re.search(r"([a-zA-Z0-9._%+-]+@unitru\.edu\.pe)", seccion_id, re.IGNORECASE)
        if m:
            return m.group(1).lower()
        return ""

    @classmethod
    def _extraer_nota(cls, seccion_eval: str) -> float:
        # Captura enteros y decimales: 13, 13.5, 14.0
        patrones = [
            r"nota\s+aprobatoria\s+(?:es\s+)?[:\-]?\s*(\d+(?:\.\d+)?)",
            r"nota\s+m[ií]nima\s+aprobatoria\s*[:\-]?\s*(\d+(?:\.\d+)?)",
            r"promedio\s+aprobatorio\s*[:\-]?\s*(\d+(?:\.\d+)?)",
            r"nota\s+de\s+aprobaci[óo]n\s*[:\-]?\s*(\d+(?:\.\d+)?)",
        ]
        for patron in patrones:
            m = re.search(patron, seccion_eval, re.IGNORECASE)
            if m:
                nota_str = m.group(1)
                try:
                    nota = float(nota_str)
                    if 10 <= nota <= 20:
                        return nota
                except ValueError:
                    continue
        return 14.0

    @classmethod
    def _extraer_formulas(cls, seccion_eval: str) -> Dict[str, str]:
        """
        Extrae fórmulas de la sección de evaluación con múltiples patrones.
        Soporta: PU1 = ..., PU1: ..., PU1 → ..., formato tabla, etc.
        """
        formulas = {}

        # Patrones flexibles para cada fórmula
        patrones_por_key = {
            "PU1": [
                r"PU1\s*[:\-=→>]\s*(.+?)(?:\n|$)",
                r"Unidad\s+de\s+aprendizaje\s+1.*?[:\-=→>]\s*(.+?)(?:\n|$)",
                r"(?:Promedio|Unidad)\s+1\s*[:\-=→>]\s*(.+?)(?:\n|$)",
            ],
            "PU2": [
                r"PU2\s*[:\-=→>]\s*(.+?)(?:\n|$)",
                r"Unidad\s+de\s+aprendizaje\s+2.*?[:\-=→>]\s*(.+?)(?:\n|$)",
                r"(?:Promedio|Unidad)\s+2\s*[:\-=→>]\s*(.+?)(?:\n|$)",
            ],
            "PU3": [
                r"PU3\s*[:\-=→>]\s*(.+?)(?:\n|$)",
                r"Unidad\s+de\s+aprendizaje\s+3.*?[:\-=→>]\s*(.+?)(?:\n|$)",
                r"(?:Promedio|Unidad)\s+3\s*[:\-=→>]\s*(.+?)(?:\n|$)",
            ],
            "PP": [
                r"PP\s*[:\-=→>]\s*(.+?)(?:\n|$)",
                r"Promedio\s+ponderado\s*[:\-=→>]\s*(.+?)(?:\n|$)",
                r"Promedio\s+final\s*[:\-=→>]\s*(.+?)(?:\n|$)",
            ],
        }

        # Método 1: buscar patrones específicos línea por línea
        for key, patrones in patrones_por_key.items():
            for patron in patrones:
                m = re.search(patron, seccion_eval, re.IGNORECASE)
                if m:
                    raw = m.group(1).strip()
                    raw = cls._limpiar_formula(raw)
                    if raw and (re.search(r"[0-9.]", raw) or re.search(r"PU[123]", raw)):
                        formulas[key] = raw
                        break

        # Método 2: si falta PU1/PU2/PU3, buscar en líneas que contengan pesos + variables
        # Ejemplo: "0.2 PT + 0.4 EO + 0.4 EL" debajo de un encabezado PU1
        if not formulas.get("PU1"):
            m = re.search(r"(?:PU1|Unidad\s+1|Promedio\s+1).*?(\d+\.?\d*\s*[*x×]?\s*[A-Z]{2,3}\s*\+.*?\d+\.?\d*\s*[*x×]?\s*[A-Z]{2,3})", seccion_eval, re.IGNORECASE | re.DOTALL)
            if m:
                raw = cls._limpiar_formula(m.group(1))
                if raw:
                    formulas["PU1"] = raw

        if not formulas.get("PU2"):
            m = re.search(r"(?:PU2|Unidad\s+2|Promedio\s+2).*?(\d+\.?\d*\s*[*x×]?\s*[A-Z]{2,3}\s*\+.*?\d+\.?\d*\s*[*x×]?\s*[A-Z]{2,3})", seccion_eval, re.IGNORECASE | re.DOTALL)
            if m:
                raw = cls._limpiar_formula(m.group(1))
                if raw:
                    formulas["PU2"] = raw

        if not formulas.get("PU3"):
            m = re.search(r"(?:PU3|Unidad\s+3|Promedio\s+3).*?(\d+\.?\d*\s*[*x×]?\s*[A-Z]{2,3}\s*\+.*?\d+\.?\d*\s*[*x×]?\s*[A-Z]{2,3})", seccion_eval, re.IGNORECASE | re.DOTALL)
            if m:
                raw = cls._limpiar_formula(m.group(1))
                if raw:
                    formulas["PU3"] = raw

        # Método 3: buscar líneas que parezcan fórmulas matemáticas (número*VAR + número*VAR)
        if not formulas.get("PU1"):
            for linea in seccion_eval.splitlines():
                linea = linea.strip()
                # Debe tener formato: número*VAR + número*VAR
                if re.match(r"\d+\.?\d*\s*[*x×]?\s*[A-Z]{2,3}\s*\+\s*\d+\.?\d*\s*[*x×]?\s*[A-Z]{2,3}", linea):
                    # Verificar que no sea PP
                    if not re.match(r"(?:PP|Promedio)", linea, re.IGNORECASE):
                        if not formulas.get("PU1"):
                            formulas["PU1"] = cls._limpiar_formula(linea)
                        elif not formulas.get("PU2"):
                            formulas["PU2"] = cls._limpiar_formula(linea)
                        elif not formulas.get("PU3"):
                            formulas["PU3"] = cls._limpiar_formula(linea)
                        if len(formulas) >= 4:
                            break

        # Método 4: buscar en formato tabla (filas tipo "PU1 | 0.2 PT + 0.4 EO + 0.4 EL")
        for key in ["PU1", "PU2", "PU3", "PP"]:
            if key in formulas:
                continue
            # Buscar en líneas que contengan PU1/PU2/PU3/PP seguido de separador y fórmula
            patron_tabla = rf"(?:^|\n)\s*{re.escape(key)}\s*[\|\t:\-]\s*(.+?)(?:\n|$)"
            m = re.search(patron_tabla, seccion_eval, re.IGNORECASE)
            if m:
                raw = cls._limpiar_formula(m.group(1))
                if raw and (re.search(r"[0-9.]", raw) or re.search(r"PU[123]", raw)):
                    formulas[key] = raw

        # Método 5: buscar fórmulas indentadas (línea siguiente al encabezado)
        for key in ["PU1", "PU2", "PU3", "PP"]:
            if key in formulas:
                continue
            # Buscar "PU1" en una línea, luego la siguiente línea indentada
            patron_indent = rf"(?:^|\n)\s*{re.escape(key)}\s*\n\s+(.+?)(?:\n|$)"
            m = re.search(patron_indent, seccion_eval, re.IGNORECASE)
            if m:
                raw = cls._limpiar_formula(m.group(1))
                if raw and (re.search(r"[0-9.]", raw) or re.search(r"PU[123]", raw)):
                    formulas[key] = raw

        # Método 6: buscar lista con bullets (• PU1: fórmula)
        for key in ["PU1", "PU2", "PU3", "PP"]:
            if key in formulas:
                continue
            patron_bullet = rf"[•\-\*]\s*{re.escape(key)}\s*[\:\-]?\s*(.+?)(?:\n|$)"
            m = re.search(patron_bullet, seccion_eval, re.IGNORECASE)
            if m:
                raw = cls._limpiar_formula(m.group(1))
                if raw and (re.search(r"[0-9.]", raw) or re.search(r"PU[123]", raw)):
                    formulas[key] = raw

        # Método 7: formato natural "Por unidad: X% [nombre] + Y% [nombre]"
        # Ejemplo: "Por unidad: 30% Prácticas + 30% Informes + 40% Examen Parcial"
        if not formulas.get("PU1") and not formulas.get("PU2") and not formulas.get("PU3"):
            m = re.search(
                r"[Pp]or\s+[Uu]nidad\s*[:\-]?\s*(.+?)(?:\n|$)",
                seccion_eval, re.IGNORECASE
            )
            if m:
                linea = m.group(1).strip()
                componentes = cls._parsear_formula_natural(linea)
                if componentes:
                    formula_str = " + ".join([f"{peso}*{nombre.replace(' ', '_')}" for peso, nombre in componentes])
                    formulas["PU1"] = formula_str
                    formulas["PU2"] = formula_str
                    formulas["PU3"] = formula_str

        # Método 8: buscar fórmulas por unidad individuales
        # Ejemplo: "Unidad I: 30% Prácticas + ..." o "I Unidad: 30% Prácticas + ..."
        for i, unidad_num in enumerate([("1", "I"), ("2", "II"), ("3", "III")]):
            num_rom, num_arab = unidad_num
            key = f"PU{i+1}"
            if key in formulas:
                continue
            # Buscar "Unidad I: X% ..." o "I Unidad: X% ..."
            patrones_unidad = [
                rf"[Uu]nidad\s+{re.escape(num_rom)}\s*[:\-]?\s*(\d+%\s*[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+(?:\s*\+\s*\d+%\s*[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+)*)",
                rf"{re.escape(num_rom)}\s+[Uu]nidad\s*[:\-]?\s*(\d+%\s*[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+(?:\s*\+\s*\d+%\s*[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+)*)",
                rf"[Uu]nidad\s+de\s+[Aa]prendizaje\s+{re.escape(num_rom)}\s*[:\-]?\s*(\d+%\s*[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+(?:\s*\+\s*\d+%\s*[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+)*)",
            ]
            for patron in patrones_unidad:
                m = re.search(patron, seccion_eval, re.IGNORECASE)
                if m:
                    linea = m.group(1).strip()
                    componentes = cls._parsear_formula_natural(linea)
                    if componentes:
                        formula_str = " + ".join([f"{peso}*{nombre.replace(' ', '_')}" for peso, nombre in componentes])
                        formulas[key] = formula_str
                        break

        return formulas

    @classmethod
    def _limpiar_formula(cls, formula: str) -> str:
        """Normaliza una fórmula matemática extraída."""
        if not formula:
            return ""
        # Quitar prefijos como "PU1 = " si vienen incluidos
        formula = re.sub(r'^(?:PU\d|PP)\s*[:\-=→>]+\s*', '', formula, flags=re.IGNORECASE)
        # Normalizar multiplicación
        formula = re.sub(r'(\d)\s+([A-Z])', r'\1*\2', formula)
        formula = formula.replace('×', '*').replace('x', '*')
        # Quitar espacios extra
        formula = ' '.join(formula.split())
        return formula

    @classmethod
    def _parsear_formula_natural(cls, linea: str) -> List[Tuple[float, str]]:
        """
        Parsea formato natural como '30% Prácticas + 30% Informes + 40% Examen Parcial'
        Retorna lista de (peso_decimal, nombre_evidencia)
        """
        componentes = []
        # Dividir por '+'
        partes = re.split(r'\s*\+\s*', linea)
        for parte in partes:
            parte = parte.strip()
            if not parte:
                continue
            # Extraer porcentaje y nombre
            # Formato: "30% Prácticas" o "30 % Prácticas" o "0.3 Prácticas"
            m = re.match(r'(\d+\.?\d*)\s*%?\s+(.+)', parte)
            if m:
                peso_str = m.group(1)
                nombre = m.group(2).strip()
                try:
                    peso = float(peso_str)
                    # Si es > 1, probablemente es porcentaje (30 → 0.3)
                    if peso > 1:
                        peso = peso / 100.0
                    if 0 < peso <= 1 and len(nombre) > 2:
                        # Normalizar nombre
                        nombre_limpio = ' '.join(nombre.split())
                        componentes.append((peso, nombre_limpio))
                except ValueError:
                    continue
        return componentes

    @classmethod
    def _derivar_evidencias(cls, formulas: Dict[str, str]) -> Dict[str, Dict]:
        evidencias = {}
        seen = set()

        for formula in formulas.values():
            # número*VARIABLE (siglas mayúsculas de 2+ caracteres)
            matches = re.findall(r"(\d+\.?\d*)\s*\*?\s*([A-Z][A-Z0-9_]+)" , formula)
            for peso_str, sigla in matches:
                if sigla in {"PU1", "PU2", "PU3", "PP"}:
                    continue
                if len(sigla) < 2:  # Rechazar siglas de 1 letra
                    continue
                key = f"{sigla}_{peso_str}"
                if key in seen:
                    continue
                seen.add(key)
                try:
                    peso = float(peso_str)
                except ValueError:
                    continue
                if sigla not in evidencias:
                    evidencias[sigla] = {"nombre": sigla, "peso": peso}

            # número*NOMBRE_CON_GUIONES_BAJOS (formato natural convertido)
            # Ejemplo: 0.3*Prácticas o 0.3*Examen_Parcial
            matches_natural = re.findall(r"(\d+\.?\d*)\s*\*?\s*([A-Za-zÁÉÍÓÚáéíóúñÑ][A-Za-zÁÉÍÓÚáéíóúñÑ_]*)", formula)
            for peso_str, nombre_raw in matches_natural:
                if nombre_raw.upper() in {"PU1", "PU2", "PU3", "PP"}:
                    continue
                nombre = nombre_raw.replace('_', ' ').strip()
                key = f"{nombre}_{peso_str}"
                if key in seen:
                    continue
                seen.add(key)
                try:
                    peso = float(peso_str)
                except ValueError:
                    continue
                # Generar sigla a partir del nombre
                palabras = nombre.split()
                if len(palabras) == 1:
                    sigla = palabras[0][:3].upper()
                else:
                    sigla = ''.join(p[0].upper() for p in palabras if p)
                if not sigla:
                    sigla = nombre[:3].upper()
                if sigla not in evidencias:
                    evidencias[sigla] = {"nombre": nombre, "peso": peso}

        # Fallback: formato sin asterisco
        if not evidencias:
            for formula in formulas.values():
                matches = re.findall(r"(\d+\.?\d*)\s+([A-Z][A-Z0-9_]*)" , formula)
                for peso_str, sigla in matches:
                    if sigla in {"PU1", "PU2", "PU3", "PP"}:
                        continue
                    if sigla not in evidencias:
                        try:
                            peso = float(peso_str)
                        except ValueError:
                            continue
                        evidencias[sigla] = {"nombre": sigla, "peso": peso}

        return evidencias

    @classmethod
    def _extraer_unidades(cls, seccion_prog: str, tabla_prog: Dict = None) -> List[Dict]:
        """Extrae unidades con múltiples patrones: romanos, arábigos, bloques, tablas.
        Usa datos de tabla multicolumna si están disponibles."""
        if tabla_prog is None:
            tabla_prog = {}
        unidades = []
        nombres_encontrados = []
        sesiones_tabla = tabla_prog.get("sesiones", [])

        # Patrones para encontrar nombres de unidades
        patrones_busqueda = [
            # UNIDAD I. Nombre, UNIDAD II. Nombre, UNIDAD III. Nombre
            (rf"UNIDAD\s+(I|II|III)\s*[.:\-]?\s*([^\n]{{3,100}})", "romano"),
            # UNIDAD 1. Nombre, UNIDAD 2. Nombre, UNIDAD 3. Nombre
            (rf"UNIDAD\s+(1|2|3)\s*[.:\-]?\s*([^\n]{{3,100}})", "numero"),
            # BLOQUE I: Nombre, BLOQUE 1: Nombre
            (rf"BLOQUE\s+(I{{1,3}}|1|2|3)\s*[.:\-]?\s*([^\n]{{3,100}})", "bloque"),
            # CAPÍTULO I. Nombre
            (rf"CAP[IÍ]TULO\s+(I{{1,3}}|1|2|3)\s*[.:\-]?\s*([^\n]{{3,100}})", "capitulo"),
            # 1. Nombre de la unidad (línea que empieza con número y punto)
            (r"^\s*(1|2|3)\s*[.\)]\s+([A-ZÁÉÍÓÚÑ][^\n]{3,100})", "numerado"),
            # En tablas: fila con "1 | Nombre de unidad | semanas"
            (r"(?:^|\n)\s*(1|2|3)\s*[\|\t]\s*([^\n|]{3,100})\s*[\|\t]", "tabla"),
        ]

        # Formato A: "I UNIDAD" seguido de nombre en líneas siguientes
        patron_multilinea = r"(?:^|\n)\s*(I|II|III)\s+UNIDAD\s*\n+((?:[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúñÑ\s:;,.()-]*)(?:\n+[A-Za-zÁÉÍÓÚáéíóúñÑ\s:;,.()-]*)*)"
        for m in re.finditer(patron_multilinea, seccion_prog, re.IGNORECASE | re.MULTILINE):
            num_raw = m.group(1)
            nombre_raw = m.group(2).strip()
            num_map = {"I": 1, "II": 2, "III": 3}
            num = num_map.get(num_raw)
            if num and nombre_raw:
                nombre_limpio = ' '.join(nombre_raw.split())
                nombre_limpio = re.sub(r'[.,;:\-]+$', '', nombre_limpio).strip()
                if len(nombre_limpio) > 5 and len(nombre_limpio) < 200:
                    nombres_encontrados.append((num, nombre_limpio))

        # Formato B: "II UNIDAD Nombre" todo en la misma línea (común en PDFs UNT)
        # Ejemplo: "II UNIDAD Gestión de compras: proceso, objetivo..."
        patron_misma_linea = r"(?:^|\n)\s*(I|II|III)\s+UNIDAD\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúñÑ\s:;,.()-]{5,120})"
        for m in re.finditer(patron_misma_linea, seccion_prog, re.IGNORECASE | re.MULTILINE):
            num_raw = m.group(1)
            nombre_raw = m.group(2).strip()
            num_map = {"I": 1, "II": 2, "III": 3}
            num = num_map.get(num_raw)
            if num and nombre_raw:
                nombre_limpio = ' '.join(nombre_raw.split())
                nombre_limpio = re.sub(r'[.,;:\-]+$', '', nombre_limpio).strip()
                # Rechazar si empieza con palabra genérica
                primeras_palabras = ' '.join(nombre_limpio.split()[:2]).upper()
                genericos_start = {"MOTIVACIÓN", "MOTIVACION", "EXPOSICIÓN", "EXPOSICION",
                                   "DESARROLLO DE", "REALIZACIÓN DE", "REALIZACION DE",
                                   "USO DE", "PARA ACLARAR"}
                if primeras_palabras in genericos_start:
                    continue
                if len(nombre_limpio) > 5 and len(nombre_limpio) < 200:
                    nombres_encontrados.append((num, nombre_limpio))

        # Fallback C: buscar nombres entre headers de unidad en el texto completo
        # Divide por unidades y toma las primeras líneas significativas de cada bloque
        if not nombres_encontrados or len({n for n, _ in nombres_encontrados}) < 2:
            bloques = cls._dividir_texto_por_unidades(seccion_prog)
            for num, bloque in bloques:
                lineas = [l.strip() for l in bloque.splitlines() if l.strip()]
                for linea in lineas[:3]:  # primeras 3 líneas del bloque
                    linea = re.sub(r'^[•\-\*\d]+[.\)]?\s*', '', linea)
                    if len(linea) > 10 and len(linea) < 150:
                        upper = linea.upper()
                        if any(bad in upper for bad in ["ESTRATEGIAS", "DIDÁCTICAS", "EVIDENCIAS",
                                                         "INSTRUMENTOS", "RÚBRICA", "EXAMEN"]):
                            continue
                        if linea[0].isupper():
                            nombres_encontrados.append((num, linea))
                            break

        # Recopilar todos los nombres encontrados
        for patron, tipo in patrones_busqueda:
            for m in re.finditer(patron, seccion_prog, re.IGNORECASE | re.MULTILINE):
                num_raw = m.group(1)
                nombre_raw = m.group(2).strip()
                # Determinar número de unidad
                num_map = {"I": 1, "II": 2, "III": 3, "1": 1, "2": 2, "3": 3}
                num = num_map.get(num_raw)
                if num and nombre_raw:
                    # Limpiar nombre
                    nombre_raw = re.sub(r'\s+', ' ', nombre_raw)
                    if len(nombre_raw) > 3 and len(nombre_raw) < 120:
                        # Quitar textos genéricos o basura
                        nombre_upper = nombre_raw.upper()
                        genericos = {"REDES", "SISTEMAS", "SEM", "SEM.", "TOTAL", "HORAS",
                                     "MOTIVACIÓN", "MOTIVACION", "EXPOSICIÓN", "EXPOSICION",
                                     "DESARROLLO DE", "REALIZACIÓN DE", "REALIZACION DE",
                                     "USO DE", "PARA ACLARAR", "CONSEJERÍA", "CONSEJERIA",
                                     "1.", "2.", "3.", "EXAMEN", "PARCIAL", "FINAL",
                                     "RÚBRICA", "RUBRICA", "EVALUACIÓN", "EVALUACION",
                                     "INSTRUMENTOS", "INDICADORES", "DIRECTRICES",
                                     "ESTRATEGIAS", "DIDÁCTICAS", "DIDACTICAS"}
                        # Si el nombre coincide exacto con genérico, saltar
                        if nombre_upper in genericos:
                            continue
                        # Si empieza con genérico y es muy corto, saltar
                        if any(nombre_upper.startswith(g) for g in genericos if len(g) > 4):
                            if len(nombre_raw) < 25:
                                continue
                        # Rechazar nombres que parecen herramientas de evaluación
                        if any(w in nombre_upper for w in ["RÚBRICA", "RUBRICA", "INSTRUMENTO", "INDICADOR"]):
                            if len(nombre_raw) < 25:
                                continue
                        nombres_encontrados.append((num, nombre_raw))

        # Si encontramos unidades, usarlas; si no, usar defaults
        for i in range(1, 4):
            uid = f"U{i}"
            # Buscar nombre para esta unidad
            nombre = f"Unidad {i}"
            for num, nombre_encontrado in nombres_encontrados:
                if num == i:
                    nombre = nombre_encontrado
                    break

            # Si no hay nombre y tenemos sesiones de tabla, inferir del primer contenido
            if nombre == f"Unidad {i}" and sesiones_tabla:
                sesiones_u = [s for s in sesiones_tabla if s.get("unidad") == i]
                if sesiones_u:
                    # Solo usar el primer contenido, no concatenar
                    primer = sesiones_u[0].get("contenido", "")
                    if primer:
                        nombre = primer[:100]

            # Capacidades y resultados de esta unidad
            caps_u = [c["texto"] for c in tabla_prog.get("capacidades", []) if c.get("unidad") == i]
            res_u = [r["texto"] for r in tabla_prog.get("resultados", []) if c.get("unidad") == i]

            # Sesiones de esta unidad - usar límites detectados si existen
            limites = tabla_prog.get("limites_unidades", {})
            sesiones_originales = [s for s in sesiones_tabla if s.get("unidad") == i]
            
            if limites and i in limites:
                limite_sem = limites[i]
                # Filtrar sesiones: solo incluir semanas <= limite_sem
                sesiones_u = [s for s in sesiones_originales if s.get("semana_num", 0) <= limite_sem]
                # Calcular rango basado en el límite
                inicio = 1
                if i > 1 and (i - 1) in limites:
                    inicio = limites[i - 1] + 1
                semanas = f"Semana {inicio}-{limite_sem}"
            else:
                sesiones_u = sesiones_originales
                # Calcular rango basado en sesiones
                if sesiones_u:
                    sems_u = [s["semana_num"] for s in sesiones_u if s.get("semana_num")]
                    if sems_u:
                        semanas = f"Semana {min(sems_u)}-{max(sems_u)}"
                    else:
                        semanas = cls._get_semanas_default(i)
                else:
                    semanas = cls._get_semanas_default(i)

            if not sesiones_u:
                # Fallback: asignar por rango de semanas
                m = re.search(r"Semana\s+(\d+)-(\d+)", semanas)
                if m:
                    inicio, fin = int(m.group(1)), int(m.group(2))
                    from app.services.syllabus_extractor import UntSyllabusExtractor
                    # Buscar sesiones en sesiones_tabla sin unidad asignada o por rango
                    # (ya se asignaron arriba)

            unidades.append({
                "id": uid,
                "nombre": nombre,
                "semanas": semanas,
                "competencias": [],
                "capacidades": caps_u,
                "resultados_aprendizaje": res_u,
                "sesiones": sesiones_u,
            })

        return unidades

    @classmethod
    def _get_semanas_default(cls, i: int) -> str:
        return {1: "Semana 1-6", 2: "Semana 7-11", 3: "Semana 12-16"}.get(i, f"Semana {i}")

    @classmethod
    def _extraer_tutoria(cls, seccion_tut: str) -> Dict:
        tutoria = {"dia": "", "horario": "", "email": "", "canales": []}

        # Día: buscar palabra de día específica primero (más confiable)
        dias_semana = ["Lunes", "Martes", "Miércoles", "Miercoles", "Jueves", "Viernes", "Sábado", "Sabado", "Domingo"]
        for dia in dias_semana:
            if re.search(rf"\b{dia}\b", seccion_tut, re.IGNORECASE):
                tutoria["dia"] = dia
                break

        # Si no encontró día específico, usar regex genérico con múltiples palabras
        if not tutoria["dia"]:
            m = re.search(r"D[ií]a\s*[:\-]?\s*([A-Za-zÁÉÍÓÚÑáéíóúñ]+(?:\s+[A-Za-zÁÉÍÓÚÑáéíóúñ]+)?)", seccion_tut, re.IGNORECASE)
            if m:
                dia_raw = m.group(1).strip()
                # Validar que no sea texto basura
                if len(dia_raw) >= 3 and dia_raw.upper() not in {"NO", "S", "DIA", "EL", "LA"}:
                    tutoria["dia"] = dia_raw

        # Horario
        m = re.search(r"Horario\s*[:\-]?\s*([0-9.:]+\s*(?:m|pm|am)?\s*[-–]\s*[0-9.:]+\s*(?:m|pm|am)?)", seccion_tut, re.IGNORECASE)
        if m:
            tutoria["horario"] = m.group(1).strip()
        else:
            m = re.search(r"Horario\s*[:\-]?\s*([0-9.:]+)", seccion_tut, re.IGNORECASE)
            if m:
                tutoria["horario"] = m.group(1).strip()
            else:
                # Buscar horas sueltas tipo 15:00 - 17:00
                m = re.search(r"([0-9]{1,2}:[0-9]{2}\s*[-–]\s*[0-9]{1,2}:[0-9]{2})", seccion_tut)
                if m:
                    tutoria["horario"] = m.group(1).strip()

        # Email
        m = re.search(r"([a-zA-Z0-9._%+-]+@unitru\.edu\.pe)", seccion_tut)
        if m:
            tutoria["email"] = m.group(1)

        # Canales
        canales = []
        for canal in ["Email", "WhatsApp", "Google Meet", "Zoom", "Teams", "Presencial", "Virtual"]:
            if canal.lower() in seccion_tut.lower():
                canales.append(canal)
        tutoria["canales"] = canales if canales else ["Email"]

        return tutoria

    @classmethod
    def _extraer_seccion(cls, texto: str, inicio_pat: str, fin_pat: str) -> str:
        """Extrae texto entre dos patrones (usado por competencias, etc.)."""
        m_inicio = re.search(inicio_pat, texto, re.IGNORECASE)
        if not m_inicio:
            return ""
        idx_inicio = m_inicio.start()
        texto_restante = texto[idx_inicio + 200:]
        m_fin = re.search(fin_pat, texto_restante, re.IGNORECASE)
        if m_fin:
            return texto[idx_inicio:idx_inicio + 200 + m_fin.start()]
        return texto[idx_inicio:idx_inicio + 10000]

    @classmethod
    def _extraer_competencias(cls, texto: str) -> List[str]:
        """Extrae competencias de la sección III. COMPETENCIA. Une líneas de párrafos."""
        seccion = cls._extraer_seccion(texto, r"III\.\s*COMPETENCIA", r"IV\.|PROGRAMACI[ÓO]N")
        if not seccion:
            seccion = cls._extraer_seccion(texto, r"COMPETENCIAS", r"PROGRAMACI[ÓO]N|SISTEMA\s+DE\s+EVALUACI[ÓO]N")

        competencias = []
        if seccion:
            lineas = seccion.splitlines()
            i = 0
            while i < len(lineas):
                linea = lineas[i].strip()
                linea = re.sub(r'^[•\-\*\d]+[.\)]?\s*', '', linea)
                if not linea or len(linea) < 10:
                    i += 1
                    continue
                upper = linea.upper()
                encabezados = {
                    "COMPETENCIA", "COMPETENCIAS", "ESPECÍFICA", "GENÉRICA",
                    "ESPECIFICA", "GENERICA", "COMPETENCIA DE EGRESO",
                    "COMPETENCIAS DE EGRESO", "RESULTADO DE APRENDIZAJE",
                    "RESULTADOS DE APRENDIZAJE", "LOGRO", "OBJETIVO",
                    "CAPACIDADES", "CONOCIMIENTOS", "DESTREZAS"
                }
                if upper in encabezados or any(linea.startswith(h) for h in ["COMPETENCIA DE EGRESO", "RESULTADO DE APRENDIZAJE"]):
                    i += 1
                    continue

                # Unir líneas consecutivas del mismo párrafo
                parrafo = linea
                while i + 1 < len(lineas):
                    siguiente = lineas[i + 1].strip()
                    siguiente = re.sub(r'^[•\-\*\d]+[.\)]?\s*', '', siguiente)
                    if not siguiente:
                        i += 1
                        continue

                    upper_sig = siguiente.upper()
                    if upper_sig in encabezados or len(siguiente) < 5:
                        break

                    # Unir si:
                    # a) la actual termina en coma/;/: (incompleta)
                    # b) la actual NO termina en punto y la siguiente empieza con minúscula
                    # c) la actual NO termina en punto y la siguiente tiene >10 palabras
                    #    (probablemente continuación del párrafo a pesar de salto de línea)
                    termina_punto = parrafo.endswith('.')
                    termina_incompleto = parrafo.endswith(',') or parrafo.endswith(';') or parrafo.endswith(':')
                    sig_lower = siguiente and siguiente[0].islower()
                    sig_larga = len(siguiente.split()) > 10

                    if termina_incompleto:
                        parrafo += " " + siguiente
                        i += 1
                        continue
                    if not termina_punto and (sig_lower or sig_larga) and len(parrafo) < 500:
                        parrafo += " " + siguiente
                        i += 1
                        continue
                    break
                i += 1

                if len(parrafo) > 20:
                    competencias.append(parrafo)

        # Post-proceso: unir fragmentos que continúan la competencia anterior
        # Criterios de continuación:
        # 1. El anterior termina en artículo/preposición/conjunción/coma (oración incompleta)
        # 2. El siguiente empieza con minúscula o artículo
        if competencias:
            unidas = [competencias[0]]
            for c in competencias[1:]:
                prev = unidas[-1].strip()
                c_stripped = c.strip()
                c_lower = c_stripped.lower()
                c_starts_lower = c_stripped and c_stripped[0].islower()

                # ¿La anterior termina en algo que indica continuación?
                palabras_prev = prev.split()
                ultima_palabra = palabras_prev[-1].lower().rstrip(",.;:") if palabras_prev else ""
                penultima = palabras_prev[-2].lower().rstrip(",.;:") if len(palabras_prev) > 1 else ""

                termina_incompleto = (
                    prev.endswith(",") or
                    prev.endswith(";") or
                    prev.endswith(":") or
                    ultima_palabra in {"la", "el", "los", "las", "lo", "una", "un", "unas", "unos",
                                         "de", "del", "a", "al", "en", "con", "por", "para",
                                         "sobre", "entre", "hacia", "desde", "hasta", "sin",
                                         "y", "e", "o", "u", "que", "como", "pero", "aunque",
                                         "cuando", "mientras", "porque", "pues", "si", "ni"}
                )

                # ¿El siguiente claramente continúa?
                c_is_continuation = (
                    c_starts_lower or
                    c_lower.startswith("de ") or
                    c_lower.startswith("del ") or
                    c_lower.startswith("la ") or
                    c_lower.startswith("el ") or
                    c_lower.startswith("los ") or
                    c_lower.startswith("las ") or
                    c_lower.startswith("una ") or
                    c_lower.startswith("un ") or
                    c_lower.startswith("y ") or
                    c_lower.startswith("e ") or
                    c_lower.startswith("o ") or
                    c_lower.startswith("u ") or
                    c_lower.startswith("que ") or
                    c_lower.startswith("con ") or
                    c_lower.startswith("por ") or
                    c_lower.startswith("para ")
                )

                if (termina_incompleto and c_is_continuation) and len(unidas[-1]) < 600:
                    # Unir sin doble espacio
                    if prev.endswith(",") or prev.endswith(";") or prev.endswith(":"):
                        unidas[-1] = prev + " " + c_stripped
                    else:
                        unidas[-1] = prev + " " + c_stripped
                else:
                    unidas.append(c_stripped)
            competencias = unidas

        return competencias[:2]  # máximo 2 competencias completas

    # ─── Utilidades de limpieza ───

    @classmethod
    def _limpiar_artefactos_pdf(cls, texto: str) -> str:
        """Elimina headers, footers y artefactos comunes de PDFs UNT."""
        lineas = texto.splitlines()
        lineas_limpias = []
        for linea in lineas:
            strip = linea.strip()
            upper = strip.upper()
            # Rechazar líneas que son claramente headers/footers/institucionales
            reject = False
            for kw in ["VISADO", "UNIVERSIDAD NACIONAL DE TRUJILLO",
                       "FACULTAD DE INGENIERIA", "FACULTAD DE INGENIERÍA",
                       "DEPARTAMENTO DE INGENIERIA", "DEPARTAMENTO DE INGENIERÍA",
                       "PÁGINA", "PAGE", "CODIGO:", "CÓDIGO:", "COD.:",
                       "SEMESTRE:", "PERIODO:", "SECCIÓN:", "SECCION:",
                       "SILABO", "SÍLABO", "VICERRECTORADO",
                       "DIRECCIÓN DE", "DIRECCION DE"]:
                if kw in upper:
                    reject = True
                    break
            # Rechazar líneas cortas que son solo números de página
            if re.match(r'^\d+$', strip) and len(strip) <= 3:
                reject = True
            if not reject:
                lineas_limpias.append(linea)
        return '\n'.join(lineas_limpias)

    @classmethod
    def _dividir_texto_por_unidades(cls, texto: str) -> List:
        """Divide texto en bloques usando I/II/III UNIDAD o UNIDAD I/II/III como delimitadores."""
        # Buscar todos los headers de unidad
        patron = r'(?:^|\n)\s*(?:UNIDAD\s+(I|II|III)|(I|II|III)\s+UNIDAD)\s*(?:\n|$)'
        matches = list(re.finditer(patron, texto, re.IGNORECASE))
        bloques = []
        for idx, m in enumerate(matches):
            num_raw = m.group(1) or m.group(2)
            num_map = {"I": 1, "II": 2, "III": 3}
            num = num_map.get(num_raw)
            if not num:
                continue
            inicio = m.end()
            fin = matches[idx + 1].start() if idx + 1 < len(matches) else len(texto)
            bloque = texto[inicio:fin].strip()
            # Cortar bloque si aparece siguiente sección (V. EVALUACIÓN, etc.)
            for sec_marker in ["V.", "SISTEMA DE EVALUACIÓN", "SISTEMA DE EVALUACION",
                               "V. SISTEMA", "EVALUACIÓN POR COMPETENCIAS"]:
                pos = bloque.upper().find(sec_marker)
                if pos > 50:  # solo si hay contenido sustancial antes
                    bloque = bloque[:pos].strip()
                    break
            bloques.append((num, bloque))
        return bloques

    # Palabras clave de estrategias didácticas (para filtrar sesiones falsas)
    ESTRATEGIAS_KEYWORDS = [
        "motivación", "motivacion", "exposición docente", "exposicion docente",
        "desarrollo de casos", "casos de estudio", "uso de plataformas",
        "plataformas virtuales", "realización de foros", "realizacion de foros",
        "foros para la discusión", "foros para la discusion",
        "para aclarar", "preguntas y recomendaciones", "consejería", "consejeria",
        "correo", "aplicación del tema", "aplicacion del tema", "tema a tratar",
        "rúbrica de evaluación", "rubrica de evaluacion", "examen mixto",
        "informe de trabajo", "práctica de aplicación", "practica de aplicacion",
        "trabajo de aplicación", "trabajo de aplicacion", "exposición",
        "exposicion", "docente", "motivacion", "foros", "rubrica", "rubica",
        # Fragmentos cortos que son estrategias puras
        "desarrollo de", "uso de", "realización de", "realizacion de",
        "aplicación del", "aplicacion del", "exposición docente", "exposicion docente",
        "motivación del", "motivacion del"
    ]

    # Palabras clave de evidencias/instrumentos (contenidos que NO son temas de sesión)
    EVIDENCIAS_KEYWORDS = [
        "examen mixto", "examen parcial", "examen final", "práctica", "practica",
        "informe", "trabajo de aplicación", "trabajo de aplicacion",
        "caso de estudio", "caso", "rúbrica", "rubrica", "evaluación continua",
        "participación", "asistencia", "tarea", "cuestionario", "proyecto",
        "investigación formativa", "monografía", "exposición", "exposicion"
    ]

    # Verbos de competencia (contenidos que empiezan con estos son competencias, no temas)
    VERBOS_COMPETENCIA = [
        "analiza", "diseña", "evalúa", "evalua", "aplica", "gestiona", "desarrolla",
        "identifica", "propone", "compromete", "valora", "investiga", "resuelve",
        "formula", "interpreta", "sintetiza", "argumenta", "ejecuta", "controla",
        "administra", "planifica", "implanta", "prueba", "implanta", "contribuye",
        "crea", "genera", "optimiza", "mejora", "demuestra", "explica", "comunica",
        "lidera", "organiza", "coordina", "supervisa", "dirige", "integra",
        "aplicar", "analizar", "diseñar", "evaluar", "gestionar", "desarrollar",
        "identificar", "proponer", "comprometerse", "valorar", "investigar",
        "resolver", "formular", "interpretar", "sintetizar", "argumentar",
        "ejecutar", "controlar", "administrar", "planificar", "implantar",
        "probar", "contribuir", "crear", "generar", "optimizar", "mejorar",
        "demostrar", "explicar", "comunicar", "liderar", "organizar", "coordinar",
        "supervisar", "dirigir", "integrar"
    ]

    @classmethod
    def _es_estrategia_didactica(cls, contenido: str) -> bool:
        """Determina si un contenido de sesión es en realidad una estrategia didáctica."""
        lower = contenido.lower()
        count = sum(1 for kw in cls.ESTRATEGIAS_KEYWORDS if kw in lower)
        palabras = contenido.split()
        if count >= 2:
            return True
        if palabras and count / len(palabras) >= 0.25:
            return True
        # Contenidos muy cortos (< 15 chars) que son verbos solos = estrategias
        if len(contenido) < 15 and any(kw in lower for kw in cls.ESTRATEGIAS_KEYWORDS):
            return True
        # Fragmentos de estrategia que terminan en preposición
        gerundios_estrategia = {"desarrollo", "uso", "realización", "realizacion",
                                 "aplicación", "aplicacion", "exposición", "exposicion",
                                 "motivación", "motivacion"}
        palabras = lower.split()
        if len(palabras) == 2 and palabras[0] in gerundios_estrategia and palabras[1] == "de":
            return True
        if len(palabras) == 3 and palabras[0] in gerundios_estrategia and palabras[1] == "del":
            return True
        return False

    @classmethod
    def _es_competencia(cls, contenido: str) -> bool:
        """Determina si un contenido es una competencia (no un tema de clase)."""
        lower = contenido.lower().strip()
        palabras = lower.split()
        if not palabras:
            return False
        # Si empieza con un verbo de competencia conocido
        primera = palabras[0].rstrip(",.:;")
        if primera in cls.VERBOS_COMPETENCIA:
            return True
        # Si la primera palabra es evidencia seguida de verbo de competencia
        if len(palabras) > 1:
            segunda = palabras[1].rstrip(",.:;")
            evidencias = {"mixto", "práctica", "practica", "informe", "caso", "examen"}
            if primera in evidencias and segunda in cls.VERBOS_COMPETENCIA:
                return True
        # Si tiene más de 3 verbos de competencia, es competencia
        verbos_encontrados = sum(1 for p in palabras if p.rstrip(",.:;") in cls.VERBOS_COMPETENCIA)
        if verbos_encontrados >= 3:
            return True
        # Patrones de competencia típicos
        if any(p in lower for p in ["principios éticos", "ética profesional", "competencias digitales",
                                      "responsabilidades y normas", "comprometerse con"]):
            return True
        return False

    @classmethod
    def _es_evidencia(cls, contenido: str) -> bool:
        """Determina si un contenido es una evidencia/instrumento de evaluación."""
        lower = contenido.lower().strip()
        # Palabras exactas que son evidencias puras
        evidencias_exactas = {"caso", "informe", "mixto", "práctica", "practica",
                              "examen", "parcial", "final", "foro", "tarea",
                              "proyecto", "exposición", "exposicion", "cuestionario",
                              "rúbrica", "rubrica", "participación", "participacion"}
        palabras = lower.split()
        if len(palabras) <= 2 and any(p in evidencias_exactas for p in palabras):
            return True
        # Si contiene frases de evidencia
        for kw in cls.EVIDENCIAS_KEYWORDS:
            if kw in lower:
                # PERO si también tiene contenido temático (más de 10 palabras y no solo evidencia)
                if len(contenido.split()) > 10:
                    return False
                return True
        return False

    @classmethod
    def _extraer_sesiones(cls, seccion_prog: str) -> List[Dict]:
        """
        Extrae sesiones/semanas de la programación académica.
        Estrategia robusta: dividir por unidad → buscar semanas → limpiar contaminación.
        """
        sesiones = []
        if not seccion_prog:
            return sesiones

        # Dividir por unidades para evitar contaminación cruzada
        bloques_unidad = cls._dividir_texto_por_unidades(seccion_prog)

        for num_unidad, bloque in bloques_unidad:
            sesiones_unidad = cls._extraer_semanas_de_bloque(bloque, num_unidad)
            sesiones.extend(sesiones_unidad)

        # Fallback global si no encontró nada por unidades
        if not sesiones:
            sesiones = cls._extraer_semanas_globales(seccion_prog)

        # Eliminar duplicados exactos (misma semana + mismo contenido)
        vistos = set()
        unicas = []
        for s in sesiones:
            key = (s["semana"], s["contenido"].lower().strip())
            if key not in vistos:
                vistos.add(key)
                unicas.append(s)
        sesiones = unicas

        # Filtrar sesiones que son estrategias didácticas o competencias
        sesiones = [
            s for s in sesiones
            if not cls._es_estrategia_didactica(s["contenido"])
            and not cls._es_competencia(s["contenido"])
        ]

        return sesiones

    @classmethod
    def _extraer_semanas_de_bloque(cls, bloque: str, num_unidad: int) -> List[Dict]:
        """Extrae semanas de un bloque de unidad individual."""
        semanas = []
        if not bloque:
            return semanas

        # Detectar si es una tabla con pipes y extraer columna contenidos
        if '|' in bloque:
            tabla = cls._extraer_tabla_programacion(bloque, num_unidad)
            if tabla:
                return tabla

        lineas = bloque.splitlines()
        semana_actual = None
        buffer = []

        for linea in lineas:
            linea_strip = linea.strip()
            if not linea_strip:
                continue

            # Detectar número de semana (01-16) en múltiples formatos
            m = None
            patrones_semana = [
                r'^0?(\d{1,2})$',                              # "01" o "1"
                r'^[Ss]emana\.?\s*(\d{1,2})',                   # "Semana 1"
                r'^(\d{1,2})[.\)]\s+',                          # "1. " o "1) "
                r'^(\d{1,2})\s*\|\s*',                          # "1 |" (tabla)
                r'^\|?\s*(\d{1,2})\s*\|',                        # "| 1 |" (tabla)
                r'^(\d{2})\s{2,}[A-ZÁÉÍÓÚÑ]',                    # "01  Contenido" (tabla espaciada)
            ]
            for patron in patrones_semana:
                m = re.match(patron, linea_strip)
                if m:
                    break

            if m:
                num = int(m.group(1))
                if 1 <= num <= 16:
                    if semana_actual is not None and buffer:
                        contenido = cls._limpiar_contenido_sesion(' '.join(buffer), num_unidad)
                        if contenido:
                            semanas.append({
                                "semana": str(semana_actual),
                                "semana_num": semana_actual,
                                "contenido": contenido
                            })
                    semana_actual = num
                    buffer = []

                    # Extraer contenido del RESTO de la línea (no perderlo con continue)
                    # Para el patrón de tabla espaciada, m.end() incluye la 1ra letra del contenido
                    # así que recalculamos quitando número + espacios
                    resto = linea_strip[m.end():].strip()
                    if re.match(r'^\d{2}\s{2,}', linea_strip):
                        resto = re.sub(r'^0?\d{1,2}\s{2,}', '', linea_strip)
                    if resto:
                        # Si tiene múltiples columnas (tabla con espacios), elegir la correcta
                        columnas = re.split(r'\s{2,}', resto)
                        if len(columnas) > 1:
                            for col in columnas:
                                col = col.strip()
                                if not col or len(col) < 5:
                                    continue
                                if cls._es_estrategia_didactica(col) or cls._es_evidencia(col) or cls._es_competencia(col):
                                    continue
                                buffer.append(col)
                                break
                        else:
                            limpio = re.sub(r'^[•\-\*\d]+[.\)]?\s*', '', resto)
                            if len(limpio) > 2:
                                buffer.append(limpio)
                    continue

            # Acumular contenido
            if semana_actual is not None:
                upper = linea_strip.upper()
                skip = any(k in upper for k in [
                    "TEÓRICAS", "PRÁCTICAS", "TOTAL", "HORAS", "ACTIVIDADES",
                    "CONTENIDOS", "ESTRATEGIAS", "DIDÁCTICAS", "DIDACTICAS", "EVIDENCIAS",
                    "INSTRUMENTOS", "EVALUACIÓN", "EVALUACION", "N°", "SEM.", "UNIDAD",
                    "BLOQUE", "OBJETIVOS", "METAS", "INDICADORES",
                    # Estrategias/evidencias comunes que contaminan
                    "DESARROLLO DE", "USO DE", "REALIZACIÓN DE", "REALIZACION DE",
                    "APLICACIÓN DEL", "APLICACION DEL", "EXPOSICIÓN", "EXPOSICION",
                    "CORREO", "CONSEJERÍA", "CONSEJERIA", "FOROS", "MOTIVACIÓN",
                    "MOTIVACION", "PREGUNTAS Y RECOMENDACIONES", "RÚBRICA DE",
                    "RUBRICA DE", "EXAMEN MIXTO", "EXAMEN PARCIAL", "EXAMEN FINAL",
                    "PRÁCTICA DE", "PRACTICA DE", "INFORME DE", "CASO DE",
                    "PARTICIPACIÓN", "PARTICIPACION", "PROYECTO DE", "CUESTIONARIO",
                    "MONOGRAFÍA", "MONOGRAFIA", "TAREA"
                ])
                if skip:
                    continue
                if 2 < len(linea_strip) < 180:
                    limpio = re.sub(r'^[•\-\*\d]+[.\)]?\s*', '', linea_strip)
                    if len(limpio) > 2:
                        buffer.append(limpio)

        # Guardar última
        if semana_actual is not None and buffer:
            contenido = cls._limpiar_contenido_sesion(' '.join(buffer), num_unidad)
            if contenido:
                semanas.append({
                    "semana": str(semana_actual),
                    "semana_num": semana_actual,
                    "contenido": contenido
                })

        # Si un bloque tiene >10 sesiones, probablemente es tabla corrupta → descartar
        if len(semanas) > 10:
            return []

        # Filtrar sesiones que son fragmentos cortos (< 20 chars o terminan en preposición)
        semanas = [s for s in semanas if cls._es_contenido_valido(s["contenido"])]

        # Si más del 60% de las sesiones del bloque son estrategias didácticas o competencias, descartar todo
        if semanas:
            basura = sum(1 for s in semanas if cls._es_estrategia_didactica(s["contenido"]) or cls._es_competencia(s["contenido"]))
            if basura / len(semanas) >= 0.6:
                return []

        return semanas

    @classmethod
    def _es_contenido_valido(cls, contenido: str) -> bool:
        """Rechaza fragmentos cortos, preposiciones sueltas o estrategias puras."""
        if not contenido or len(contenido) < 20:
            return False
        lower = contenido.lower().strip()
        # Rechazar si termina en preposición o artículo (fragmento incompleto)
        terminaciones_malas = {
            " de", " del", " la", " el", " los", " las", " en", " con", " por",
            " para", " a", " e", " y", " o", " u", " un", " una",
        }
        if any(lower.endswith(t) for t in terminaciones_malas):
            return False
        return True

    @classmethod
    def _extraer_tabla_programacion(cls, bloque: str, num_unidad: int) -> List[Dict]:
        """
        Extrae sesiones de tablas tipo:
        Semana | Contenidos | Estrategias Didácticas | Evidencias | Instrumentos
        """
        semanas = []
        lineas = bloque.splitlines()
        for linea in lineas:
            linea = linea.strip()
            if not linea:
                continue
            if '|' not in linea:
                continue
            # Descartar header de tabla
            upper = linea.upper()
            if any(k in upper for k in ["SEMANA", "CONTENIDOS", "ESTRATEGIAS", "DIDÁCTICAS", "DIDACTICAS", "EVIDENCIAS", "INSTRUMENTOS"]):
                continue
            partes = [p.strip() for p in linea.split('|')]
            # Eliminar celdas vacías de extremos
            partes = [p for p in partes if p]
            if not partes:
                continue
            # Buscar número de semana en primera celda
            m = re.match(r'0?(\d{1,2})', partes[0])
            if not m:
                continue
            num = int(m.group(1))
            if not (1 <= num <= 16):
                continue
            # Extraer columna de contenidos (segunda celda, o tercera si primera es semana)
            contenido = ""
            if len(partes) >= 2:
                contenido = partes[1]
            if not contenido and len(partes) >= 3:
                contenido = partes[2]
            if not contenido:
                continue
            # Limpiar
            contenido = re.sub(r'^[•\-\*]+\s*', '', contenido)
            contenido = cls._limpiar_contenido_sesion(contenido, num_unidad)
            if contenido:
                semanas.append({
                    "semana": str(num),
                    "semana_num": num,
                    "contenido": contenido
                })
        return semanas

    @classmethod
    def _limpiar_contenido_sesion(cls, contenido: str, num_unidad: int = 0) -> str:
        """Limpia contenido de sesión: corta contaminación de otras unidades, evaluación, estrategias, etc."""
        if not contenido:
            return ""

        # 0. Quitar prefijos de evidencia del inicio (ej: "mixto Analiza...")
        contenido = re.sub(r'^\s*(mixto|práctica|practica|informe|caso|examen|parcial|final|rúbrica|rubrica)\s+', '', contenido, flags=re.IGNORECASE)

        # 0.5. Si es estrategia didáctica, evidencia pura o competencia, descartar
        if cls._es_estrategia_didactica(contenido) or cls._es_evidencia(contenido) or cls._es_competencia(contenido):
            return ""

        # 1. Intentar separar columnas de tabla concatenadas (2+ espacios = delimitador de columna)
        columnas = re.split(r'\s{2,}', contenido)
        if len(columnas) > 1:
            # Buscar la primera columna que NO sea estrategia/evidencia/competencia
            for col in columnas:
                col = col.strip()
                if not col:
                    continue
                if cls._es_estrategia_didactica(col) or cls._es_evidencia(col) or cls._es_competencia(col):
                    continue
                if len(col) >= 10:
                    contenido = col
                    break

        # 2. Cortar si menciona otra unidad (no la propia)
        otros_map = {1: [r'(?:II|III)\s+UNIDAD', r'UNIDAD\s+(?:II|III)'],
                     2: [r'(?:I|III)\s+UNIDAD', r'UNIDAD\s+(?:I|III)'],
                     3: [r'(?:I|II)\s+UNIDAD', r'UNIDAD\s+(?:I|II)']}
        patrones = otros_map.get(num_unidad, [r'(?:I|II|III)\s+UNIDAD', r'UNIDAD\s+(?:I|II|III)'])
        for patron in patrones:
            m = re.search(patron, contenido, re.IGNORECASE)
            if m and m.start() > 20:
                contenido = contenido[:m.start()].strip()

        # 3. Cortar si menciona sección de evaluación
        m = re.search(r'(?:Rúbrica|Rubrica)\s+de\s+evaluación', contenido, re.IGNORECASE)
        if m and m.start() > 20:
            contenido = contenido[:m.start()].strip()

        m = re.search(r'(?:Examen\s+(?:mixto|parcial|final)|EXAMEN\s+MIXTO|EXAMEN\s+PARCIAL)', contenido, re.IGNORECASE)
        if m and m.start() > 20:
            contenido = contenido[:m.start()].strip()

        # 4. Quitar keywords de evaluación al final
        contenido = re.sub(r'\s+(?:Rúbrica|Rubrica|Instrumentos|Indicadores|Evaluación)\s+de\s+.*$', '', contenido, flags=re.IGNORECASE)
        contenido = re.sub(r'\s+(?:Examen|Práctica|Informe|Foro)\s+.*$', '', contenido, flags=re.IGNORECASE)

        # 5. Split por delimitadores de estrategia/evidencia conocidos y quedarse con la primera parte
        delimitadores = [
            r'(?:^|\s+)Desarrollo\s+de\s+(?:casos|la\s+clase)', r'(?:^|\s+)Uso\s+de\s+(?:plataformas|tecnologías)',
            r'(?:^|\s+)Realización\s+de\s+(?:foros|prácticas)', r'(?:^|\s+)Aplicación\s+del\s+tema',
            r'(?:^|\s+)Exposición\s+docente', r'(?:^|\s+)Motivación\s+', r'(?:^|\s+)Consejería\s+académica',
            r'(?:^|\s+)Correo\s+', r'(?:^|\s+)Preguntas\s+y\s+recomendaciones',
            r'(?:^|\s+)Desarrollo\s+de', r'(?:^|\s+)Uso\s+de', r'(?:^|\s+)Realización\s+de',
            r'(?:^|\s+)Exposición\s+', r'(?:^|\s+)Motivación\s+',
        ]
        for delim in delimitadores:
            m = re.search(delim, contenido, re.IGNORECASE)
            if m and m.start() > 10:
                contenido = contenido[:m.start()].strip()
            # Si el contenido EMPIEZA con la estrategia, descartar todo
            elif m and m.start() == 0:
                return ""

        # 6. Limitar longitud razonable (cortar en oración completa)
        if len(contenido) > 250:
            last_period = contenido.rfind('.', 50, 250)
            if last_period > 50:
                contenido = contenido[:last_period + 1]
            else:
                contenido = contenido[:250]

        # 7. Rechazar si quedó muy corto o es fragmento
        if not cls._es_contenido_valido(contenido):
            return ""

        # 8. Revisar de nuevo si quedó como estrategia o evidencia tras cortes
        if cls._es_estrategia_didactica(contenido) or cls._es_evidencia(contenido):
            return ""

        return contenido.strip()

    @classmethod
    def _extraer_semanas_globales(cls, seccion_prog: str) -> List[Dict]:
        """Fallback: busca semanas en todo el texto sin dividir por unidad."""
        sesiones = []
        # Buscar "Semana X: contenido"
        for m in re.finditer(r'[Ss]emana\s+(\d+)[.:\-]?\s*([^\.\n]{3,100})', seccion_prog):
            semana_num = int(m.group(1))
            contenido = cls._limpiar_contenido_sesion(m.group(2).strip(), num_unidad=0)
            if contenido and cls._es_contenido_valido(contenido):
                sesiones.append({
                    "semana": str(semana_num),
                    "semana_num": semana_num,
                    "contenido": contenido
                })
        if sesiones:
            return sesiones
        # Buscar "X. Tema de la semana"
        for m in re.finditer(r'(?:^|\n)\s*(\d{1,2})\s*[.\)]\s+([A-ZÁÉÍÓÚÑ][^\.\n]{3,200})', seccion_prog):
            semana_num = int(m.group(1))
            contenido = cls._limpiar_contenido_sesion(m.group(2).strip(), num_unidad=0)
            if contenido and cls._es_contenido_valido(contenido):
                sesiones.append({
                    "semana": str(semana_num),
                    "semana_num": semana_num,
                    "contenido": contenido
                })
        return sesiones

    @classmethod
    def _extraer_reglas(cls, texto: str) -> Dict:
        reglas = {"asistencia_minima": 70, "redondeo": "", "inhabilitacion_umbral": 30}

        m = re.search(r"m[aá]s\s+del\s+(\d+)%\s+de\s+inasistencia", texto, re.IGNORECASE)
        if m:
            inhabilitacion = int(m.group(1))
            reglas["inhabilitacion_umbral"] = inhabilitacion
            reglas["asistencia_minima"] = 100 - inhabilitacion

        m = re.search(r"medio\s+punto\s*\(?0?\.5\)?\s+favorece", texto, re.IGNORECASE)
        if m:
            reglas["redondeo"] = "Medio punto (0.5) favorece al estudiante"

        return reglas

    @classmethod
    def _corregir(cls, data: Dict, curso_esperado: str, periodo_esperado: str) -> Dict:
        """Correcciones finales usando metadata del curso esperado."""
        # Código fallback → extraer de curso_esperado
        codigo = data.get("codigo_curso", "").strip()
        if not codigo or codigo in {"0000", "9999", "", "N/A"}:
            if curso_esperado:
                m = re.search(r'(\d{3,5})', curso_esperado)
                if m:
                    data["codigo_curso"] = m.group(1)

        # Nombre genérico → extraer de curso_esperado
        nombre = data.get("nombre_curso", "").strip()
        if not nombre or nombre.upper() in {"LA EXPERIENCIA CURRICULAR", "EXPERIENCIA CURRICULAR", "CURSO", "ASIGNATURA", ""}:
            if curso_esperado:
                nombre_limpio = re.sub(r'^\d{3,5}\s*[-–]?\s*', '', curso_esperado).strip()
                if nombre_limpio and len(nombre_limpio) > 3:
                    data["nombre_curso"] = nombre_limpio

        # Periodo vacío → usar periodo esperado
        periodo = data.get("periodo", "").strip()
        if not periodo and periodo_esperado:
            data["periodo"] = periodo_esperado

        # Nota fuera de rango
        nota = data.get("nota_aprobatoria", 14)
        if nota < 10 or nota > 20:
            data["nota_aprobatoria"] = 14

        return data

    @classmethod
    def _calcular_score(cls, data: Dict, texto: str, curso_ref: str, periodo_ref: str) -> Tuple[int, Dict]:
        score = 0
        coincidencias = {
            "curso": False,
            "codigo": False,
            "periodo": "DESCONOCIDO",
            "estructura": False,
            "legibilidad": True
        }

        # 1. Código (25 pts)
        codigo = data.get("codigo_curso", "").strip()
        if codigo and re.match(r"^\d{3,5}$", codigo) and codigo not in {"0000", "9999", "", "N/A"}:
            score += 25
            coincidencias["codigo"] = True

        # 2. Nombre (25 pts)
        nombre = data.get("nombre_curso", "").strip().upper()
        if nombre and nombre not in {"LA EXPERIENCIA CURRICULAR", "EXPERIENCIA CURRICULAR", "CURSO", "ASIGNATURA", ""} and len(nombre) > 3:
            if curso_ref:
                curso_ref_upper = curso_ref.upper()
                if curso_ref_upper in nombre or nombre in curso_ref_upper:
                    score += 25
                    coincidencias["curso"] = True
                else:
                    palabras_ref = {w for w in re.findall(r'[A-ZÁÉÍÓÚÑ]{4,}', curso_ref_upper)}
                    palabras_ext = {w for w in re.findall(r'[A-ZÁÉÍÓÚÑ]{4,}', nombre)}
                    if palabras_ref and palabras_ext:
                        interseccion = palabras_ref.intersection(palabras_ext)
                        if len(interseccion) >= 2:
                            score += 20
                            coincidencias["curso"] = True
                        elif len(interseccion) == 1:
                            score += 10
                            coincidencias["curso"] = True
                        else:
                            score += 5
                    else:
                        score += 5
            else:
                score += 15

        # 3. Periodo (15 pts)
        periodo = data.get("periodo", "").strip()
        if periodo and re.match(r"^\d{4}-[IV12]+$", periodo):
            if periodo_ref and periodo_ref in periodo:
                score += 15
                coincidencias["periodo"] = "ACTUAL"
            else:
                score += 8
                coincidencias["periodo"] = "NO_COINCIDE"

        # 4. Fórmulas (20 pts) — más granular para reflejar calidad de extracción
        formulas = data.get("formulas", {})
        formula_count = sum(1 for k in ["PU1", "PU2", "PU3", "PP"] if formulas.get(k))
        if formula_count >= 4:
            score += 20
            coincidencias["estructura"] = True
        elif formula_count >= 2:
            score += 15
            coincidencias["estructura"] = True
        elif formula_count >= 1:
            score += 8

        # 5. Evidencias (10 pts)
        ev_count = len(data.get("evidencias", {}))
        if ev_count >= 3:
            score += 10
        elif ev_count >= 1:
            score += 5

        # 6. Docente (5 pts)
        docente = data.get("docente", "").strip()
        if docente and len(docente) > 5 and "UNIVERSIDAD" not in docente.upper() and "NACIONAL" not in docente.upper():
            score += 5

        # 7. Legibilidad (5 pts)
        if len(texto) > 500:
            score += 5

        return min(score, 100), coincidencias

    @classmethod
    def _extraer_tabla_programacion_completa(cls, seccion_prog: str) -> Dict:
        """
        Extrae datos de tabla multicolumna de programación académica UNT.
        Columnas típicas: Capacidades, Resultados, Contenidos, Estrategias, Evidencias, Instrumentos, Semana, Nivel de Logro.
        Retorna: {"capacidades": [], "resultados": [], "sesiones": [], "metodologia": [], "evidencias_tabla": [], "niveles_logro": []}
        """
        resultado = {"capacidades": [], "resultados": [], "sesiones": [], "metodologia": [], "evidencias_tabla": [], "niveles_logro": []}
        if not seccion_prog or len(seccion_prog) < 100:
            return resultado

        # Detectar si es tabla multicolumna buscando headers
        headers_tabla = ["capacidades", "resultados de aprendizaje", "contenidos", "estrategias",
                          "evidencias", "instrumentos", "semana"]
        texto_lower = seccion_prog.lower()
        coincidencias_header = sum(1 for h in headers_tabla if h in texto_lower)
        es_tabla = coincidencias_header >= 3  # Reducido de 4 a 3 para ser más flexible

        if not es_tabla:
            return resultado

        # Dividir por unidades para procesar cada bloque
        bloques_unidad = cls._dividir_texto_por_unidades(seccion_prog)

        for num_unidad, bloque in bloques_unidad:
            # Buscar contenidos numerados en el bloque
            # Patrón: número. Tema de contenido (que NO sea estrategia)
            items_contenido = []
            for m in re.finditer(r'(?:^|\n)\s*(\d+)\s*[.\)]\s+([A-ZÁÉÍÓÚÑ][^\n]{5,200})', bloque):
                num_item = int(m.group(1))
                texto_item = m.group(2).strip()
                # Limpiar y validar
                limpio = cls._limpiar_contenido_sesion(texto_item, num_unidad)
                if limpio and cls._es_contenido_valido(limpio):
                    items_contenido.append((num_item, limpio))

            # Buscar semanas en el bloque y detectar si alguna celda contiene "EXAMEN PARCIAL"
            semanas_bloque = []
            semana_examen = None
            examen_como_celda = False  # True si "EXAMEN PARCIAL" reemplaza el número de semana
            
            # Analizar líneas para detectar patrones de semana
            for linea in bloque.splitlines():
                linea = linea.strip()
                if not linea:
                    continue
                
                # Detectar si la línea contiene "EXAMEN PARCIAL" como celda independiente
                if re.search(r'^(?:examen\s+parcial|EP|examen\s+mixto)$', linea, re.IGNORECASE):
                    # Esta es una celda de semana que contiene examen parcial (reemplaza el número)
                    examen_como_celda = True
                    # Inferir el número de semana basándonos en el contexto
                    if semanas_bloque:
                        semana_examen = max(semanas_bloque) + 1
                        if semana_examen <= 16:
                            resultado["limites_unidades"] = resultado.get("limites_unidades", {})
                            resultado["limites_unidades"][num_unidad] = semana_examen
                    continue
                
                # Patrón 1: números de dos dígitos (01-16) al inicio o fin de línea
                m_inicio = re.match(r'^(0[1-9]|1[0-6])\b', linea)
                if m_inicio:
                    sem = int(m_inicio.group(1))
                    if 1 <= sem <= 16:
                        semanas_bloque.append(sem)
                        continue
                
                m_fin = re.search(r'\b(0[1-9]|1[0-6])\s*$', linea)
                if m_fin:
                    sem = int(m_fin.group(1))
                    if 1 <= sem <= 16:
                        semanas_bloque.append(sem)
                        continue
                
                # Patrón 2: "Semana X"
                m_semana = re.search(r'[Ss]emana\s+(\d{1,2})', linea)
                if m_semana:
                    sem = int(m_semana.group(1))
                    if 1 <= sem <= 16:
                        semanas_bloque.append(sem)
                        continue

            semanas_bloque = sorted(list(set(semanas_bloque)))

            # Si el examen es una celda separada, excluir esa semana de las disponibles
            # Si el examen es contenido de una semana con número, incluir la semana
            if examen_como_celda and semana_examen:
                # Excluir la semana del examen de las disponibles para contenido
                semanas_disponibles = [s for s in semanas_bloque if s != semana_examen]
            else:
                # El examen es contenido, incluir todas las semanas
                semanas_disponibles = semanas_bloque

            # Asignar contenidos a semanas
            if items_contenido and semanas_disponibles:
                # Si hay igual o menos contenidos que semanas disponibles, asignar 1:1
                n = min(len(items_contenido), len(semanas_disponibles))
                for i in range(n):
                    resultado["sesiones"].append({
                        "semana": str(semanas_disponibles[i]),
                        "semana_num": semanas_disponibles[i],
                        "contenido": items_contenido[i][1],
                        "unidad": num_unidad,
                    })
                # Si hay más contenidos que semanas, asignar los restantes a la última semana disponible
                if len(items_contenido) > len(semanas_disponibles):
                    ultima_sem = semanas_disponibles[-1] if semanas_disponibles else 1
                    for i in range(len(semanas_disponibles), len(items_contenido)):
                        resultado["sesiones"].append({
                            "semana": str(ultima_sem),
                            "semana_num": ultima_sem,
                            "contenido": items_contenido[i][1],
                            "unidad": num_unidad,
                        })
            elif items_contenido:
                # Sin semanas encontradas: asignar secuencialmente a las semanas default de la unidad
                sem_default_start = {1: 1, 2: 7, 3: 12}.get(num_unidad, 1)
                for idx, (_, contenido) in enumerate(items_contenido):
                    sem = sem_default_start + idx
                    if sem <= 16:
                        resultado["sesiones"].append({
                            "semana": str(sem),
                            "semana_num": sem,
                            "contenido": contenido,
                            "unidad": num_unidad,
                        })

            # Si tiene examen parcial, marcar la semana del examen como límite de esta unidad
            # El examen parcial CUENTA como semana, por lo que el límite es la semana del examen
            if tiene_examen_parcial and semanas_bloque:
                # Buscar la semana específica asociada al examen parcial
                # Patrón 1: "Examen Parcial Semana X" o "EP Semana X" o "Examen Mixto Semana X"
                m_ep = re.search(r'(?:examen\s+parcial|EP|examen\s+mixto)\s+(?:semana\s*)?(\d{1,2})', bloque, re.IGNORECASE)
                if m_ep:
                    semana_ep = int(m_ep.group(1))
                    if 1 <= semana_ep <= 16:
                        # El examen parcial cuenta como semana, usarla como límite
                        resultado["limites_unidades"] = resultado.get("limites_unidades", {})
                        resultado["limites_unidades"][num_unidad] = semana_ep
                else:
                    # Patrón 2: "Semana X Examen Parcial" o similar
                    m_ep = re.search(r'(?:semana\s*)?(\d{1,2})\s*(?:examen\s+parcial|EP|examen\s+mixto)', bloque, re.IGNORECASE)
                    if m_ep:
                        semana_ep = int(m_ep.group(1))
                        if 1 <= semana_ep <= 16:
                            resultado["limites_unidades"] = resultado.get("limites_unidades", {})
                            resultado["limites_unidades"][num_unidad] = semana_ep
                    else:
                        # Patrón 3: buscar número cercano al examen parcial en la misma línea
                        for linea in bloque.splitlines():
                            if re.search(r'(?:examen\s+parcial|EP|examen\s+mixto)', linea, re.IGNORECASE):
                                # Buscar número en esta línea
                                m_num = re.search(r'\b(\d{1,2})\b', linea)
                                if m_num:
                                    semana_ep = int(m_num.group(1))
                                    if 1 <= semana_ep <= 16:
                                        resultado["limites_unidades"] = resultado.get("limites_unidades", {})
                                        resultado["limites_unidades"][num_unidad] = semana_ep
                                        break
                        else:
                            # Fallback: usar la semana máxima detectada
                            resultado["limites_unidades"] = resultado.get("limites_unidades", {})
                            resultado["limites_unidades"][num_unidad] = max(semanas_bloque)

            # Extraer capacidades: párrafos largos que empiezan con verbos de competencia
            lineas_bloque = [l.strip() for l in bloque.splitlines() if l.strip() and len(l.strip()) > 20]
            for linea in lineas_bloque:
                lower = linea.lower()
                # Capacidades: textos que empiezan con verbos de competencia y son descriptivos
                primeras = lower.split()[:2]
                if primeras and primeras[0] in cls.VERBOS_COMPETENCIA:
                    # No es estrategia ni evidencia
                    if not cls._es_estrategia_didactica(linea) and not cls._es_evidencia(linea):
                        if len(linea) > 30 and len(linea) < 300:
                            resultado["capacidades"].append({"texto": linea, "unidad": num_unidad})

            # Extraer resultados de aprendizaje: textos descriptivos que empiezan con verbos, más cortos que capacidades
            for linea in lineas_bloque:
                lower = linea.lower()
                palabras = lower.split()
                if len(palabras) >= 2 and palabras[0] in cls.VERBOS_COMPETENCIA:
                    if 30 < len(linea) < 150:
                        if not cls._es_estrategia_didactica(linea) and not cls._es_evidencia(linea):
                            # Es más corto que capacidades → probablemente resultado
                            if linea not in [c["texto"] for c in resultado["capacidades"]]:
                                resultado["resultados"].append({"texto": linea, "unidad": num_unidad})

            # Extraer metodología: estrategias didácticas (lista numerada)
            for m in re.finditer(r'(?:^|\n)\s*\d+\s*[.\)]\s+((?:Motivaci[oó]n|Exposici[oó]n|Desarrollo|Uso|Realizaci[oó]n|Aplicaci[oó]n|Para\s+aclarar|Consejer[ií]a)[^\n]{5,100})', bloque, re.IGNORECASE):
                estrategia = m.group(1).strip()
                if len(estrategia) > 10:
                    resultado["metodologia"].append(estrategia)

            # Extraer nivel de logro / indicadores por semana
            # Buscar patrones como "Nivel de logro: ..." o "Indicador: ..." o "Logra: ..."
            for m in re.finditer(r'(?:nivel\s+de\s+logro|indicador|logra)[:\s]+([^\n]{10,150})', bloque, re.IGNORECASE):
                nivel = m.group(1).strip()
                if len(nivel) > 15 and not cls._es_estrategia_didactica(nivel):
                    # Asociar a la semana correspondiente si existe
                    # Buscar semana cercana en el texto
                    texto_antes = bloque[:m.start()]
                    m_sem = re.search(r'[Ss]emana\s+(\d{1,2})|(\d{2})(?=\s|$)', texto_antes[-50:])
                    if m_sem:
                        sem = int(m_sem.group(1) if m_sem.group(1) else m_sem.group(2))
                        if 1 <= sem <= 16:
                            resultado["niveles_logro"].append({
                                "semana": sem,
                                "texto": nivel,
                                "unidad": num_unidad
                            })

        # Deduplicar
        resultado["capacidades"] = [dict(t) for t in {tuple(d.items()) for d in resultado["capacidades"]}]
        resultado["resultados"] = [dict(t) for t in {tuple(d.items()) for d in resultado["resultados"]}]

        return resultado


extract_unt = UntSyllabusExtractor.extraer
