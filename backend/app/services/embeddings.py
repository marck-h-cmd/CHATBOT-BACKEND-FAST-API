from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Union
from app.config import Config

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
        self._model = SentenceTransformer(Config.EMBEDDING_MODEL)
        self.dimension = Config.PG_VECTOR_DIM
    
    def generar_embedding(self, texto: str) -> List[float]:
        """Genera embedding para un texto"""
        if not texto:
            return [0.0] * self.dimension
        embedding = self._model.encode(texto)
        return embedding.tolist()
    
    def generar_embeddings_batch(self, textos: List[str]) -> List[List[float]]:
        """Genera embeddings para múltiples textos"""
        if not textos:
            return []
        embeddings = self._model.encode(textos)
        return embeddings.tolist()
    
    def calcular_similitud_coseno(self, emb1: List[float], emb2: List[float]) -> float:
        """Calcula similitud entre embeddings"""
        arr1 = np.array(emb1)
        arr2 = np.array(emb2)
        return np.dot(arr1, arr2) / (np.linalg.norm(arr1) * np.linalg.norm(arr2))

embedding_service = EmbeddingService()