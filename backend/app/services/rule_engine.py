from typing import Dict, Optional, Tuple
from app.config import Config
from app.database.models import Silabo, EstadoVerificacion

class RuleEngine:
    
    # Reglas precargadas del sílabo de Gestión de Servicios de TIC
    REGLAS_OFICIALES = {
        "U1": {
            "formula": "PU1 = (PFD + TAD + ELD*2) / 4",
            "evidencias": {"PFD": 1, "TAD": 1, "ELD": 2}
        },
        "U2": {
            "formula": "PU2 = (PFD + TAD*2 + ELD) / 4",
            "evidencias": {"PFD": 1, "TAD": 2, "ELD": 1}
        },
        "U3": {
            "formula": "PU3 = (PFD + TAD*2 + ELD) / 4",
            "evidencias": {"PFD": 1, "TAD": 2, "ELD": 2}
        },
        "PP": {
            "formula": "PP = (PU1 + PU2 + PU3) / 3",
            "nota_aprobatoria": 14,
            "redondeo": 0.5  # Medio punto favorece al estudiante
        }
    }

    @staticmethod
    def validar_acceso_calculos(silabo: Silabo) -> bool:
        """
        Regla 5 y 6: 
        - PENDIENTE_CONFIRMACION -> NO habilita cálculos
        - APROBADO o PUBLICADO -> SÍ habilita cálculos
        """
        if not silabo:
            return False
        
        # Solo si las reglas están validadas o el sílabo está aprobado/publicado
        if silabo.estado_validacion in [EstadoVerificacion.APROBADO, EstadoVerificacion.OFICIAL]:
            return True
        
        # Si es privado pero está validado por el sistema con score alto (APROBADO)
        return False

    @staticmethod
    def calcular_promedio_unidad(unidad: str, pfd: float, tad: float, eld: float, silabo: Optional[Silabo] = None) -> float:
        """Calcula PU1, PU2 o PU3 usando las reglas"""
        if silabo and not RuleEngine.validar_acceso_calculos(silabo):
            raise PermissionError("Cálculos deshabilitados: El sílabo aún no ha sido validado administrativamente.")

        reglas = RuleEngine.REGLAS_OFICIALES.get(unidad.upper())
        # En producción se cargarían de silabo.reglas_json si existe
        if silabo and silabo.reglas_json:
            # Lógica para usar reglas personalizadas del sílabo
            pass

        if not reglas:
            raise ValueError(f"Unidad desconocida: {unidad}")
        
        evidencias = reglas["evidencias"]
        numerador = (pfd * evidencias.get("PFD", 0) + 
                     tad * evidencias.get("TAD", 0) + 
                     eld * evidencias.get("ELD", 0))
        denominador = sum(evidencias.values())
        
        resultado = numerador / denominador
        return round(resultado, 2)
    
    @staticmethod
    def calcular_promedio_final(pu1: float, pu2: float, pu3: float) -> float:
        """Calcula el promedio promocional PP"""
        pp = (pu1 + pu2 + pu3) / 3
        return round(pp, 2)
    
    @staticmethod
    def aplicar_redondeo(nota: float) -> float:
        """Aplica la regla de medio punto a favor del estudiante"""
        if nota % 1 >= 0.5:
            return round(nota)
        return nota
    
    @staticmethod
    def evaluar_aprobacion(pp: float) -> Tuple[bool, str]:
        """Evalúa si aprueba según la nota mínima"""
        nota_aprobacion = Config.NOTA_APROBACION
        if pp >= nota_aprobacion:
            return True, f"APROBADO con {pp} (mínimo {nota_aprobacion})"
        return False, f"DESAPRUEBA con {pp} (mínimo {nota_aprobacion})"
    
    @staticmethod
    def calcular_nota_necesaria(pu1: float, pu2: float, objetivo: float = None) -> Dict:
        """Calcula nota necesaria en PU3 para alcanzar el objetivo"""
        if objetivo is None:
            objetivo = Config.NOTA_APROBACION
        
        suma_actual = pu1 + pu2
        necesita = (objetivo * 3) - suma_actual
        necesita = round(necesita, 2)
        
        maximo_posible = 20.0
        
        return {
            "necesita_en_pu3": max(0, necesita),
            "es_posible": necesita <= maximo_posible,
            "maximo_posible": maximo_posible,
            "minimo_requerido": 0 if necesita <= 0 else necesita
        }
    
    @staticmethod
    def evaluar_riesgo(pu1: Optional[float], pu2: Optional[float], pu3: Optional[float], silabo: Optional[Silabo] = None) -> Dict:
        """Evalúa el riesgo académico con reglas deterministas"""
        if silabo and not RuleEngine.validar_acceso_calculos(silabo):
            return {
                "nivel": "BLOQUEADO",
                "color": "🔒",
                "mensaje": "La evaluación de riesgo está deshabilitada hasta que el sílabo sea validado.",
                "recomendacion": "Espera la validación administrativa o usa un sílabo oficial."
            }

        # Caso 1: Solo PU1
        if pu1 is not None and pu2 is None and pu3 is None:
            if pu1 < Config.UMBRAL_RIESGO_ALTO:
                return {
                    "nivel": "ALTO",
                    "color": "🔴",
                    "mensaje": f"PU1 = {pu1} está muy bajo",
                    "recomendacion": "Asiste a tutoría inmediatamente. Revisa los TAD que tienen mayor peso."
                }
            elif pu1 < Config.UMBRAL_RIESGO_MEDIO:
                return {
                    "nivel": "MEDIO",
                    "color": "🟡",
                    "mensaje": f"PU1 = {pu1} necesita mejora",
                    "recomendacion": "Enfócate en U2 donde TAD pesa 2."
                }
            else:
                return {
                    "nivel": "BAJO",
                    "color": "🟢",
                    "mensaje": f"PU1 = {pu1} es buen inicio",
                    "recomendacion": "Mantén el ritmo."
                }
        
        # Caso 2: PU1 y PU2 conocidos
        if pu1 is not None and pu2 is None and pu3 is None:
            necesidad = RuleEngine.calcular_nota_necesaria(pu1, pu2)
            necesita = necesidad["necesita_en_pu3"]
            
            if necesita > 20:
                return {
                    "nivel": "MUY ALTO",
                    "color": "🔴🔴",
                    "mensaje": f"Necesitas {necesita} en PU3 - IMPOSIBLE",
                    "recomendacion": f"Considera aplazados. Tutoría: {Config.TUTORIA_DIA} {Config.TUTORIA_HORARIO}"
                }
            elif necesita > 15:
                return {
                    "nivel": "ALTO",
                    "color": "🔴",
                    "mensaje": f"Necesitas {necesita} en PU3",
                    "recomendacion": "Esfuérzate en U3. TAD y ELD tienen peso 2."
                }
            elif necesita > 11:
                return {
                    "nivel": "MEDIO",
                    "color": "🟡",
                    "mensaje": f"Necesitas {necesita} en PU3",
                    "recomendacion": "Concéntrate en evidencias de mayor peso."
                }
            else:
                return {
                    "nivel": "BAJO",
                    "color": "🟢",
                    "mensaje": f"Solo necesitas {necesita} en PU3",
                    "recomendacion": "Sigue así. Revisa la fórmula."
                }
        
        # Caso 3: Todas las notas
        if pu1 is not None and pu2 is not None and pu3 is not None:
            pp = RuleEngine.calcular_promedio_final(pu1, pu2, pu3)
            aprueba, _ = RuleEngine.evaluar_aprobacion(pp)
            
            if aprueba:
                return {
                    "nivel": "APROBADO",
                    "color": "✅",
                    "mensaje": f"Promedio final = {pp}",
                    "recomendacion": "¡Felicidades! No olvides asistencia >70%"
                }
            else:
                return {
                    "nivel": "DESAPRUEBA",
                    "color": "❌",
                    "mensaje": f"Promedio final = {pp} (mínimo {Config.NOTA_APROBACION})",
                    "recomendacion": f"Revisa opción de aplazados. Tutoría: {Config.TUTORIA_EMAIL}"
                }
        
        return {
            "nivel": "INCOMPLETO",
            "color": "❓",
            "mensaje": "Faltan notas para evaluar",
            "recomendacion": "Ingresa tus notas de PU1, PU2 y/o PU3"
        }
    
    @staticmethod
    def obtener_peso_evidencia(unidad: str, evidencia: str) -> Optional[int]:
        """Obtiene el peso de una evidencia en una unidad"""
        reglas = RuleEngine.REGLAS_OFICIALES.get(unidad.upper())
        if reglas:
            return reglas["evidencias"].get(evidencia.upper())
        return None
    
    @staticmethod
    def obtener_formula(unidad: str) -> Optional[str]:
        """Obtiene la fórmula de una unidad"""
        reglas = RuleEngine.REGLAS_OFICIALES.get(unidad.upper())
        return reglas["formula"] if reglas else None