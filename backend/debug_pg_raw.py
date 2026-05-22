import socket

def send_startup(sock, user='postgres', database='postgres'):
    params = [
        b'user', user.encode('ascii'),
        b'database', database.encode('ascii'),
        b'client_encoding', b'UTF8',
    ]
    payload = b''.join(p + b'\x00' for p in params) + b'\x00'
    length = 4 + 4 + len(payload)
    packet = length.to_bytes(4, 'big') + (196608).to_bytes(4, 'big') + payload
    sock.sendall(packet)

with socket.create_connection(('127.0.0.1', 5432), timeout=5) as sock:
    sock.settimeout(5)
    send_startup(sock)
    while True:
        header = sock.recv(5)
        if not header:
            print('no header')
            break
        tag = header[0:1]
        length = int.from_bytes(header[1:5], 'big')
        body = sock.recv(length - 4)
        print('TAG', tag, 'len', length)
        try:
            print('body utf8:', body.decode('utf-8', 'backslashreplace'))
        except Exception as e:
            print('body utf8 failed', e)
        print('body latin1:', body.decode('latin1', 'backslashreplace'))
        if tag == b'R':
            auth = int.from_bytes(body[0:4], 'big')
            print('AUTH type', auth)
        if tag == b'K':
            print('sslKey', int.from_bytes(body[0:4],'big'))
        if tag == b'E':
            print('ERROR body', body)
        if tag == b'Z':
            print('ready')
            break
