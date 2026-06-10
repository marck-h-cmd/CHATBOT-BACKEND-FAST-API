import hashlib
from typing import List, Optional

import numpy as np

from app.config import Config

try:
    from sentence_transformers import SentenceTransformer  # type: ignore
except Exception:
    SentenceTransformer = None  # type: ignore

try:
    import google.generativeai as genai
except Exception:
    genai = None

class EmbeddingService:
    _instance = None
    _model = None
    _gemini_model = None
    _inicializado = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._inicializar()
        return cls._instance
    
    def _inicializar(self):
        """Inicializa la configuración básica de los embeddings"""
        self.dimension = Config.PG_VECTOR_DIM
        self._inicializado = False
        
    def _asegurar_modelo(self):
        """Carga el modelo correspondiente bajo demanda (lazy loading)"""
        if self._inicializado:
            return
            
        # Inicializar Gemini si está configurado
        if Config.USE_GEMINI and Config.GEMINI_API_KEY and genai:
            try:
                genai.configure(api_key=Config.GEMINI_API_KEY)
                self._gemini_model = genai.GenerativeModel('embedding-001')
                self._inicializado = True
                return
            except Exception:
                self._gemini_model = None
        
        # Fallback a sentence-transformers
        if SentenceTransformer is None:
            self._model = None
            self._inicializado = True
            return
        try:
            # En AWS Lambda, redireccionar el cache de Hugging Face a /tmp (único directorio con permisos de escritura)
            import os
            os.environ["HF_HOME"] = "/tmp/huggingface"
            self._model = SentenceTransformer(Config.EMBEDDING_MODEL)
        except Exception:
            self._model = None
        self._inicializado = True

    def _fallback_embedding(self, texto: str) -> List[float]:
        if not texto:
            return [0.0] * self.dimension

        digest = hashlib.sha256(texto.encode("utf-8")).digest()
        values: List[float] = []
        i = 0
        while len(values) < self.dimension:
            b = digest[i % len(digest)]
            values.append((b / 255.0) * 2.0 - 1.0)
            i += 1
        return values
    
    def generar_embedding(self, texto: str) -> List[float]:
        """Genera embedding para un texto"""
        if not texto:
            return [0.0] * self.dimension
        
        # Asegurar que el modelo esté cargado en memoria
        self._asegurar_modelo()
        
        # Usar Gemini si está configurado
        if self._gemini_model:
            try:
                result = self._gemini_model.embed_content(
                    content=texto,
                    task_type="retrieval_document"
                )
                embedding = result.embedding
                # Ajustar a la dimensión esperada
                if len(embedding) > self.dimension:
                    embedding = embedding[:self.dimension]
                elif len(embedding) < self.dimension:
                    embedding = embedding + [0.0] * (self.dimension - len(embedding))
                return embedding
            except Exception:
                pass  # Fallback a sentence-transformers
        
        # Fallback a sentence-transformers
        if self._model is None:
            return self._fallback_embedding(texto)
        embedding = self._model.encode(texto)
        return embedding.tolist()
    
    def generar_embeddings_batch(self, textos: List[str]) -> List[List[float]]:
        """Genera embeddings para múltiples textos"""
        if not textos:
            return []
            
        # Asegurar que el modelo esté cargado en memoria
        self._asegurar_modelo()
        
        if self._model is None:
            return [self._fallback_embedding(t) for t in textos]
        embeddings = self._model.encode(textos)
        return embeddings.tolist()
    
    @staticmethod
    def calcular_similitud_coseno(embedding1: List[float], embedding2: List[float]) -> float:
        """Calcula similitud coseno entre dos embeddings"""
        if not embedding1 or not embedding2:
            return 0.0
        
        if len(embedding1) != len(embedding2):
            return 0.0
        
        try:
            # Convertir a numpy arrays si es necesario
            arr1 = np.array(embedding1, dtype=np.float32)
            arr2 = np.array(embedding2, dtype=np.float32)
            
            # Calcular similitud coseno
            norm1 = np.linalg.norm(arr1)
            norm2 = np.linalg.norm(arr2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similitud = np.dot(arr1, arr2) / (norm1 * norm2)
            return float(similitud)
        except Exception:
            return 0.0
    
    def calcular_similitud_coseno(self, emb1: List[float], emb2: List[float]) -> float:
        """Calcula similitud entre embeddings"""
        arr1 = np.array(emb1)
        arr2 = np.array(emb2)
        denom = (np.linalg.norm(arr1) * np.linalg.norm(arr2))
        if denom == 0:
            return 0.0
        return float(np.dot(arr1, arr2) / denom)

embedding_service = EmbeddingService()
