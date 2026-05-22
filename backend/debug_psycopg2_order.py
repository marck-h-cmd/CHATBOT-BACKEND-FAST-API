import os

# Import config first so environment sanitization runs before psycopg2 loads.
from app.config import Config
import psycopg2

print('PSMODULEPATH present:', 'PSMODULEPATH' in os.environ, 'PSModulePath' in os.environ)
print('DB URL:', Config.DATABASE_URL)
try:
    conn = psycopg2.connect(dbname='chatbot_academico', user='chatbot_user', password='chatbot_password', host='localhost', port=5432, options='-csearch_path=public')
    print('connect OK')
    conn.close()
except Exception as e:
    print('connect failed:', type(e).__name__, e)
