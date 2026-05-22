import os

# Remove old .env if it exists
if os.path.exists('.env'):
    os.remove('.env')
    print("Removed old .env")

env_content = """ENVIRONMENT=development
DATABASE_URL=postgresql://chatbot_user:chatbot_password@localhost:5432/chatbot_academico?schema=public
SECRET_KEY=tu-secret-key-para-produccion-cambiar-esto-es-muy-importante
OPENAI_API_KEY=opcional-solo-si-usas-openai
GEMINI_API_KEY=AIzaSyBB6LUTM3DqirCxhjbQxxeG2JIoezkEYk8
USE_GEMINI=true
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
PG_VECTOR_DIM=384
NOTA_APROBACION=14
UMBRAL_RIESGO_ALTO=11
UMBRAL_RIESGO_MEDIO=13
TUTORIA_DIA=Jueves
TUTORIA_HORARIO=12:00 - 13:00
TUTORIA_EMAIL=amendozad@unitru.edu.pe
"""

with open('.env', 'w', encoding='utf-8') as f:
    f.write(env_content)

print("Created .env with UTF-8 encoding")

with open('.env', 'rb') as f:
    raw = f.read()
    print(f"File size: {len(raw)} bytes")
