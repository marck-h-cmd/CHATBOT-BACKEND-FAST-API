import re
import json
from typing import Dict, List, Optional, Tuple, Any
from app.config import Config

class EvaluationFormulaExtractor:
    """
    Service to extract, normalize, and validate academic evaluation formulas.
    Uses a multi-tiered pipeline:
    1) Structured table parsing
    2) Near-tag extraction
    3) Flexible regex matches
    4) LLM (ChatGPT) fallback as a last resort
    """

    @classmethod
    def detect_structure(cls, text: str) -> str:
        """
        Detects the layout structure of the evaluation section.
        """
        lines = text.splitlines()
        has_table_headers = any(re.search(r"\b(C[OÓ]DIGO|PESO|PRODUCTO|INSTRUMENTO|EVALUACI[OÓ]N)\b", line, re.IGNORECASE) for line in lines)
        has_separators = any("|" in line or "\t" in line for line in lines)
        
        # Check alignment of codes and weights (e.g. TC followed by percentage on next lines)
        code_weight_alignment = len(re.findall(r"\b[A-Z]{2,4}\b\s*\n\s*\d+%", text)) > 1

        if has_table_headers or has_separators or code_weight_alignment:
            return "table"
        
        # Check inline labels like TC: 40% or X1 = TC*0.4
        has_inline_labels = len(re.findall(r"\b[A-Z]{2,4}\s*[:=]\s*(?:0\.\d+|\d+%)", text)) > 1
        if has_inline_labels:
            return "inline_labels"
        
        # Fallback to noisy or free text
        if any(c in text for c in ["\uf0b7", "", ""]):
            return "ocr_noisy"
            
        return "free_text"

    @classmethod
    def clean_text(cls, text: str) -> str:
        """Cleans common PDF extraction artifacts."""
        # Replace non-breaking spaces and other bullet points
        text = text.replace("\xa0", " ")
        text = re.sub(r"[\uf0b7\u200b]", " ", text)
        text = re.sub(r"[ \t]+", " ", text)
        return text

    @classmethod
    def normalize_multiplication(cls, term: str) -> str:
        """
        Normalizes multiplication expressions:
        - TC(0.40) -> (TC*0.4)
        - 0.40 * TC -> (TC*0.4)
        - TC x 40% -> (TC*0.4)
        - 2(ELD) -> (ELD*2)
        - TC por 40% -> (TC*0.4)
        - doble(ELD) -> (ELD*2)
        """
        term = term.strip()
        
        # Translate equivalents of multiplication
        term = re.sub(r"\b(por|x|X|×)\b", "*", term)
        term = term.replace("×", "*")
        
        # Handle word multipliers
        term = re.sub(r"\bdoble\b", "2*", term, flags=re.IGNORECASE)
        term = re.sub(r"\btriple\b", "3*", term, flags=re.IGNORECASE)
        
        # Handle variable(weight) like TC(0.40)
        m = re.match(r"^([A-Z0-9_]+)\s*[\(\[]\s*(0\.\d+|\d+%\b|\d+)\s*[\)\]]$", term, re.IGNORECASE)
        if m:
            var, weight = m.group(1), m.group(2)
            return f"({var.upper()}*{cls.normalize_weight_val(weight)})"

        # Handle weight(variable) like 0.40(TC) or 2(ELD)
        m = re.match(r"^(0\.\d+|\d+%\b|\d+)\s*[\(\[]\s*([A-Z0-9_]+)\s*[\)\]]$", term, re.IGNORECASE)
        if m:
            weight, var = m.group(1), m.group(2)
            # If weight is integer like 2, output (VAR*2)
            if weight.isdigit():
                return f"({var.upper()}*{weight})"
            return f"({var.upper()}*{cls.normalize_weight_val(weight)})"

        # Handle explicit multiplication like TC*0.40 or 0.40*TC
        m = re.match(r"^([A-Z0-9_]+)\s*\*\s*(0\.\d+|\d+%\b|\d+)$", term, re.IGNORECASE)
        if m:
            var, weight = m.group(1), m.group(2)
            return f"({var.upper()}*{cls.normalize_weight_val(weight)})"
            
        m = re.match(r"^(0\.\d+|\d+%\b|\d+)\s*\*\s*([A-Z0-9_]+)$", term, re.IGNORECASE)
        if m:
            weight, var = m.group(1), m.group(2)
            if weight.isdigit():
                return f"({var.upper()}*{weight})"
            return f"({var.upper()}*{cls.normalize_weight_val(weight)})"
            
        # Handle simple juxtaposition like 0.40 TC or 40% TC
        m = re.match(r"^(0\.\d+|\d+%\b|\d+)\s+([A-Z0-9_]+)$", term, re.IGNORECASE)
        if m:
            weight, var = m.group(1), m.group(2)
            if weight.isdigit():
                return f"({var.upper()}*{weight})"
            return f"({var.upper()}*{cls.normalize_weight_val(weight)})"

        m = re.match(r"^([A-Z0-9_]+)\s+(0\.\d+|\d+%\b|\d+)$", term, re.IGNORECASE)
        if m:
            var, weight = m.group(1), m.group(2)
            return f"({var.upper()}*{cls.normalize_weight_val(weight)})"

        # If it's just a variable
        if re.match(r"^[A-Z0-9_]+$", term, re.IGNORECASE):
            return term.upper()
            
        return term

    @classmethod
    def normalize_weight_val(cls, weight_str: str) -> str:
        """Converts weights (e.g. 40%, 0.40, .4) to standard string decimal."""
        weight_str = weight_str.strip()
        if weight_str.endswith("%"):
            try:
                val = float(weight_str.replace("%", "")) / 100.0
                return f"{val:.4g}"
            except ValueError:
                return "1"
        try:
            val = float(weight_str)
            return f"{val:.4g}"
        except ValueError:
            return "1"

    @classmethod
    def normalize_division_and_average(cls, formula: str) -> str:
        """
        Translates divisions and averages:
        - "todo sobre 4" -> /4
        - "dividido entre 3" -> /3
        - "entre 2" -> /2
        - "promedio de A, B, C" -> ((A*1)+(B*1)+(C*1))/3
        """
        formula = re.sub(r"\b(dividido\s+)?entre\s+(\d+)\b", r"/\2", formula, flags=re.IGNORECASE)
        formula = re.sub(r"\btodo\s+sobre\s+(\d+)\b", r"/\1", formula, flags=re.IGNORECASE)
        
        # Translate natural language promedios
        m = re.search(r"promedio\s+de\s+([A-Z0-9_,\s+y]+)", formula, re.IGNORECASE)
        if m:
            vars_part = m.group(1)
            # Find all variable-like tokens
            vars_found = re.findall(r"\b[A-Z0-9_]+\b", vars_part.upper())
            # Clean variables
            vars_found = [v for v in vars_found if v not in ["Y", "O", "DE", "LA", "EL"]]
            if vars_found:
                terms = "+".join(f"({v}*1)" for v in vars_found)
                formula = f"({terms})/{len(vars_found)}"
                
        return formula

    @classmethod
    def canonicalize_expression(cls, expr: str) -> str:
        """
        Takes a raw expression like "TC(0.40)+IRS(0.15)+IIF(0.15)+EU(0.30)"
        and converts it to canonical representation: "((TC*0.4)+(IRS*0.15)+(IIF*0.15)+(EU*0.3))"
        """
        expr = cls.clean_text(expr).strip()
        expr = cls.normalize_division_and_average(expr)
        
        # Translate equivalents of multiplication first (before stripping spaces)
        expr = re.sub(r"\b(por|x|X|×)\b", "*", expr, flags=re.IGNORECASE)
        expr = expr.replace("×", "*")
        expr = re.sub(r"\bdoble\b", "2*", expr, flags=re.IGNORECASE)
        expr = re.sub(r"\btriple\b", "3*", expr, flags=re.IGNORECASE)
        
        # Strip all remaining spaces and newlines
        expr = re.sub(r"\s+", "", expr)
        
        # Check if there is a division at the end
        division_match = re.search(r"\/(\d+)$", expr)
        divisor = int(division_match.group(1)) if division_match else None
        if divisor:
            expr = expr[:division_match.start()].strip()
            
        # Strip outer parentheses
        while expr.startswith("(") and expr.endswith(")"):
            # Check if balanced
            depth = 0
            is_balanced = True
            for i, char in enumerate(expr[:-1]):
                if char == "(":
                    depth += 1
                elif char == ")":
                    depth -= 1
                if depth == 0 and i > 0:
                    is_balanced = False
                    break
            if is_balanced:
                expr = expr[1:-1].strip()
            else:
                break

        # Split terms by + (taking into account parentheses)
        terms = []
        current_term = []
        depth = 0
        for char in expr:
            if char == "(":
                depth += 1
                current_term.append(char)
            elif char == ")":
                depth -= 1
                current_term.append(char)
            elif char == "+" and depth == 0:
                terms.append("".join(current_term).strip())
                current_term = []
            else:
                current_term.append(char)
        if current_term:
            terms.append("".join(current_term).strip())

        normalized_terms = []
        for term in terms:
            if not term:
                continue
            normalized_terms.append(cls.normalize_multiplication(term))
            
        # Rebuild canonical form
        # Format: ((TERM1)+(TERM2)+...)
        joined_terms = "+".join(normalized_terms)
        canonical = f"({joined_terms})"
        
        if divisor:
            canonical = f"{canonical}/{divisor}"
            
        return canonical

    @classmethod
    def run_stage_1_table(cls, text: str) -> Tuple[Dict[str, float], List[str]]:
        """
        Stage 1: Extract component-weight mapping from structured tables/aligned rows.
        Returns (weights, evidence_spans).
        """
        weights = {}
        spans = []
        
        # Clean text first
        text = cls.clean_text(text)
        
        # Find matches of code (2-4 uppercase letters) followed closely by a percentage or decimal
        # We search line by line or globally.
        lines = text.splitlines()
        for idx, line in enumerate(lines):
            # Pattern A: Code and percentage on the same line (e.g. "TC 40%", "TC | 40%", "TC: 40%")
            m = re.search(r"\b([A-Z]{2,4})\b\s*[:\|\-t\s]*\s*(\d+)%", line)
            if m:
                code, pct = m.group(1), m.group(2)
                if code not in ["PESO", "UNID", "NOTA", "EVAL", "CUES", "RSU", "IIF", "IRS", "TC", "EU", "EP", "EF", "ELD", "PFD", "TAD"] and code.lower() in ["si", "no", "del", "con", "por", "las", "los"]:
                    continue
                weights[code.upper()] = float(pct) / 100.0
                spans.append(m.group(0))
                continue
            
            # Pattern B: Code on line, percentage on next line (common in broken OCR tables)
            m_code = re.match(r"^\s*([A-Z]{2,4})\s*$", line)
            if m_code and idx + 1 < len(lines):
                next_line = lines[idx + 1].strip()
                m_pct = re.match(r"^(\d+)%$", next_line)
                if m_pct:
                    code = m_code.group(1)
                    weights[code.upper()] = float(m_pct.group(1)) / 100.0
                    spans.append(f"{code}\n{next_line}")
                    continue
                    
        return weights, spans

    @classmethod
    def run_stage_2_tags(cls, text: str) -> Dict[str, str]:
        """
        Stage 2: Parse formulas near explicit tags/labels (X1, X2, X3, PU1, PU2, PP, XF, etc.)
        Uses a robust lookahead to capture multiline split formulas.
        """
        formulas = {}
        text = cls.clean_text(text)
        
        # Target keys
        keys_map = {
            "PU1": [r"X1\s*=", r"PU1\s*=", r"PRIMERA\s+UNIDAD\s*\(X1\)\s*\n*X1\s*="],
            "PU2": [r"X2\s*=", r"PU2\s*=", r"SEGUNDA\s+UNIDAD\s*\(X2\)\s*\n*X2\s*="],
            "PU3": [r"X3\s*=", r"PU3\s*=", r"TERCERA\s+UNIDAD\s*\(X3\)\s*\n*X3\s*="],
            "PP": [r"XF\s*=", r"PP\s*=", r"PF\s*=", r"FINAL\s*\(XF\)\s*\n*XF\s*="]
        }
        
        # Lookahead boundary (stops matching when encountering another formula tag or section title)
        boundary = r"(?=(?:\b(?:X1|X2|X3|XF|PU1|PU2|PU3|PP|PF)\s*=|Criterios|Nivel|Universidad|VI\.|VII\.|SISTEMA|Reglamento|$))"
        
        for std_key, patterns in keys_map.items():
            for pat in patterns:
                m = re.search(pat + r"\s*([\s\S]+?)" + boundary, text, re.IGNORECASE)
                if m:
                    formula_candidate = m.group(1).strip()
                    # Clean up lines and whitespaces
                    lines_cand = [line.strip() for line in formula_candidate.splitlines() if line.strip()]
                    formula_str = "".join(lines_cand)
                    # Strip any spaces inside the formula
                    formula_str = re.sub(r"\s+", "", formula_str)
                    
                    if len(formula_str) > 2:
                        formulas[std_key] = formula_str
                        break
                        
        return formulas

    @classmethod
    def run_stage_3_regex(cls, text: str) -> Dict[str, str]:
        """
        Stage 3: Extract equations using generic regex matching for expressions.
        """
        formulas = {}
        text = cls.clean_text(text)
        
        # Match equations of type X1 = ...
        matches = re.findall(r"\b(X1|X2|X3|XF|PU1|PU2|PU3|PP|PF)\s*=\s*([A-Za-z0-9_.\s\+\-\*\/\(\)\%]+)", text)
        for lhs, rhs in matches:
            key = lhs.upper()
            # Map keys to standard ones
            std_key = "PU1" if key in ["X1", "PU1"] else \
                      "PU2" if key in ["X2", "PU2"] else \
                      "PU3" if key in ["X3", "PU3"] else \
                      "PP" if key in ["XF", "PP", "PF"] else key
            
            # Simple clean up of RHS
            rhs_clean = rhs.strip()
            # If it's a page number or nonsense, discard
            if rhs_clean and len(rhs_clean) > 3:
                formulas[std_key] = rhs_clean
                
        return formulas

    @classmethod
    def run_stage_4_llm(cls, text: str) -> Dict[str, Any]:
        """
        Stage 4: Fallback parser using OpenAI (ChatGPT) to solve complex structure extraction.
        """
        # Ensure we have client configured
        if not Config.PRIMARY_AI_API_KEY:
            print("⚠️ OpenAI API Key not configured. LLM fallback skipped.")
            return {}
            
        try:
            from openai import OpenAI
            client = OpenAI(api_key=Config.PRIMARY_AI_API_KEY, base_url=Config.PRIMARY_AI_BASE_URL)
            
            system_prompt = """
Eres un asistente experto en análisis y extracción de fórmulas de evaluación académica en sílabos universitarios.
Tu objetivo es analizar el texto provisto y extraer la estructura de evaluación académica exacta en formato JSON.

Sigue estas directrices estrictas:
1. Identifica los componentes de evaluación (ej. TC, IRS, IIF, EU).
2. Identifica las fórmulas de evaluación para cada unidad (PU1, PU2, PU3 o equivalentes) y el promedio final (PP).
3. Normaliza las fórmulas a una representación canónica matemática.
   - La representación canónica de multiplicación es (VARIABLE*PESO).
   - Combínalas con signos más y agrúpalas en paréntesis, ej: ((TC*0.4)+(IRS*0.15)+(IIF*0.15)+(EU*0.3))
   - Si la fórmula tiene división, ej: ((A*1)+(B*1)+(C*1))/3
4. Si no hay pesos explícitos, asume pesos iguales solo si el texto no lo contradice, no especifica pesos diferenciados y los componentes están identificados.
5. Si encuentras contradicciones o ambigüedades, marca requires_review = true.

Tu salida debe ser ÚNICAMENTE un objeto JSON válido que contenga estas llaves:
{
  "detected_structure": "table" | "inline_labels" | "ocr_noisy" | "free_text",
  "formulas_found": { "PU1": "raw_formula", "PP": "raw_formula" },
  "normalized_formulas": { "PU1": "canonical_formula", "PP": "canonical_formula" },
  "components": ["TC", "IRS", "IIF", "EU"],
  "inferred_weights": { "TC": 0.40, "IRS": 0.15, "IIF": 0.15, "EU": 0.30 },
  "assumptions": ["descripción de supuestos"],
  "evidence_spans": ["fragmento exacto de texto"],
  "conflicts_found": ["descripción de conflictos si los hay"],
  "field_confidence": {
     "formula": 0-100,
     "weights": 0-100,
     "grading_rules": 0-100
  },
  "overall_confidence": 0-100,
  "requires_review": true | false,
  "review_reason": "razón del review" | null
}
NUNCA agregues explicaciones, markdown ```json o texto fuera del JSON.
"""
            user_prompt = f"Analiza esta sección de evaluación y genera la salida JSON:\n\n{text}"
            
            response = client.chat.completions.create(
                model=Config.PRIMARY_AI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=2048
            )
            
            content = response.choices[0].message.content.strip()
            # Clean markdown code blocks if any
            if content.startswith("```"):
                content = re.sub(r"^```(?:json)?\s*", "", content)
                content = re.sub(r"\s*```$", "", content)
                
            return json.loads(content)
        except Exception as e:
            print(f"⚠️ OpenAI fallback failed: {e}")
            return {}

    @classmethod
    def extract_and_normalize(cls, raw_text: str, course_name: str = "") -> Dict[str, Any]:
        """
        Main extraction pipeline.
        Runs structure detection -> tiered extraction -> validation -> confidence scoring.
        """
        # Clean text
        text = cls.clean_text(raw_text)
        
        # Detect structure
        detected_structure = cls.detect_structure(text)
        
        # Extract weights (Stage 1)
        weights, evidence_spans = cls.run_stage_1_table(text)
        
        # Extract formulas (Stage 2)
        formulas = cls.run_stage_2_tags(text)
        
        # Extract formulas (Stage 3 - Fallback/complement)
        if not formulas:
            formulas = cls.run_stage_3_regex(text)
            
        extraction_method = "regex" if formulas else "table"
        if evidence_spans and not formulas:
            extraction_method = "table"
        elif formulas:
            extraction_method = "tags"
            
        # Try to normalize formulas
        normalized_formulas = {}
        for key, val in formulas.items():
            try:
                # Discard OCR noise (like a single trailing page number page "3")
                # If formula is PP and RHS is X1(0.25) + X2(0.35) + X3(0.40) and there is a trailing 3
                # We clean and canonicalize
                cleaned_val = val
                if key == "PP":
                    m_trail = re.search(r"(\d+)$", val)
                    if m_trail:
                        trail_val = m_trail.group(1)
                        start_idx = m_trail.start()
                        if start_idx > 0 and val[start_idx-1] != ".":
                            # Check if the sum of weights in the expression is 1.0
                            weights_in_val = [float(w) for w in re.findall(r"0\.\d+|\.\d+|\b\d+%", val)]
                            if weights_in_val and abs(sum(weights_in_val) - 1.0) < 0.05:
                                cleaned_val = val[:start_idx]
                
                normalized_formulas[key] = cls.canonicalize_expression(cleaned_val)
            except Exception:
                normalized_formulas[key] = val

        components = list(weights.keys())
        if not components:
            # Infer components from formulas
            for formula_expr in formulas.values():
                found_vars = re.findall(r"\b[A-Z]{2,4}\b", formula_expr.upper())
                for fv in found_vars:
                    if fv not in ["PU1", "PU2", "PU3", "X1", "X2", "X3", "PP", "XF", "PF", "Y", "O"]:
                        components.append(fv)
            components = list(set(components))

        # Check for equal weights inference
        assumptions = []
        inferred_weights = dict(weights)
        
        # If no weights found, check if we can infer equal weights
        if not inferred_weights and components:
            # Check if there is any contradictory weight in text
            has_differentiated_weights = any(w in text for w in ["40%", "30%", "15%", "0.4", "0.3", "0.15"])
            if not has_differentiated_weights:
                eq_weight = 1.0 / len(components)
                for comp in components:
                    inferred_weights[comp] = round(eq_weight, 3)
                assumptions.append(f"Inferred equal weights of {eq_weight:.3f} for components: {components}")
                
        # Confidence logic
        formula_conf = 95 if formulas else 40
        weights_conf = 95 if weights else 40
        grading_rules_conf = 90 if "nota aprobatoria" in text.lower() or "14" in text else 50
        
        # Penalties
        conflicts = []
        requires_review = False
        review_reason = None
        
        # Verify weight sum
        if inferred_weights:
            sum_weights = sum(inferred_weights.values())
            if abs(sum_weights - 1.0) > 0.05:
                conflicts.append(f"Weights sum to {sum_weights:.3f} instead of 1.0")
                requires_review = True
                review_reason = "Suma de pesos no coincide con 100%."
                weights_conf -= 30

        if detected_structure == "ocr_noisy":
            formula_conf -= 15
            weights_conf -= 15
            assumptions.append("OCR detected noisy formatting, lower reliability on text alignment.")
            
        overall_conf = int((formula_conf + weights_conf + grading_rules_conf) / 3.0)
        
        # Final output dict
        result = {
            "detected_structure": detected_structure,
            "extraction_method": extraction_method,
            "formulas_found": formulas,
            "normalized_formulas": normalized_formulas,
            "components": components,
            "inferred_weights": inferred_weights,
            "assumptions": assumptions,
            "evidence_spans": list(set(evidence_spans)),
            "conflicts_found": conflicts,
            "field_confidence": {
                "formula": max(10, formula_conf),
                "weights": max(10, weights_conf),
                "grading_rules": max(10, grading_rules_conf)
            },
            "overall_confidence": max(10, overall_conf),
            "requires_review": requires_review,
            "review_reason": review_reason
        }
        
        # If overall confidence is low or we missed formulas, run LLM fallback
        if result["overall_confidence"] < 80 or not normalized_formulas:
            llm_result = cls.run_stage_4_llm(text)
            if llm_result:
                # Merge or replace with LLM results
                result["detected_structure"] = llm_result.get("detected_structure", result["detected_structure"])
                result["extraction_method"] = "llm"
                result["formulas_found"] = llm_result.get("formulas_found", result["formulas_found"])
                result["normalized_formulas"] = llm_result.get("normalized_formulas", result["normalized_formulas"])
                result["components"] = llm_result.get("components", result["components"])
                result["inferred_weights"] = llm_result.get("inferred_weights", result["inferred_weights"])
                
                # Append assumptions & conflicts
                for a in llm_result.get("assumptions", []):
                    if a not in result["assumptions"]:
                        result["assumptions"].append(a)
                for c in llm_result.get("conflicts_found", []):
                    if c not in result["conflicts_found"]:
                        result["conflicts_found"].append(c)
                for e in llm_result.get("evidence_spans", []):
                    if e not in result["evidence_spans"]:
                        result["evidence_spans"].append(e)
                        
                # Update confidence (since LLM succeeded, we can adjust but still tag as fallback)
                result["field_confidence"] = llm_result.get("field_confidence", result["field_confidence"])
                result["overall_confidence"] = llm_result.get("overall_confidence", 85)
                # Lower overall slightly because it's a fallback method
                result["overall_confidence"] = min(85, result["overall_confidence"])
                
                result["requires_review"] = llm_result.get("requires_review", result["requires_review"])
                result["review_reason"] = llm_result.get("review_reason", result["review_reason"])
                
        return result
