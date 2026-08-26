#!/usr/bin/env python3
# No-cache static server for the arena. Plain http.server sends only Last-Modified,
# so a kiosk browser heuristically caches JS/CSS and keeps running stale code across
# reloads. This sends Cache-Control: no-store on every response, so each reload (even
# a soft one) refetches the current build. Use during active development / kiosk demo.
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    HTTPServer(('0.0.0.0', port), NoCacheHandler).serve_forever()
