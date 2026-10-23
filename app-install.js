/* Installable web app: registers the service worker and shows a small, dismissible "Install" card.
   - Android / desktop Chrome: a real Install button (the browser's own prompt).
   - iPhone / iPad Safari: a short tip, because Apple has no install button for websites. */
(function () {
  "use strict";
  var KEY = "cwwhy_install_dismissed";
  var $ = function (id) { return document.getElementById(id); };
  var get = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var set = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };

  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function () {}); });
  }

  var standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  if (standalone) return;
  var dismissedAt = +get(KEY) || 0;
  if (dismissedAt && Date.now() - dismissedAt < 30 * 864e5) return;

  var ua = navigator.userAgent || "";
  var iosSafari = /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Instagram|FBAN|FBAV/.test(ua);
  var deferred = null, shown = false;

  function css() {
    if ($("ai-css")) return;
    var s = document.createElement("style"); s.id = "ai-css";
    s.textContent = [
      "#ai-card{position:fixed;left:12px;right:12px;bottom:12px;z-index:55;max-width:440px;margin:0 auto;background:#fff;border:1px solid rgba(43,35,31,.16);border-radius:22px;padding:16px;box-shadow:0 10px 30px rgba(43,35,31,.28);font:14px/1.4 'Inter',system-ui,sans-serif;color:#2B231F}",
      "#ai-card .r{display:flex;gap:12px;align-items:center}",
      "#ai-card img{flex:none;width:52px;height:52px;border-radius:14px;border:1px solid rgba(43,35,31,.16)}",
      "#ai-card b{display:block;font-size:15px;line-height:1.25}#ai-card span.s{color:#675C55;font-size:13px}",
      "#ai-card .b{display:flex;gap:10px;justify-content:flex-end;margin-top:12px}",
      "#ai-card button{min-height:44px;padding:0 20px;border-radius:12px;border:0;font:700 14px 'Inter',system-ui,sans-serif;cursor:pointer}",
      "#ai-card .no{background:none;color:#675C55;font-weight:600}#ai-card .go{background:#C0392B;color:#fff}",
      "#ai-card button:focus-visible{outline:3px solid #C0392B;outline-offset:2px}",
      "@media(prefers-reduced-motion:no-preference){#ai-card{animation:aiUp .4s ease-out both}@keyframes aiUp{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}}"
    ].join("\n");
    document.head.appendChild(s);
  }

  function show() {
    if (shown || $("ai-card")) return;
    if (!deferred && !iosSafari) return;
    shown = true; css();
    var el = document.createElement("aside");
    el.id = "ai-card"; el.setAttribute("aria-label", "Install the app");
    el.innerHTML = '<div class="r"><img src="/icons/icon-192.png" alt="" width="52" height="52"><div><b>Install Cook With What You Have</b><span class="s">' +
      (deferred ? "Open it like an app. No app store needed." : "Tap the Share button, then &ldquo;Add to Home Screen&rdquo;.") + '</span></div></div>' +
      '<div class="b"><button type="button" class="no">' + (deferred ? "Not now" : "Got it") + "</button>" + (deferred ? '<button type="button" class="go">Install</button>' : "") + "</div>";
    document.body.appendChild(el);
    el.querySelector(".no").onclick = function () { set(KEY, String(Date.now())); el.remove(); };
    var go = el.querySelector(".go");
    if (go) go.onclick = function () {
      var p = deferred; deferred = null; el.remove();
      if (!p) return;
      p.prompt();
      if (p.userChoice) p.userChoice.then(function (c) { if (!c || c.outcome !== "accepted") set(KEY, String(Date.now())); });
    };
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); deferred = e;
    setTimeout(show, 15000);
  });
  window.addEventListener("appinstalled", function () { var c = $("ai-card"); if (c) c.remove(); deferred = null; });
  if (iosSafari) setTimeout(show, 20000);
  window.CWWHY_INSTALL = { show: show };
})();
