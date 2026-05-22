import traceback
from app.config import Config
import psycopg2

try:
    conn = psycopg2.connect(dbname='chatbot_academico', user='chatbot_user', password='chatbot_password', host='127.0.0.1', port=5432)
    print('connected')
    conn.close()
except Exception:
    traceback.print_exc()
