import socket
host = '127.0.0.1'
port = 5432
sock = socket.create_connection((host, port), timeout=5)
sock.settimeout(2)
print('connected to', host, port)
packet = (8).to_bytes(4, 'big') + (80877103).to_bytes(4, 'big')
sock.sendall(packet)
try:
    resp = sock.recv(1024)
    print('resp bytes', resp)
    print('resp repr', repr(resp))
except socket.timeout:
    print('recv timed out')
sock.close()
