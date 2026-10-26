(function () {
  "use strict";
  var KEY = "okazje-gitarowe-marks-v1";
  var FKEY = "okazje-gitarowe-filters-v1"; // osobny klucz – filtry nigdy nie dotykają oznaczeń
  var SCORES = [["cena", "Cena vs wartość"], ["stan", "Stan"], ["sprzedawca", "Wiarygodność sprzedawcy"], ["oryginalnosc", "Oryginalność / ryzyko podróbki"], ["grywalnosc", "Grywalność i specyfikacja"], ["plynnosc", "Płynność odsprzedaży"], ["wysylka", "Ryzyko wysyłki i cła (10 = niskie)"]];
  var VIEWS = [["aktywne", "Aktywne"], ["ulubione", "Ulubione"], ["kupione", "Kupione"], ["archiwum", "Archiwum"], ["wszystkie", "Wszystkie"]];
  var BASE_SOURCES = ["OLX", "Allegro Lokalnie", "Sprzedajemy", "Kleinanzeigen", "willhaben", "Marktplaats", "2dehands", "Blocket", "Tori", "DBA", "FINN", "Bazoš.cz", "Bazoš.sk", "Reverb", "eBay"];
  var TYPE_ALL = ["Strat / ST", "Tele / T", "Les Paul / LP", "SG", "Semi-hollow / hollow", "Superstrat", "Offset", "Double-cut (PRS)", "Explorer / V / kształty", "Inne"];
  var BRAND_POP = ["Fender", "Gibson", "PRS", "Music Man", "Gretsch", "Ibanez", "ESP", "Jackson", "Charvel", "Schecter", "Suhr", "Tom Anderson", "Mayones", "Duesenberg", "Rickenbacker", "G&L", "Yamaha", "Epiphone", "Squier", "EVH", "Strandberg", "Hagström", "Heritage", "Godin", "Eastman", "Nik Huber", "Knaggs", "Inna"];
  var showAllBrands = false;
  var VERDICTS = ["polecam", "do rozważenia", "nie polecam"];
  var PRESETS = [["do 7 tys.", 0, 7000], ["7–10 tys.", 7000, 10000], ["10–15 tys.", 10000, 15000]];
  var DEF = { view: "aktywne", sort: "new", q: "", src: [], type: [], brand: [], verdict: [], pmin: null, pmax: null, verified: false };
  var state = loadFilters();
  var DATA = null, marks = {};

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function zl(n) { return Math.round(n).toLocaleString("pl-PL") + " zł"; }
  function dt(s) { return s ? String(s).slice(0, 10).split("-").reverse().join(".") : "–"; }
  function pct(n) { return (n > 0 ? "−" : "+") + Math.abs(n).toLocaleString("pl-PL", { maximumFractionDigits: 0 }) + "%"; }
  function plural(n, a, b, c) { var m10 = n % 10, m100 = n % 100; return n + " " + (n === 1 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c); }
  function icon(id) { return '<svg class="ic" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l"); }

  // ---- Filtry: zapamiętywane w localStorage (osobny klucz); w ramce bez pamięci działają w sesji ----
  function loadFilters() {
    var s = JSON.parse(JSON.stringify(DEF));
    try { var raw = localStorage.getItem(FKEY); if (raw) { var o = JSON.parse(raw); Object.keys(DEF).forEach(function (k) { if (o[k] !== undefined && typeof o[k] === typeof DEF[k] || (k === "pmin" || k === "pmax") && (o[k] === null || typeof o[k] === "number")) s[k] = o[k]; }); } } catch (e) { }
    ["src", "type", "brand", "verdict"].forEach(function (k) { if (!Array.isArray(s[k])) s[k] = []; });
    return s;
  }
  function saveFilters() { try { localStorage.setItem(FKEY, JSON.stringify(state)); } catch (e) { } }
  function activeCount() { return state.src.length + state.type.length + state.brand.length + state.verdict.length + (state.pmin != null || state.pmax != null ? 1 : 0) + (state.verified ? 1 : 0); }

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
    total: function (a, b) { return a.price.razem - b.price.razem; },
    totalDesc: function (a, b) { return b.price.razem - a.price.razem; }
  };

  function card(o) {
    var m = marks[o.id] || {};
    var tone = o.verdict === "polecam" ? "ok" : o.verdict === "nie polecam" ? "bad" : "warn";
    var p = o.price;
    var cur = { EUR: "€", USD: "$", GBP: "£" }[o.currency] || o.currency;
    var orig = o.currency === "PLN" ? zl(o.priceOriginal) : o.priceOriginal.toLocaleString("pl-PL") + " " + cur + " = " + zl(p.cena);
    var valid = o.auctionEnd ? "aukcja · koniec " + dtt(o.auctionEnd) : o.validTo ? "kup teraz · ważne do " + dt(o.validTo) : "kup teraz · bez daty końca";
    var rows = [["Stan", o.condition], ["Cena w ogłoszeniu", orig], ["Wysyłka do PL", zl(p.wysylka) + " – " + o.shippingNote], ["Cło (3,2%)", zl(p.clo)], ["VAT importowy (23%)", zl(p.vat)], ["Opłaty przewoźnika / agencji", zl(p.oplaty) + " – " + o.customsNote], ["Razem", zl(p.razem)], ["Wartość rynkowa", "≈ " + zl(o.marketValue) + (o.valueVerified ? "" : " (niezweryfikowana)")], ["Wycena", o.valueMethod], ["Aukcja / ważność", valid], ["Wystawione", dt(o.postedOrSince)], ["Pierwszy raz w zestawieniu", dtt(o.firstSeen)], ["ID", o.id]];
    var MK = [["fav", "Ulubione", "heart"], ["bought", "Kupione", "bag"], ["arch", "Archiwum", "archive"]];
    return '<article class="card' + (m.arch ? " arch" : "") + '" aria-labelledby="t-' + esc(o.id) + '">' +
      '<a class="ph" href="' + esc(o.url) + '" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true"><img loading="lazy" decoding="async" width="800" height="500" referrerpolicy="no-referrer" src="' + esc(o.photo) + '" alt="" onerror="this.parentNode.classList.add(\'err\')"><span class="fb">' + icon("photo") + 'Zdjęcie w ogłoszeniu</span>' +
      '<span class="ph-tags">' + (isNew(o) ? '<span class="pill new">NOWE</span>' : "") + '<span class="pill">' + esc(o.source) + '</span>' + (m.arch ? '<span class="pill">W archiwum</span>' : "") + (m.bought ? '<span class="pill">Kupione</span>' : "") + '</span>' +
      '<span class="deal' + (o.dealPct > 0 ? "" : " neg") + '">' + pct(o.dealPct) + '<small>' + (o.dealPct > 0 ? "pod wartością" : "nad wartością") + '</small></span></a>' +
      '<div class="body">' +
      '<div class="kicker"><b>' + esc(o.brand || "") + '</b><span>' + esc(o.type || "") + '</span></div>' +
      '<a class="title" id="t-' + esc(o.id) + '" href="' + esc(o.url) + '" target="_blank" rel="noopener noreferrer">' + esc(o.title) + '</a>' +
      '<div class="loc">' + esc(o.location || "–") + ' · oryg.: „' + esc(o.originalTitle) + '”</div>' +
      '<div class="prices"><div class="pc main"><span>Razem z dostawą</span><b>' + zl(p.razem) + '</b></div><div class="pc"><span>Wartość</span><b>≈ ' + zl(o.marketValue) + '</b></div><div class="pc"><span>Różnica</span><b>' + (o.marketValue - p.razem > 0 ? "+" : "") + zl(o.marketValue - p.razem) + '</b></div></div>' +
      (o.valueVerified ? "" : '<div class="store bad">Wartość rynkowa niezweryfikowana</div>') +
      '<div class="verdict ' + tone + '"><div class="score">' + o.overall.toFixed(1).replace(".", ",") + '<small>/10</small></div><div><div class="vtext"><span class="dot"></span>' + esc(o.verdict) + '</div><div class="vsub">ocena ogólna · ' + esc(valid) + '</div></div></div>' +
      '<p class="reason">' + esc(o.reasoning) + '</p>' +
      '<div class="marks">' + MK.map(function (x) { var on = !!m[x[0]]; return '<button type="button" class="mk" data-id="' + esc(o.id) + '" data-k="' + x[0] + '" aria-pressed="' + on + '">' + icon(x[2]) + x[1] + '</button>'; }).join("") + '</div>' +
      '<details class="more"><summary>Szczegóły, wycena i źródła' + '<svg class="ic chev" aria-hidden="true"><use href="#i-chev"/></svg></summary><div class="more-body"><p class="desc">' + esc(o.description) + '</p>' +
      '<table class="props"><caption class="sr-only">Rozbicie ceny i dane oferty</caption>' + rows.map(function (r) { return '<tr' + (r[0] === "Razem" ? ' class="sum"' : "") + '><th scope="row">' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join("") + '</table>' +
      '<div class="scores" role="list" aria-label="Oceny 1–10">' + SCORES.map(function (s) { var v = o.scores[s[0]]; return '<div class="sb" role="listitem"><span>' + s[1] + '</span><div class="tr" aria-hidden="true"><i style="width:' + v * 10 + '%"></i></div><b>' + v + '</b></div>'; }).join("") + '</div>' +
      '<ul class="links"><li><a href="' + esc(o.url) + '" target="_blank" rel="noopener noreferrer">' + icon("ext") + '<span>Otwórz ogłoszenie (' + esc(o.source) + ')</span></a></li>' + o.valueSources.map(function (s) { return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + icon("ext") + '<span><small>Źródło wyceny</small>' + esc(s.label) + '</span></a></li>'; }).join("") + '</ul></div></details>' +
      '</div></article>';
  }

  function inView(o) {
    var m = marks[o.id] || {};
    if (state.view === "aktywne" && m.arch) return false;
    if (state.view === "ulubione" && !m.fav) return false;
    if (state.view === "kupione" && !m.bought) return false;
    if (state.view === "archiwum" && !m.arch) return false;
    return true;
  }
  function matches(o, skip) {
    if (skip !== "src" && state.src.length && state.src.indexOf(o.source) < 0) return false;
    if (skip !== "type" && state.type.length && state.type.indexOf(o.type || "Inne") < 0) return false;
    if (skip !== "brand" && state.brand.length && state.brand.indexOf(o.brand || "Inna") < 0) return false;
    if (skip !== "verdict" && state.verdict.length && state.verdict.indexOf(o.verdict) < 0) return false;
    if (state.pmin != null && o.price.razem < state.pmin) return false;
    if (state.pmax != null && o.price.razem > state.pmax) return false;
    if (state.verified && !o.valueVerified) return false;
    if (state.q) {
      var hay = o._hay || (o._hay = norm([o.title, o.originalTitle, o.brand, o.type, o.source, o.location, o.description, o.condition, o.verdict, o.listingType === "auction" ? "aukcja licytacja" : "kup teraz", o.valueVerified ? "zweryfikowana" : "", o.reasoning && o.reasoning.play, o.reasoning && o.reasoning.resale].join(" ")));
      var words = norm(state.q).split(/\s+/).filter(Boolean);
      for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) < 0) return false;
    }
    return true;
  }
  function filtered() { return DATA.offers.filter(function (o) { return inView(o) && matches(o); }); }

  function render() {
    if (!DATA) return;
    var offers = DATA.offers;
    var cnt = function (f) { return offers.filter(function (o) { return f(marks[o.id] || {}); }).length; };
    var counts = { aktywne: offers.length - cnt(function (m) { return m.arch; }), ulubione: cnt(function (m) { return m.fav; }), kupione: cnt(function (m) { return m.bought; }), archiwum: cnt(function (m) { return m.arch; }), wszystkie: offers.length };
    $("views").innerHTML = VIEWS.map(function (v) { var on = state.view === v[0]; return '<button type="button" role="radio" aria-checked="' + on + '" tabindex="' + (on ? 0 : -1) + '" data-view="' + v[0] + '">' + v[1] + '<small>' + counts[v[0]] + '</small></button>'; }).join("");
    var list = filtered().sort(SORTS[state.sort] || SORTS["new"]);
    var n = activeCount() + (state.q ? 1 : 0);
    $("count").textContent = list.length ? plural(list.length, "oferta", "oferty", "ofert") + (n ? " po filtrach" : "") : "Brak wyników";
    var fb = $("fbadge"); fb.hidden = !activeCount(); fb.textContent = activeCount();
    $("openFilters").setAttribute("aria-label", "Filtry" + (activeCount() ? " (aktywne: " + activeCount() + ")" : ""));
    renderChips();
    var g = $("grid");
    g.innerHTML = list.length ? list.map(card).join("") : emptyState();
    g.setAttribute("aria-busy", "false");
    $("applyFilters").textContent = list.length ? "Pokaż " + plural(list.length, "ofertę", "oferty", "ofert") : "Brak ofert – zmień filtry";
    if (!$("sheet").hidden) renderSheet();
  }
  function emptyState() {
    var ebOnly = state.src.length === 1 && state.src[0] === "eBay";
    var msg = ebOnly ? "eBay: " + ((DATA.meta.sources || {}).eBay || "brak ofert") + "." : state.view !== "aktywne" && state.view !== "wszystkie" && !activeCount() && !state.q ? "Nie masz jeszcze ofert w tym widoku. Oznacz ofertę przyciskiem pod kartą." : "Żadna oferta nie pasuje do wyszukiwania i filtrów. Poluzuj filtry albo zmień frazę.";
    return '<div class="empty"><b>Brak ofert</b>' + esc(msg) + (activeCount() || state.q ? '<br><button type="button" class="btn btn-tint" data-act="clear">Wyczyść filtry</button>' : "") + '</div>';
  }
  function renderChips() {
    var c = [];
    if (state.q) c.push(["q", "", "„" + state.q + "”"]);
    state.src.forEach(function (v) { c.push(["src", v, v]); });
    state.type.forEach(function (v) { c.push(["type", v, v]); });
    state.brand.forEach(function (v) { c.push(["brand", v, v]); });
    state.verdict.forEach(function (v) { c.push(["verdict", v, v]); });
    if (state.pmin != null || state.pmax != null) c.push(["price", "", (state.pmin != null ? zl(state.pmin) : "0 zł") + " – " + (state.pmax != null ? zl(state.pmax) : "bez limitu")]);
    if (state.verified) c.push(["verified", "", "zweryfikowana wartość"]);
    $("chips").innerHTML = c.map(function (x) { return '<button type="button" class="chip" data-chip="' + x[0] + '" data-v="' + esc(x[1]) + '" aria-label="Usuń filtr: ' + esc(x[2]) + '">' + esc(x[2]) + icon("x") + '</button>'; }).join("") + (c.length > 1 ? '<button type="button" class="chip clear" data-act="clear">Wyczyść filtry</button>' : "");
  }
  function opt(group, value, label, count) {
    var on = state[group].indexOf(value) >= 0;
    return '<button type="button" class="opt' + (count === 0 && !on ? " zero" : "") + '" data-g="' + group + '" data-v="' + esc(value) + '" aria-pressed="' + on + '">' + esc(label) + (count != null ? '<small>' + count + '</small>' : "") + '</button>';
  }
  function facet(group, values) {
    var base = DATA.offers.filter(function (o) { return inView(o) && matches(o, group); });
    var key = { src: "source", type: "type", brand: "brand", verdict: "verdict" }[group], dflt = { type: "Inne", brand: "Inna" }[group];
    return values.map(function (v) { return opt(group, v, v, base.filter(function (o) { return (o[key] || dflt) === v; }).length); }).join("");
  }
  function uniq(key, order) {
    var s = {}; DATA.offers.forEach(function (o) { if (o[key]) s[o[key]] = 1; });
    var xs = Object.keys(s);
    if (order) xs.sort(function (a, b) { var i = order.indexOf(a), j = order.indexOf(b); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j) || a.localeCompare(b, "pl"); });
    else xs.sort(function (a, b) { return a.localeCompare(b, "pl"); });
    return xs;
  }
  function brandList() {
    var c = {}; DATA.offers.forEach(function (o) { var b = o.brand || "Inna"; c[b] = (c[b] || 0) + 1; });
    var have = Object.keys(c).sort(function (a, b) { return c[b] - c[a] || a.localeCompare(b, "pl"); });
    state.brand.forEach(function (b) { if (have.indexOf(b) < 0) have.push(b); });
    var rest = BRAND_POP.filter(function (b) { return have.indexOf(b) < 0; });
    return { shown: showAllBrands ? have.concat(rest) : have, more: rest.length };
  }
  function resetBtns() {
    document.querySelectorAll("[data-reset]").forEach(function (b) { var k = b.dataset.reset; b.hidden = k === "price" ? state.pmin == null && state.pmax == null : !state[k].length; });
  }
  function renderSheet() {
    var srcs = BASE_SOURCES.slice(); uniq("source").forEach(function (s) { if (srcs.indexOf(s) < 0) srcs.push(s); });
    $("f-src").innerHTML = facet("src", srcs);
    var eb = (DATA.meta.sources || {}).eBay || "";
    $("f-src-note").textContent = DATA.offers.some(function (o) { return o.source === "eBay"; }) ? "" : "eBay: " + eb + ".";
    var types = TYPE_ALL.slice(); (DATA.meta.types || []).concat(uniq("type")).forEach(function (t) { if (types.indexOf(t) < 0) types.splice(types.length - 1, 0, t); });
    $("f-type").innerHTML = facet("type", types);
    var bl = brandList();
    $("f-brand").innerHTML = facet("brand", bl.shown) + (bl.more ? '<button type="button" class="opt more" data-act="brands" aria-expanded="' + showAllBrands + '">' + (showAllBrands ? "Pokaż mniej" : "Pokaż wszystkie (+" + bl.more + ")") + '</button>' : "");
    resetBtns();
    $("f-verdict").innerHTML = facet("verdict", VERDICTS);
    $("f-preset").innerHTML = PRESETS.map(function (p) { var on = state.pmin === (p[1] || null) && state.pmax === p[2]; return '<button type="button" class="opt" data-preset="' + p[1] + "-" + p[2] + '" aria-pressed="' + on + '">' + p[0] + '</button>'; }).join("");
    if (document.activeElement !== $("pmin")) $("pmin").value = state.pmin != null ? state.pmin : "";
    if (document.activeElement !== $("pmax")) $("pmax").value = state.pmax != null ? state.pmax : "";
    $("verified").checked = state.verified;
    resetBtns();
  }
  function update() { saveFilters(); render(); }
  function clearFilters() { var keep = { view: state.view, sort: state.sort }; state = JSON.parse(JSON.stringify(DEF)); state.view = keep.view; state.sort = keep.sort; $("q").value = ""; update(); }

  var lastFocus = null;
  function openSheet() { lastFocus = document.activeElement; $("sheet").hidden = false; renderSheet(); document.body.style.overflow = "hidden"; setTimeout(function () { var b = $("sheet").querySelector(".sheet-head .icon-btn"); if (b) b.focus(); }, 30); }
  function closeSheet() { $("sheet").hidden = true; document.body.style.overflow = ""; if (lastFocus && lastFocus.focus) lastFocus.focus(); }

  function header() {
    var meta = DATA.meta, offers = DATA.offers;
    var upd = new Date(meta.updated.replace(/\+00:00$/, "Z"));
    var updTxt = isNaN(upd) ? meta.updated : upd.toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    $("summary").textContent = "Gitary elektryczne · " + (meta.budget || "") + " · aktualizacja " + updTxt;
    var best = offers.filter(function (o) { return o.valueVerified; }).sort(function (a, b) { return b.dealPct - a.dealPct; })[0];
    var pol = offers.filter(function (o) { return o.verdict === "polecam"; }).length;
    var nNew = offers.filter(isNew).length;
    var fx = meta.fx;
    $("metrics").innerHTML = [[offers.length, plural(offers.length, "oferta", "oferty", "ofert").replace(/^\d+ /, ""), ""], [nNew, "nowe w 24 h", ""], [pol, "„polecam”", ""], [best ? pct(best.dealPct) : "–", "największa okazja", "hl"], [String(fx.EUR).replace(".", ","), "zł za 1 € (NBP)", ""]].map(function (x) { return '<div class="metric ' + x[2] + '"><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></div>'; }).join("");
    var w = meta.weights || {};
    var P = function (k) { return Math.round((w[k] || 0) * 100) + "%"; };
    $("method").innerHTML = [
      "Okazja = cena łączna w Polsce wyraźnie poniżej wartości rynkowej. Okazja % = (wartość − cena łączna) / wartość.",
      "Cena łączna = cena + wysyłka do PL. Dla wysyłek spoza UE doliczamy cło 3,2% (CN 9202), VAT 23% od (cena + wysyłka + cło) oraz opłatę agencji celnej przewoźnika ok. 50–100 zł (w obliczeniach 75 zł).",
      "Wysyłka: Reverb – stawka do Polski z API Reverb; eBay – najtańsza opcja dostawy do PL z eBay Browse API; OLX – założenie 80 zł za kuriera z ubezpieczeniem (lub odbiór osobisty); Kleinanzeigen – założenie 50 € za ubezpieczoną paczkę DHL DE→PL; willhaben, Marktplaats, 2dehands – ok. 45 €; Blocket, Tori, DBA – ok. 60 €; FINN (Norwegia, spoza UE) – ok. 70 € plus cło 3,2%, VAT 23% i opłata agencji; Bazoš – ok. 25 €; Allegro Lokalnie i Sprzedajemy – 80 zł. Wysyłkę za granicę zawsze trzeba potwierdzić ze sprzedawcą.",
      "Kurs walut: " + fx.source + " (EUR " + fx.EUR + ", USD " + fx.USD + ", GBP " + fx.GBP + ").",
      "Wartość rynkowa = mediana cen ofertowych porównywalnych UŻYWANYCH egzemplarzy tego samego modelu (Reverb – sprzedawcy z UE, OLX, Kleinanzeigen, a także willhaben, Marktplaats, 2dehands, Blocket, Tori, DBA, FINN, Bazoš i Allegro Lokalnie). To ceny wywoławcze, a nie transakcyjne – dane o sprzedanych egzemplarzach nie były dostępne, więc realne ceny sprzedaży mogą być niższe.",
      "Typ gitary i producent są wyprowadzane automatycznie z tytułu ogłoszenia (np. ES-335 → semi-hollow, McCarty 594 → double-cut PRS).",
      "Ocena ogólna (1–10) = średnia ważona: cena vs wartość " + P("cena") + ", grywalność " + P("grywalnosc") + ", płynność odsprzedaży " + P("plynnosc") + " (gra i odsprzedaż mają równą wagę), stan " + P("stan") + ", sprzedawca " + P("sprzedawca") + ", oryginalność " + P("oryginalnosc") + ", ryzyko wysyłki " + P("wysylka") + ".",
      "„NOWE” = oferta pierwszy raz w zestawieniu w ciągu ostatnich 24 h. Domyślnie najnowsze są na górze.",
      "Zakres: " + (meta.scope || "") + ", cena łączna " + (meta.budget || "") + ". Nie licytowano, nie kupowano i nie kontaktowano się ze sprzedawcami – stan i oryginalność trzeba potwierdzić przed zakupem (numer seryjny, zdjęcia detali, najlepiej odbiór osobisty)."
    ].map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("");
    var so = meta.sources || {};
    $("sources").innerHTML = Object.keys(so).map(function (k) { return "<li><b>" + esc(k) + "</b> – " + esc(so[k]) + "</li>"; }).join("") + (meta.skipped || []).map(function (s) { return "<li>Pominięte: " + esc(s) + "</li>"; }).join("") + (meta.removed || []).map(function (r) { return "<li>Usunięte " + esc(dtt(r.removedAt)) + ": " + esc(r.title) + " – " + esc(r.reason) + "</li>"; }).join("");
  }

  // ---- Motyw: domyślnie ciemny, przełącznik Ciemny / Jasny ----
  var THEMES = [["dark", "ciemny", "moon"], ["light", "jasny", "sun"]];
  function curTheme() { return document.documentElement.dataset.theme === "light" ? "light" : "dark"; }
  function paintTheme() {
    var t = curTheme(), nx = t === "dark" ? THEMES[1] : THEMES[0];
    document.documentElement.dataset.theme = t;
    $("theme").innerHTML = icon(nx[2]); $("theme").setAttribute("aria-label", "Motyw: " + (t === "dark" ? "ciemny" : "jasny") + ". Przełącz na " + nx[1]);
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) { m.setAttribute("content", t === "dark" ? "#000000" : "#ffffff"); });
  }
  $("theme").addEventListener("click", function () {
    var n = curTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = n;
    try { localStorage.setItem("okg-theme", n); } catch (e) { }
    paintTheme();
  });
  paintTheme();

  // ---- Zdarzenia ----
  document.addEventListener("click", function (e) {
    var b = e.target.closest("button,[data-close]");
    if (!b) return;
    if (b.dataset.close) { closeSheet(); return; }
    if (b.dataset.view) { state.view = b.dataset.view; update(); return; }
    if (b.dataset.id) { toggleMark(b.dataset.id, b.dataset.k); return; }
    if (b.dataset.act === "clear") { clearFilters(); return; }
    if (b.dataset.act === "brands") { showAllBrands = !showAllBrands; renderSheet(); var mb = $("f-brand").querySelector(".more"); if (mb) mb.focus(); return; }
    if (b.dataset.reset) { if (b.dataset.reset === "price") { state.pmin = state.pmax = null; $("pmin").value = $("pmax").value = ""; } else state[b.dataset.reset] = []; update(); return; }
    if (b.dataset.g) { var g = b.dataset.g, a = state[g], v = b.dataset.v, i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); update(); var nb = $("sheet").hidden ? null : $("sheet").querySelector('[data-g="' + g + '"][data-v="' + (window.CSS && CSS.escape ? CSS.escape(v) : v) + '"]'); if (nb) nb.focus(); return; }
    if (b.dataset.preset) { var pr = b.dataset.preset.split("-").map(Number); var same = state.pmin === (pr[0] || null) && state.pmax === pr[1]; state.pmin = same ? null : (pr[0] || null); state.pmax = same ? null : pr[1]; update(); return; }
    if (b.dataset.chip) {
      var k = b.dataset.chip, val = b.dataset.v;
      if (k === "q") { state.q = ""; $("q").value = ""; }
      else if (k === "price") { state.pmin = state.pmax = null; }
      else if (k === "verified") state.verified = false;
      else state[k] = state[k].filter(function (x) { return x !== val; });
      update(); return;
    }
  });
  $("views").addEventListener("keydown", function (e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    var i = VIEWS.map(function (v) { return v[0]; }).indexOf(state.view); i = (i + (e.key === "ArrowRight" ? 1 : VIEWS.length - 1)) % VIEWS.length;
    state.view = VIEWS[i][0]; update(); var b = $("views").querySelector('[data-view="' + state.view + '"]'); if (b) b.focus();
  });
  $("searchForm").addEventListener("submit", function (e) { e.preventDefault(); state.q = $("q").value.trim(); update(); $("q").blur(); var r = $("count"); if (r && r.scrollIntoView && window.scrollY > r.offsetTop) r.scrollIntoView({ block: "start" }); });
  $("q").addEventListener("search", function () { if (!$("q").value && state.q) { state.q = ""; update(); } }); // przycisk ✕ w polu
  var qt; $("q").addEventListener("input", function () { clearTimeout(qt); qt = setTimeout(function () { var v = $("q").value.trim(); if (v !== state.q) { state.q = v; update(); } }, 180); }); // wyszukiwanie na żywo
  $("openFilters").addEventListener("click", openSheet);
  $("clearFilters").addEventListener("click", clearFilters);
  $("sort").addEventListener("change", function (e) { state.sort = e.target.value; update(); });
  $("verified").addEventListener("change", function (e) { state.verified = e.target.checked; update(); });
  function priceInput() { var a = parseInt($("pmin").value, 10), b = parseInt($("pmax").value, 10); state.pmin = isNaN(a) || a <= 0 ? null : a; state.pmax = isNaN(b) || b <= 0 ? null : b; if (state.pmin != null && state.pmax != null && state.pmin > state.pmax) { var t = state.pmin; state.pmin = state.pmax; state.pmax = t; } update(); }
  var pt; ["pmin", "pmax"].forEach(function (id) { $(id).addEventListener("input", function () { clearTimeout(pt); pt = setTimeout(priceInput, 300); }); $(id).addEventListener("change", priceInput); });
  document.addEventListener("keydown", function (e) {
    if ($("sheet").hidden) return;
    if (e.key === "Escape") { closeSheet(); return; }
    if (e.key === "Tab") { var f = $("sheet").querySelectorAll("button,input,select,textarea"); var v = Array.prototype.filter.call(f, function (x) { return x.offsetParent !== null; }); if (!v.length) return; var first = v[0], last = v[v.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
  });
  var bar = $("bar");
  if ("IntersectionObserver" in window) { var s = document.createElement("div"); s.style.height = "1px"; bar.parentNode.insertBefore(s, bar); new IntersectionObserver(function (en) { bar.classList.toggle("stuck", !en[0].isIntersecting); }).observe(s); }

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
  $("q").value = state.q;
  $("mcopy").addEventListener("click", function () { var t = $("mcode"); t.select(); var done = function () { $("mmsg").textContent = "Skopiowano kod."; }; try { navigator.clipboard.writeText(t.value).then(done, function () { document.execCommand("copy"); done(); }); } catch (e) { document.execCommand("copy"); done(); } });
  $("mimport").addEventListener("click", function () { var n = importMarks($("min").value); $("mmsg").textContent = n ? "Zaimportowano oznaczenia: " + n + "." : "Nieprawidłowy kod."; if (n) $("min").value = ""; });
  fetch("data/offers.json?v=" + Date.now(), { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
    DATA = d; header(); render(); $("dsrc").textContent = "Dane wczytane: data/offers.json.";
  }).catch(function (err) { $("summary").textContent = "Nie udało się wczytać danych (" + err.message + "). Odśwież stronę za chwilę."; $("grid").setAttribute("aria-busy", "false"); $("count").textContent = "Błąd wczytywania danych"; });
})();
