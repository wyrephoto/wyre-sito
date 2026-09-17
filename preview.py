#!/usr/bin/env python3
"""
YEVEON local preview server.
Run:
    python3 preview.py
Then open the displayed address on the computer.
For an iPhone on the same Wi-Fi, use the Mac's local network IP, e.g.
    http://192.168.1.20:8000
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import socket

PORT = 8000

def local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("192.0.2.1", 80))
        return s.getsockname()[0]
    except Exception:
        return "YOUR-MAC-IP"
    finally:
        s.close()

server = ThreadingHTTPServer(("0.0.0.0", PORT), SimpleHTTPRequestHandler)
print(f"YEVEON desktop: http://localhost:{PORT}")
print(f"YEVEON iPhone/iPad (same Wi-Fi): http://{local_ip()}:{PORT}")
print("Press Ctrl+C to stop.")
server.serve_forever()
