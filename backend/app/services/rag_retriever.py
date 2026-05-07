from sqlalchemy.orm import Session
from typing import List, Dict
from app.database.models import SilaboChunk
from app.services.embeddings import embedding_service
from app.config import Config

class RAGRetriever:
    
    @staticmethod
    def recuperar_fragmentos(
        db: Session,
        id_silabo: int,
        consulta: str,
        top_k: int = 5,
        filtro_tipo: str = None,
        filtro_unidad: str = None
    ) -> List[Dict]:
        """Recupera fragmentos relevantes usando búsqueda vectorial"""
        # Generar embedding de la consulta
        query_embedding = embedding_service.generar_embedding(consulta)
        
        # Construir consulta SQL con pgvector
        sql = """
            SELECT 
                id, chunk_texto, tipo_seccion, unidad, metadata_json,
                1 - (embedding <=> CAST(%s AS vector)) as similitud
            FROM silabo_chunks
            WHERE id_silabo = %s
        """
        params = [query_embedding, id_silabo]
        
        if filtro_tipo:
            sql += " AND tipo_seccion = %s"
            params.append(filtro_tipo)
        
        if filtro_unidad:
            sql += " AND unidad = %s"
            params.append(filtro_unidad)
        
        sql += " ORDER BY embedding <=> CAST(%s AS vector) LIMIT %s"
        params.extend([query_embedding, top_k])
        
        result = db.execute(sql, params)
        
        fragmentos = []
        for row in result:
            fragmentos.append({
                "id": row[0],
                "texto": row[1],
                "tipo": row[2],
                "unidad": row[3],
                "metadata": row[4],
                "similitud": round(row[5], 4) if row[5] else 0
            })
        
        return fragmentos
    
    @staticmethod
    def recuperar_por_palabras_clave(
        db: Session,
        id_silabo: int,
        palabras_clave: List[str],
        top_k: int = 5
    ) -> List[Dict]:
        """Recupera fragmentos por palabras clave (fallback)"""
        condiciones = " OR ".join([f"chunk_texto ILIKE '%{palabra}%'" for palabra in palabras_clave])
        
        sql = f"""
            SELECT id, chunk_texto, tipo_seccion, unidad, metadata_json
            FROM silabo_chunks
            WHERE id_silabo = %s AND ({condiciones})
            LIMIT %s
        """
        
        result = db.execute(sql, [id_silabo, top_k])
        
        fragmentos = []
        for row in result:
            fragmentos.append({
                "id": row[0],
                "texto": row[1],
                "tipo": row[2],
                "unidad": row[3],
                "metadata": row[4],
                "similitud": 0.5  # Score por defecto
            })
        
        return fragmentos