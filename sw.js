/* Service worker: lets the installed app open recently visited pages with a weak or no connection.
   Network first, so people always get your latest version when they are online. It only ever touches
   files from this site, never Supabase, fonts or anything else, and it never stores sign-in links. */
var VERSION = "cwwhy-v8";
var CORE = ["./", "index.html", "community.js", "community-examples.js", "community-config.js", "pot.js", "video.js", "steps.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) {
      return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  var sensitive = /[?&](code|access_token|refresh_token|token_hash|error)=/.test(url.search) || /[#&](access_token|refresh_token)=/.test(url.hash);
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && !sensitive) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        return hit || (req.mode === "navigate" ? caches.match("index.html") || caches.match("./") : undefined);
      });
    })
  );
});
