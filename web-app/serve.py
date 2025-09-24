#!/usr/bin/env python3
"""
Simple HTTP server to test the tea order web app locally.
Run this file from the web-app directory to serve the files.
"""

import http.server
import socketserver
import webbrowser
import os
from pathlib import Path

PORT = 8000

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def guess_type(self, path):
        mimetype = super().guess_type(path)
        # Ensure proper MIME types
        if path.endswith('.js'):
            return 'application/javascript'
        elif path.endswith('.css'):
            return 'text/css'
        return mimetype

def main():
    # Change to the web-app directory
    web_app_dir = Path(__file__).parent
    os.chdir(web_app_dir)
    
    # Create server
    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        print(f"🚀 Tea Order System Server")
        print(f"📍 Serving at: http://localhost:{PORT}")
        print(f"📁 Directory: {web_app_dir.absolute()}")
        print(f"🌐 Open in browser: http://localhost:{PORT}")
        print(f"⏹️  Press Ctrl+C to stop")
        print("-" * 50)
        
        # Try to open browser automatically
        try:
            webbrowser.open(f'http://localhost:{PORT}')
            print("✅ Browser opened automatically")
        except Exception as e:
            print(f"⚠️  Could not open browser automatically: {e}")
        
        print("-" * 50)
        
        # Serve files
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print(f"\n🛑 Server stopped")
            httpd.shutdown()

if __name__ == "__main__":
    main()