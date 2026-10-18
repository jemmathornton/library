"""Serve site/ at http://localhost:8020 for the library's installed Chrome app.

Chrome only installs a site as a proper app (its own window and a sharp taskbar icon) when it comes from a server, not
straight from the folder (18 Oct: the taskbar icon of a page window is the 32px tab icon stretched on her 200% screen).
Started at login with no window by the shortcut tools/make_shortcuts.ps1 puts in her Startup folder. Only this computer
can reach it. If it's already running, a second copy just stops.

    pythonw tools/serve.py
"""
import functools, http.server, os, sys

PORT = 8020
SITE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'site')


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):   # no console under pythonw, so nothing to log to
        pass

    def end_headers(self):          # always check for a newer copy, so a rebuild shows at once
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


def main():
    try:
        server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Handler, directory=SITE))
    except OSError:
        sys.exit(0)
    server.serve_forever()


if __name__ == '__main__':
    main()
