(function () {
  "use strict";
  var KEY = "okazje-gitarowe-marks-v1";
  var SCORES = [["cena", "Cena vs wartość"], ["stan", "Stan"], ["sprzedawca", "Wiarygodność sprzedawcy"], ["oryginalnosc", "Oryginalność / ryzyko podróbki"], ["grywalnosc", "Grywalność i specyfikacja"], ["plynnosc", "Płynność odsprzedaży"], ["wysylka", "Ryzyko wysyłki i cła (10 = niskie)"]];
  var VIEWS = [["aktywne", "Aktywne"], ["ulubione", "Ulubione"], ["kupione", "Kupione"], ["archiwum", "Archiwum"], ["wszystkie", "Wszystkie"]];
  var state = { view: "aktywne", sort: "new", src: "all", verdict: "all", verified: false };
  var DATA = null, marks = {};

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function zl(n) { return Math.round(n).toLocaleString("pl-PL") + " zł"; }
  function dt(s) { return s ? String(s).slice(0, 10).split("-").reverse().join(".") : "–"; }
  function pct(n) { return (n > 0 ? "−" : "+") + Math.abs(n).toLocaleString("pl-PL", { maximumFractionDigits: 1 }) + "%"; }

  // ---- Trwały zapis oznaczeń: localStorage (+ kopia w cookie), wykrywanie braku zapisu, eksport/import ----
  var CK = "okg_marks";
  var store = { ls: false, ck: false, persistent: false };
  function probeLS() { try { var t = "__okg_probe__" + Date.now(); localStorage.setItem(t, "1"); var ok = localStorage.getItem(t) === "1"; localStorage.removeItem(t); return ok; } catch (e) { return false; } }
  function probeCK() { try { document.cookie = "okg_probe=1; path=/; SameSite=Lax; max-age=60"; var ok = /(?:^|; )okg_probe=1/.test(document.cookie); document.cookie = "okg_probe=; path=/; max-age=0"; return ok; } catch (e) { return false; } }
  function clean(o) { var r = {}; if (!o || typeof o !== "object") return r; Object.keys(o).forEach(function (id) { var m = o[id] || {}, x = {}; ["fav", "bought", "arch"].forEach(function (k) { if (m[k]) x[k] = true; }); if (m.t) x.t = m.t; if (x.fav || x.bought || x.arch) r[id] = x; }); return r; }
  // Kompaktowy kod: id:flagi;id:flagi (f=ulubione, b=kupione, a=archiwum) – mieści się w cookie i w linku.
  function encode(o) { return Object.keys(o).map(function (id) { var m = o[id]; return id + ":" + (m.fav ? "f" : "") + (m.bought ? "b" : "") + (m.arch ? "a" : ""); }).join(";"); }
  function decode(s) { var r = {}; String(s || "").replace(/^OKG1:/, "").split(";").forEach(function (p) { var i = p.lastIndexOf(":"); if (i < 1) return; var id = p.slice(0, i).trim(), f = p.slice(i + 1); if (!/^[a-z]+-[\w-]+$/i.test(id)) return; var m = {}; if (f.indexOf("f") >= 0) m.fav = true; if (f.indexOf("b") >= 0) m.bought = true; if (f.indexOf("a") >= 0) m.arch = true; if (m.fav || m.bought || m.arch) r[id] = m; }); return r; }
  function readCK() { try { var m = document.cookie.match(/(?:^|; )okg_marks=([^;]*)/); return m ? decode(decodeURIComponent(m[1])) : null; } catch (e) { return null; } }
  function loadMarks() {
    var fromLS = null;
    if (store.ls) { try { var raw = localStorage.getItem(KEY); if (raw) fromLS = clean(JSON.parse(raw)); } catch (e) { fromLS = null; } }
    if (fromLS) return fromLS;
    var fromCK = store.ck ? readCK() : null; // localStorage wyczyszczony/niedostępny → odtwórz z kopii w cookie
    return fromCK || {};
  }
  function saveMarks() {
    var ok = false, c = clean(marks);
    if (store.ls) { try { localStorage.setItem(KEY, JSON.stringify(c)); ok = localStorage.getItem(KEY) === JSON.stringify(c); } catch (e) { ok = false; } }
    if (store.ck) { try { var v = encodeURIComponent(encode(c)); if (v.length < 3800) { document.cookie = CK + "=" + v + "; path=/; SameSite=Lax; max-age=34560000" + (location.protocol === "https:" ? "; Secure" : ""); ok = ok || readCK() !== null; } } catch (e) { } }
    if (!ok) { store.ls = false; storeNote(); }
    return ok;
  }
  function toggleMark(id, k) {
    marks = Object.assign({}, loadMarks(), marks); // scal, nigdy nie nadpisuj innych ofert
    var m = Object.assign({}, marks[id] || {}); m[k] = !m[k]; m.t = new Date().toISOString(); marks[id] = m; saveMarks(); render(); syncBox();
  }
  function importMarks(code) {
    var inc = decode(code), n = Object.keys(inc).length;
    if (!n) return 0;
    marks = Object.assign({}, loadMarks(), marks);
    Object.keys(inc).forEach(function (id) { marks[id] = Object.assign({}, inc[id], { t: new Date().toISOString() }); });
    saveMarks(); if (DATA) render(); syncBox(); return n;
  }
  function storeNote() {
    var el = $("store"); if (!el) return;
    store.persistent = store.ls || store.ck;
    el.className = "store " + (store.persistent ? "ok" : "bad");
    el.textContent = store.persistent
      ? "✓ Zapis oznaczeń działa (" + (store.ls ? "localStorage" : "") + (store.ls && store.ck ? " + kopia w cookie" : store.ck ? "cookie" : "") + "). Oznaczenia są przypisane do stałego ID oferty i przetrwają odświeżenie danych."
      : "⚠ Ta przeglądarka nie pozwala zapisać oznaczeń (tryb prywatny lub przeglądarka wbudowana w aplikację). Po zamknięciu strony znikną – otwórz stronę w zwykłym oknie Safari albo skopiuj kod z sekcji „Kopia oznaczeń”.";
  }
  function syncBox() { var t = $("mcode"); if (t) t.value = "OKG1:" + encode(clean(marks)); }

  var DAY = 864e5;
  function ts(s) { var d = Date.parse(String(s || "").replace(/\+00:00$/, "Z")); return isNaN(d) ? 0 : d; }
  function isNew(o) { var f = ts(o.firstSeen); return f > 0 && Date.now() - f < DAY; }
  function dtt(s) { var d = ts(s); return d ? new Date(d).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "–"; }
  var SORTS = {
    "new": function (a, b) { return ts(b.firstSeen) - ts(a.firstSeen) || b.dealPct - a.dealPct; },
    deal: function (a, b) { return b.dealPct - a.dealPct; },
    rating: function (a, b) { return b.overall - a.overall || b.dealPct - a.dealPct; },
    total: function (a, b) { return a.price.razem - b.price.razem; }
  };

  function card(o) {
    var m = marks[o.id] || {};
    var tone = o.verdict === "polecam" ? "ok" : o.verdict === "nie polecam" ? "bad" : "warn";
    var p = o.price;
    var orig = o.currency === "PLN" ? zl(o.priceOriginal) : o.priceOriginal.toLocaleString("pl-PL") + " €" + " = " + zl(p.cena);
    var valid = o.auctionEnd ? "koniec aukcji " + dt(o.auctionEnd) : o.validTo ? "kup teraz · ważne do " + dt(o.validTo) : "kup teraz · bez daty końca";
    var rows = [["Stan", o.condition], ["Cena w ogłoszeniu", orig], ["Wysyłka do PL", zl(p.wysylka) + " – " + o.shippingNote], ["Cło (3,2%)", zl(p.clo)], ["VAT importowy (23%)", zl(p.vat)], ["Opłaty przewoźnika / agencji", zl(p.oplaty) + " – " + o.customsNote], ["Razem", zl(p.razem)], ["Wartość rynkowa", "≈ " + zl(o.marketValue) + (o.valueVerified ? "" : " (niezweryfikowana)")], ["Wycena", o.valueMethod], ["Aukcja / ważność", valid], ["Wystawione", dt(o.postedOrSince)], ["Pierwszy raz w zestawieniu", dtt(o.firstSeen)], ["ID", o.id]];
    var good = o.valueVerified && o.dealPct > 0;
    return '<article class="card' + (m.arch ? " arch" : "") + '">' +
      '<a class="ph" href="' + esc(o.url) + '" target="_blank" rel="noopener noreferrer"><img loading="lazy" referrerpolicy="no-referrer" src="' + esc(o.photo) + '" alt="' + esc(o.title) + '" onerror="this.parentNode.classList.add(\'err\')"><span class="fb">📷 Zdjęcie w ogłoszeniu</span></a>' +
      '<div class="body"><div class="tags">' + (isNew(o) ? '<span class="tag new">NOWE</span>' : "") + '<span class="tag ' + tone + '">' + esc(o.verdict) + '</span><span class="tag">' + esc(o.source) + '</span>' + (o.valueVerified ? "" : '<span class="tag bad">wartość niezweryfikowana</span>') + '</div>' +
      '<a class="title" href="' + esc(o.url) + '" target="_blank" rel="noopener noreferrer">' + esc(o.title) + '</a>' +
      '<div class="loc">' + esc(o.location || "–") + ' · oryg.: „' + esc(o.originalTitle) + '”</div>' +
      '<div class="tiles"><div class="tile"><span>Razem z dostawą</span><b>' + zl(p.razem) + '</b></div><div class="tile"><span>Wartość rynkowa</span><b>≈ ' + zl(o.marketValue) + '</b></div><div class="tile' + (good ? " good" : "") + '"><span>Okazja</span><b>' + pct(o.dealPct) + '</b></div></div>' +
      '<div class="rating"><b>' + o.overall.toFixed(1).replace(".", ",") + '</b><span>/ 10 ocena ogólna</span></div>' +
      '<div class="reason">' + esc(o.reasoning) + '</div>' +
      '<div class="marks">' + [["fav", "Ulubione"], ["bought", "Kupione"], ["arch", "Archiwum"]].map(function (x) { return '<button data-id="' + esc(o.id) + '" data-k="' + x[0] + '" class="' + (m[x[0]] ? "on" : "") + '">' + (m[x[0]] ? "✓ " : "") + x[1] + '</button>'; }).join("") + '</div>' +
      '<details class="more"><summary>Szczegóły, wycena i źródła ▾</summary><div class="desc">' + esc(o.description) + '</div>' +
      '<table class="props">' + rows.map(function (r) { return '<tr' + (r[0] === "Razem" ? ' class="sum"' : "") + '><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>'; }).join("") + '</table>' +
      SCORES.map(function (s) { var v = o.scores[s[0]]; return '<div class="bar"><span>' + s[1] + '</span><div><i style="width:' + v * 10 + '%"></i></div><b>' + v + '</b></div>'; }).join("") +
      '<ul class="links"><li><a href="' + esc(o.url) + '" target="_blank" rel="noopener noreferrer">Otwórz ogłoszenie (' + esc(o.source) + ') ↗</a></li>' + o.valueSources.map(function (s) { return '<li>Źródło wyceny: <a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.label) + '</a></li>'; }).join("") + '</ul></details>' +
      '</div></article>';
  }

  function render() {
    var offers = DATA.offers;
    var cnt = function (f) { return offers.filter(function (o) { return f(marks[o.id] || {}); }).length; };
    var counts = { aktywne: offers.length - cnt(function (m) { return m.arch; }), ulubione: cnt(function (m) { return m.fav; }), kupione: cnt(function (m) { return m.bought; }), archiwum: cnt(function (m) { return m.arch; }), wszystkie: offers.length };
    $("views").innerHTML = VIEWS.map(function (v) { return '<button data-view="' + v[0] + '" class="' + (state.view === v[0] ? "on" : "") + '">' + v[1] + '<small>' + counts[v[0]] + '</small></button>'; }).join("");
    var list = offers.filter(function (o) {
      var m = marks[o.id] || {};
      if (state.src !== "all" && o.source !== state.src) return false;
      if (state.verdict !== "all" && o.verdict !== state.verdict) return false;
      if (state.verified && !o.valueVerified) return false;
      if (state.view === "aktywne" && m.arch) return false;
      if (state.view === "ulubione" && !m.fav) return false;
      if (state.view === "kupione" && !m.bought) return false;
      if (state.view === "archiwum" && !m.arch) return false;
      return true;
    }).sort(SORTS[state.sort] || SORTS["new"]);
    $("count").textContent = "Oferty (" + list.length + ")";
    $("grid").innerHTML = list.length ? list.map(card).join("") : '<p class="empty">Brak ofert dla wybranych filtrów.</p>';
  }

  function header() {
    var meta = DATA.meta, offers = DATA.offers;
    var upd = new Date(meta.updated.replace(/\+00:00$/, "Z"));
    var updTxt = isNaN(upd) ? meta.updated : upd.toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" });
    $("summary").textContent = "Ostatnia aktualizacja: " + updTxt + " · " + offers.length + " ofert · " + (meta.scope || "") + " · budżet " + (meta.budget || "");
    var best = offers.filter(function (o) { return o.valueVerified; }).sort(function (a, b) { return b.dealPct - a.dealPct; })[0];
    var pol = offers.filter(function (o) { return o.verdict === "polecam"; }).length;
    var fx = meta.fx;
    $("metrics").innerHTML = [[offers.length, "Ofert w zestawieniu", ""], [pol, "Werdykt „polecam”", ""], [best ? pct(best.dealPct) : "–", "Największa okazja", best ? best.title : ""], ["1 € = " + String(fx.EUR).replace(".", ",") + " zł", "Kurs NBP", fx.source]].map(function (x) { return '<div class="metric"><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span>' + (x[2] ? '<i>' + esc(x[2]) + '</i>' : "") + '</div>'; }).join("");
    var srcs = Array.from(new Set(offers.map(function (o) { return o.source; })));
    $("src").innerHTML = '<option value="all">Wszystkie źródła</option>' + srcs.map(function (s) { return "<option>" + esc(s) + "</option>"; }).join("");
    var w = meta.weights || {};
    var P = function (k) { return Math.round((w[k] || 0) * 100) + "%"; };
    $("method").innerHTML = [
      "Okazja = cena łączna w Polsce wyraźnie poniżej wartości rynkowej. Okazja % = (wartość − cena łączna) / wartość.",
      "Cena łączna = cena + wysyłka do PL. Dla wysyłek spoza UE doliczamy cło 3,2% (CN 9202), VAT 23% od (cena + wysyłka + cło) oraz opłatę agencji celnej przewoźnika ok. 50–100 zł. W obecnym zestawieniu wszystkie oferty są z UE, więc cło i VAT importowy = 0.",
      "Wysyłka: Reverb – stawka do Polski z API Reverb; OLX – założenie 80 zł za kuriera z ubezpieczeniem (lub odbiór osobisty); Kleinanzeigen – założenie 50 € za ubezpieczoną paczkę DHL DE→PL, do potwierdzenia ze sprzedawcą.",
      "Kurs walut: " + fx.source + " (EUR " + fx.EUR + ", USD " + fx.USD + ", GBP " + fx.GBP + ").",
      "Wartość rynkowa = mediana cen ofertowych porównywalnych UŻYWANYCH egzemplarzy tego samego modelu (Reverb – sprzedawcy z UE, OLX, Kleinanzeigen). To ceny wywoławcze, a nie transakcyjne – dane o sprzedanych egzemplarzach (Reverb Price Guide, eBay sold) nie były dostępne, więc realne ceny sprzedaży mogą być niższe.",
      "Ocena ogólna (1–10) = średnia ważona: cena vs wartość " + P("cena") + ", grywalność " + P("grywalnosc") + ", płynność odsprzedaży " + P("plynnosc") + " (gra i odsprzedaż mają równą wagę), stan " + P("stan") + ", sprzedawca " + P("sprzedawca") + ", oryginalność " + P("oryginalnosc") + ", ryzyko wysyłki " + P("wysylka") + ".",
      "Zakres: " + (meta.scope || "") + ", cena łączna " + (meta.budget || "") + ". Nie licytowano, nie kupowano i nie kontaktowano się ze sprzedawcami – stan i oryginalność trzeba potwierdzić przed zakupem (numer seryjny, zdjęcia detali, najlepiej odbiór osobisty)."
    ].map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("");
    var so = meta.sources || {};
    $("sources").innerHTML = Object.keys(so).map(function (k) { return "<li><b>" + esc(k) + "</b> – " + esc(so[k]) + "</li>"; }).join("") + (meta.skipped || []).map(function (s) { return "<li>Pominięte: " + esc(s) + "</li>"; }).join("");
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.view) { state.view = b.dataset.view; render(); }
    else if (b.dataset.id) toggleMark(b.dataset.id, b.dataset.k);
  });
  ["sort", "src", "verdict"].forEach(function (id) { $(id).addEventListener("change", function (e) { state[id] = e.target.value; render(); }); });
  $("verified").addEventListener("change", function (e) { state.verified = e.target.checked; render(); });
  window.addEventListener("storage", function (e) { if (e.key === KEY && DATA) { marks = loadMarks(); render(); syncBox(); } });
  // Powrót do karty (iOS przywraca stronę z pamięci) → ponownie wczytaj oznaczenia
  window.addEventListener("pageshow", function () { if (DATA) { marks = Object.assign({}, marks, loadMarks()); render(); } });

  store.ls = probeLS(); store.ck = probeCK();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }
  marks = loadMarks();
  if (store.ls && !localStorage.getItem(KEY) && Object.keys(marks).length) saveMarks(); // odtworzone z cookie → zapisz z powrotem
  // Import z linku (#m=OKG1:...) – np. z widoku w aplikacji Grok
  function hashImport() {
    var hm = location.hash.match(/[#&]m=([^&]+)/);
    if (!hm) return;
    var n = importMarks(decodeURIComponent(hm[1]));
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { }
    if (n) { var el = $("store"); if (el) el.textContent += " Zaimportowano z linku: " + n + "."; }
  }
  window.addEventListener("hashchange", function () { hashImport(); });
  storeNote(); syncBox();
  hashImport();
  $("sort").value = state.sort;
  $("mcopy").addEventListener("click", function () { var t = $("mcode"); t.select(); var done = function () { $("mmsg").textContent = "Skopiowano kod."; }; try { navigator.clipboard.writeText(t.value).then(done, function () { document.execCommand("copy"); done(); }); } catch (e) { document.execCommand("copy"); done(); } });
  $("mimport").addEventListener("click", function () { var n = importMarks($("min").value); $("mmsg").textContent = n ? "Zaimportowano oznaczenia: " + n + "." : "Nieprawidłowy kod."; if (n) $("min").value = ""; });
  fetch("data/offers.json?v=" + Date.now(), { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
    DATA = d; header(); render();
  }).catch(function (err) { $("summary").textContent = "Nie udało się wczytać danych (" + err.message + ")."; });
})();
