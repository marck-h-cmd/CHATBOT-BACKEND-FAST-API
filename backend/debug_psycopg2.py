import os
import psycopg2
from app.config import Config

db_url = Config.DATABASE_URL
print('repr(db_url)=', repr(db_url))
print('len(db_url)=', len(db_url))
print('type(db_url)=', type(db_url))
print('bytes[0:120]=', list(db_url.encode('utf-8'))[:120])
print('byte85=', hex(db_url.encode('utf-8')[85]))
print('repr(env DATABASE_URL)=', repr(os.getenv('DATABASE_URL')))
print('bytes env[0:120]=', list(os.getenv('DATABASE_URL').encode('utf-8'))[:120])

print('Attempting psycopg2.connect(dsn=db_url)')
try:
    conn = psycopg2.connect(dsn=db_url)
    print('direct connect ok')
    conn.close()
except Exception as e:
    print('direct connect failed:', type(e).__name__, e)

print('Attempting psycopg2.connect(kwargs)')
try:
    conn = psycopg2.connect(dbname='chatbot_academico', user='chatbot_user', password='chatbot_password', host='localhost', port=5432, options='-csearch_path=public')
    print('kwargs connect ok')
    conn.close()
except Exception as e:
    print('kwargs connect failed:', type(e).__name__, e)
