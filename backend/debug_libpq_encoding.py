import os
from ctypes import cdll, c_char_p, c_void_p, c_int
import psycopg2

os.environ['PGCLIENTENCODING'] = 'LATIN1'
libpq_path = os.path.normpath(os.path.join(os.path.dirname(psycopg2.__file__), '..', 'psycopg2_binary.libs', 'libpq-2c01e3753ccf0ab29f038d1bd2d7989e.dll'))
print('libpq path', libpq_path)
libpq = cdll.LoadLibrary(libpq_path)
libpq.PQconnectdb.argtypes = [c_char_p]
libpq.PQconnectdb.restype = c_void_p
libpq.PQstatus.argtypes = [c_void_p]
libpq.PQstatus.restype = c_int
libpq.PQerrorMessage.argtypes = [c_void_p]
libpq.PQerrorMessage.restype = c_char_p

conn = libpq.PQconnectdb(b"host=127.0.0.1 dbname=postgres user=postgres password=wrong")
print('conn', conn)
print('status', libpq.PQstatus(conn))
err = libpq.PQerrorMessage(conn)
print('error bytes', err)
print('error repr', repr(err))
print('error utf8', err.decode('utf-8','backslashreplace'))
print('error latin1', err.decode('latin1','backslashreplace'))
