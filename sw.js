/* Studien-OS: lädt die App einmal und macht sie offline nutzbar. */
const VERSION = "studienos-202610211018";
const SHELL = ["./", "./index.html", "./config.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("studienos-") && k !== VERSION && k !== "studienos-fonts").map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    const fresh = req.mode === "navigate" || /\/(index\.html)?$/.test(url.pathname) || url.pathname.endsWith("/config.js");
    e.respondWith(fresh ? networkFirst(req, url) : cacheFirst(req, VERSION));
  } else if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(cacheFirst(req, "studienos-fonts"));
  }
});
async function networkFirst(req, url){
  const cache = await caches.open(VERSION);
  const key = req.mode === "navigate" ? new URL("./index.html", self.location).href : url.href;
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 4000);
    const res = await fetch(url.href, {signal:ctl.signal, cache:"no-cache", credentials:"same-origin"});
    clearTimeout(t);
    if (res && res.ok) cache.put(key, res.clone());
    return res;
  } catch(err){
    return (await cache.match(key)) || (await cache.match(new URL("./index.html", self.location).href)) || Response.error();
  }
}
async function cacheFirst(req, name){
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
    return res;
  } catch(err){ return Response.error(); }
}
