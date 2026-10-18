// Jemma's Library: the small worker that lets Chrome install the site as an app (its own window and a sharp taskbar icon).
// Every request still goes to the local server, so a rebuild shows straight away; nothing is kept back.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => e.respondWith(fetch(e.request)));
