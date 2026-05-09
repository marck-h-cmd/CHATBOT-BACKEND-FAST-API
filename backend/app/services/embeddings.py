import hashlib
from typing import List, Optional

import numpy as np

from app.config import Config

try:
    from sentence_transformers import SentenceTransformer  # type: ignore
except Exception:
    SentenceTransformer = None  # type: ignore

class EmbeddingService:
    _instance = None
    _model = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._inicializar()
        return cls._instance
    
    def _inicializar(self):
        """Inicializa el modelo de embeddings"""
        self.dimension = Config.PG_VECTOR_DIM
        if SentenceTransformer is None:
            self._model = None
            return
        try:
            self._model = SentenceTransformer(Config.EMBEDDING_MODEL)
        except Exception:
            self._model = None

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
        if self._model is None:
            return self._fallback_embedding(texto)
        embedding = self._model.encode(texto)
        return embedding.tolist()
    
    def generar_embeddings_batch(self, textos: List[str]) -> List[List[float]]:
        """Genera embeddings para múltiples textos"""
        if not textos:
            return []
        if self._model is None:
            return [self._fallback_embedding(t) for t in textos]
        embeddings = self._model.encode(textos)
        return embeddings.tolist()
    
    def calcular_similitud_coseno(self, emb1: List[float], emb2: List[float]) -> float:
        """Calcula similitud entre embeddings"""
        arr1 = np.array(emb1)
        arr2 = np.array(emb2)
        denom = (np.linalg.norm(arr1) * np.linalg.norm(arr2))
        if denom == 0:
            return 0.0
        return float(np.dot(arr1, arr2) / denom)

embedding_service = EmbeddingService()
