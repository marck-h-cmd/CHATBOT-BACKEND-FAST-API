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
            metadata = ch.metadata_json if isinstance(ch.metadata_json, dict) else {}
            unidad = metadata.get("unidad") if metadata else None
            similitud = embedding_service.calcular_similitud_coseno(query_embedding, emb or [])
            scored.append(
                {
                    "id": ch.id_seccion,
                    "texto": ch.contenido,
                    "tipo": ch.tipo_seccion,
                    "unidad": unidad,
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
        condiciones = " OR ".join([f"contenido ILIKE '%{palabra}%'" for palabra in palabras_clave])
        
        sql = f"""
            SELECT id_seccion, contenido, tipo_seccion, metadata_json
            FROM silabo_chunk
            WHERE id_silabo = %s AND ({condiciones})
            LIMIT %s
        """
        
        result = db.execute(sql, [id_silabo, top_k])
        
        fragmentos = []
        for row in result:
            metadata = row[3] if isinstance(row[3], dict) else {}
            fragmentos.append({
                "id": row[0],
                "texto": row[1],
                "tipo": row[2],
                "unidad": metadata.get("unidad") if metadata else None,
                "metadata": row[3],
                "similitud": 0.5  # Score por defecto
            })
        
        return fragmentos
