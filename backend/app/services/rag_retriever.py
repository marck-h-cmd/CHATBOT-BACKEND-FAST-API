from sqlalchemy.orm import Session
from typing import List, Dict
from app.database.models import SilaboChunk
from app.services.embeddings import embedding_service

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
        """Recupera fragmentos relevantes (vectorial si existe embedding, sino fallback)"""
        query_embedding = embedding_service.generar_embedding(consulta)

        q = db.query(SilaboChunk).filter(SilaboChunk.id_silabo == id_silabo)
        if filtro_tipo:
            q = q.filter(SilaboChunk.tipo_seccion == filtro_tipo)
        if filtro_unidad:
            q = q.filter(SilaboChunk.unidad == filtro_unidad)

        chunks = q.all()
        if not chunks:
            return []

        scored: List[Dict] = []
        for ch in chunks:
            emb = ch.embedding if isinstance(ch.embedding, list) else None
            similitud = embedding_service.calcular_similitud_coseno(query_embedding, emb or [])
            scored.append(
                {
                    "id": ch.id,
                    "texto": ch.chunk_texto,
                    "tipo": ch.tipo_seccion,
                    "unidad": ch.unidad,
                    "metadata": ch.metadata_json,
                    "similitud": round(similitud, 4),
                }
            )

        scored.sort(key=lambda x: x["similitud"], reverse=True)
        return scored[:top_k]
    
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
