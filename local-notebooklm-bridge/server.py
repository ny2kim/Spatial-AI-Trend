#!/usr/bin/env python3
"""Local-only NotebookLM bridge for Research OS. Never expose this port publicly."""
import asyncio
import html
import secrets
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit
from urllib.parse import quote

HOST, PORT = "127.0.0.1", 8765
TOKEN = secrets.token_urlsafe(32)
LOCK = threading.Lock()

def clean_urls(values):
    out = []
    for value in values[:10]:
        u = urlsplit(value)
        if u.scheme != "https" or u.hostname not in ("arxiv.org", "www.arxiv.org"):
            continue
        if not u.path.startswith(("/abs/", "/pdf/")):
            continue
        clean = "https://arxiv.org" + u.path
        if clean not in out:
            out.append(clean)
    return out

async def create_notebook(urls):
    from notebooklm import NotebookLMClient
    async with NotebookLMClient.from_storage() as client:
        notebook = await client.notebooks.create("Research OS — " + str(len(urls)) + " selected papers")
        results = []
        for url in urls:
            try:
                await client.sources.add_url(notebook.id, url, wait=True)
                results.append((url, "Added"))
            except Exception as exc:
                results.append((url, "Failed: " + str(exc)[:200]))
        return notebook.id, results

class Handler(BaseHTTPRequestHandler):
    def respond(self, body, status=200):
        b = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'")
        self.end_headers()
        self.wfile.write(b)

    def page(self, title, content):
        return f'<!doctype html><html><meta charset="utf-8"><title>{html.escape(title)}</title><body style="font:16px system-ui;max-width:680px;margin:50px auto;line-height:1.6"><h1>{html.escape(title)}</h1>{content}</body></html>'

    def do_GET(self):
        u = urlsplit(self.path)
        if u.path != "/import":
            return self.respond(self.page("Research OS bridge", "<p>Use Analyze selected in NotebookLM from your Research OS Library.</p>"), 404)
        urls = clean_urls(parse_qs(u.query).get("url", []))
        if not urls:
            return self.respond(self.page("No supported papers", "<p>Select arXiv papers in the Research OS Library.</p>"), 400)
        inputs = "".join('<input type="hidden" name="url" value="' + html.escape(x, quote=True) + '">' for x in urls)
        items = "".join("<li>" + html.escape(x) + "</li>" for x in urls)
        form = '<form method="POST" action="/create"><input type="hidden" name="token" value="' + TOKEN + '">' + inputs + '<button type="submit" style="padding:12px">Create Notebook and Add Sources</button></form>'
        self.respond(self.page("Confirm NotebookLM import", "<p>The following papers will be added to a new notebook in your signed-in Google account.</p><ul>" + items + "</ul>" + form))

    def do_POST(self):
        if self.path != "/create":
            return self.respond(self.page("Not found", ""), 404)
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            size = 0
        if size < 1 or size > 12000:
            return self.respond(self.page("Invalid request", ""), 400)
        form = parse_qs(self.rfile.read(size).decode("utf-8"))
        if not secrets.compare_digest(form.get("token", [""])[0], TOKEN):
            return self.respond(self.page("Invalid confirmation", ""), 403)
        urls = clean_urls(form.get("url", []))
        if not urls:
            return self.respond(self.page("No valid arXiv URLs", ""), 400)
        if not LOCK.acquire(blocking=False):
            return self.respond(self.page("Busy", "<p>Another import is running. Try again shortly.</p>"), 409)
        try:
            nbid, results = asyncio.run(create_notebook(urls))
            link = "https://notebooklm.google.com/notebook/" + quote(nbid, safe="")
            items = "".join("<li>" + html.escape(url) + " — " + html.escape(status) + "</li>" for url, status in results)
            self.respond(self.page("Notebook created", '<p><a href="' + html.escape(link, quote=True) + '">Open new notebook</a></p><ul>' + items + "</ul>"))
        except Exception as exc:
            self.respond(self.page("Import failed", "<p>" + html.escape(str(exc)) + "</p><p>Run <code>notebooklm login</code> on your Mac and try again.</p>"), 500)
        finally:
            LOCK.release()

if __name__ == "__main__":
    print(f"NotebookLM bridge running on http://{HOST}:{PORT} (Ctrl+C to stop)")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
