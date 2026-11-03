/* Okazje gitarowe – zakładka „Koncerty”. Osobny moduł: nie dotyka oznaczeń gitar (okazje-gitarowe-marks-v1 / okg_marks / OKG1). */
(function () {
  "use strict";
  var MKEY = "okazje-gitarowe-concert-marks-v1", FKEY = "okazje-gitarowe-concert-filters-v1", TKEY = "okazje-gitarowe-tab-v1";
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function plural(n, a, b, c) { var m10 = n % 10, m100 = n % 100; return n + " " + (n === 1 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c); }
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v && typeof v === "object" ? v : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function fold(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l"); }
  var MONTHS = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
  var MSHORT = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
  var MGEN = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
  var WD = ["niedz.", "pon.", "wt.", "śr.", "czw.", "pt.", "sob."];
  var marks = load(MKEY, {}), F = load(FKEY, {}), D = null, loaded = false, FIRST = "";
  F = { view: F.view || "up", group: F.group || "all", city: F.city || "", month: F.month || "", q: "" };
  var VIEWS = [["up", "Nadchodzące"], ["fav", "Ulubione"], ["got", "Mam bilet"], ["hid", "Ukryte"], ["arch", "Archiwum"]];
  var GROUPS = [["all", "Wszystkie"], ["moi", "Tylko moi artyści"], ["podobne", "Podobne"]];

  function setTab(t, push) {
    var c = t === "koncerty";
    document.body.dataset.tab = c ? "koncerty" : "gitary";
    [].forEach.call(document.querySelectorAll("#tabs button"), function (b) { b.setAttribute("aria-checked", String(b.dataset.tab === (c ? "koncerty" : "gitary"))); });
    try { localStorage.setItem(TKEY, c ? "koncerty" : "gitary"); } catch (e) {}
    if (push) { var h = location.hash.replace(/^#/, "").split("&").filter(function (x) { return x && x !== "koncerty"; }); if (c) h.push("koncerty"); history.replaceState(null, "", location.pathname + location.search + (h.length ? "#" + h.join("&") : "")); }
    if (c && !loaded) init();
  }
  function seg(el, items, cur, onpick, counts) {
    el.innerHTML = items.map(function (x) { return '<button type="button" role="radio" data-v="' + x[0] + '" aria-checked="' + (x[0] === cur) + '">' + esc(x[1]) + (counts ? " <small>" + (counts[x[0]] || 0) + "</small>" : "") + "</button>"; }).join("");
    [].forEach.call(el.querySelectorAll("button"), function (b) { b.onclick = function () { onpick(b.dataset.v); }; });
  }
  function mk(id) { return marks[id] || ""; }
  function setMark(id, m) { if (marks[id] === m) delete marks[id]; else marks[id] = m; save(MKEY, marks); render(); }
  function inView(c, arch) {
    var m = mk(c.id);
    if (F.view === "arch") return arch;
    if (arch) return false;
    if (F.view === "fav") return m === "fav";
    if (F.view === "got") return m === "got";
    if (F.view === "hid") return m === "hid";
    return m !== "hid";
  }
  function pass(c) {
    if (F.group !== "all" && c.group !== F.group) return false;
    if (F.city && c.city !== F.city) return false;
    if (F.month && c.date.slice(0, 7) !== F.month) return false;
    if (F.q) { var h = fold([c.artist, c.title, c.city, c.venue, c.source].join(" ")); if (!fold(F.q).split(/\s+/).every(function (w) { return h.indexOf(w) >= 0; })) return false; }
    return true;
  }
  function price(c) { return c.soldOut ? "Wyprzedane" : c.priceFrom ? "od " + String(Math.round(c.priceFrom)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " zł" : "cena na stronie"; }
  function card(c, arch) {
    var d = new Date(c.date + "T12:00:00"), m = mk(c.id);
    var links = [{ source: c.source, url: c.url }].concat(c.alt || []);
    var isNew = c.firstSeen && c.firstSeen.slice(0, 10) > FIRST && (Date.now() - new Date(c.firstSeen).getTime()) < 36e5 * 30;
    return '<article class="cc' + (arch ? " arch" : "") + (c.group === "moi" ? " moi" : "") + '" data-id="' + esc(c.id) + '">' +
      '<div class="cc-date" aria-hidden="true"><b>' + d.getDate() + '</b><span>' + MSHORT[d.getMonth()] + '</span><small>' + WD[d.getDay()] + '</small></div>' +
      '<div class="cc-body">' +
        '<p class="cc-kick"><span class="score s' + (c.score >= 9 ? "hi" : c.score >= 7 ? "mid" : "lo") + '">' + c.score + '/10</span>' + (c.group === "moi" ? '<span class="tag">Twój artysta</span>' : "") + (isNew && !arch ? '<span class="tag new">Nowy</span>' : "") + (c.status ? '<span class="tag warn">' + esc(c.status) + "</span>" : "") + (arch ? '<span class="tag">' + esc(c.archiveReason || "archiwum") + "</span>" : "") + "</p>" +
        '<h3 class="cc-title">' + esc(c.title) + "</h3>" +
        '<p class="cc-meta"><span class="sr-only">' + WD[d.getDay()] + " " + d.getDate() + " " + MGEN[d.getMonth()] + " " + d.getFullYear() + ", </span>" + (c.time ? esc(c.time) + " · " : "") + esc(c.city) + (c.venue ? " · " + esc(c.venue) : "") + "</p>" +
        '<p class="cc-why">' + esc(c.reason) + "</p>" +
        '<div class="cc-foot"><span class="cc-price' + (c.soldOut ? " sold" : "") + '">' + esc(price(c)) + "</span>" +
          links.map(function (l, i) { return '<a class="btn ' + (i ? "btn-plain" : "btn-tint") + ' cc-link" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + (i ? "" : "Bilety · ") + esc(l.source) + "</a>"; }).join("") +
        "</div>" +
        (arch ? "" : '<div class="cc-marks" role="group" aria-label="Oznacz koncert">' +
          '<button type="button" class="mk" data-m="fav" aria-pressed="' + (m === "fav") + '"><svg class="ic" aria-hidden="true"><use href="#i-heart"/></svg>Ulubiony</button>' +
          '<button type="button" class="mk" data-m="got" aria-pressed="' + (m === "got") + '"><svg class="ic" aria-hidden="true"><use href="#i-bag"/></svg>Mam bilet</button>' +
          '<button type="button" class="mk" data-m="hid" aria-pressed="' + (m === "hid") + '"><svg class="ic" aria-hidden="true"><use href="#i-x"/></svg>' + (m === "hid" ? "Przywróć" : "Ukryj") + "</button></div>") +
      "</div>" +
      (c.image ? '<img class="cc-img" src="' + esc(c.image) + '" alt="" loading="lazy" decoding="async" width="72" height="72" referrerpolicy="no-referrer" onerror="this.remove()">' : "") +
    "</article>";
  }
  function render() {
    if (!D) return;
    save(FKEY, { view: F.view, group: F.group, city: F.city, month: F.month });
    var all = D.concerts.map(function (c) { return [c, false]; }).concat((D.archive || []).map(function (c) { return [c, true]; }));
    var counts = {}; VIEWS.forEach(function (v) { var s = F.view; F.view = v[0]; counts[v[0]] = all.filter(function (x) { return inView(x[0], x[1]); }).length; F.view = s; });
    seg($("cviews"), VIEWS, F.view, function (v) { F.view = v; render(); }, counts);
    seg($("cgroup"), GROUPS, F.group, function (v) { F.group = v; render(); });
    var list = all.filter(function (x) { return inView(x[0], x[1]) && pass(x[0]); });
    if (F.view === "arch") list.sort(function (a, b) { return a[0].date < b[0].date ? 1 : -1; });
    var out = "", lastM = "";
    list.forEach(function (x) { var ym = x[0].date.slice(0, 7); if (ym !== lastM) { lastM = ym; out += '<h2 class="cmonth">' + MONTHS[+ym.slice(5) - 1] + " " + ym.slice(0, 4) + "</h2>"; } out += card(x[0], x[1]); });
    var nf = (F.group !== "all") + !!F.city + !!F.month + !!F.q;
    $("clist").innerHTML = out || '<div class="empty"><p>' + (nf ? "Żaden koncert nie pasuje do filtrów." : F.view === "up" ? "Brak nadchodzących koncertów." : "Nic tu jeszcze nie ma – oznacz koncert na liście „Nadchodzące”.") + "</p>" + (nf ? '<button type="button" class="btn btn-tint" id="cclear2">Wyczyść filtry</button>' : "") + "</div>";
    $("clist").setAttribute("aria-busy", "false");
    $("ccount").textContent = list.length ? plural(list.length, "koncert", "koncerty", "koncertów") + (nf ? " po filtrach" : "") : "Brak wyników";
    $("cclear").hidden = !nf;
    var c2 = $("cclear2"); if (c2) c2.onclick = clearF;
    [].forEach.call($("clist").querySelectorAll(".cc-marks .mk"), function (b) { b.onclick = function () { setMark(b.closest(".cc").dataset.id, b.dataset.m); }; });
  }
  function clearF() { F.group = "all"; F.city = ""; F.month = ""; F.q = ""; $("cq").value = ""; $("ccity").value = ""; $("cmonthsel").value = ""; render(); }
  function opts(sel, items, cur, first) { sel.innerHTML = '<option value="">' + first + "</option>" + items.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (x[0] === cur ? " selected" : "") + ">" + esc(x[1]) + "</option>"; }).join(""); }
  function init() {
    loaded = true;
    fetch("data/concerts.json?v=" + Date.now(), { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      D = d; var cs = d.concerts;
      FIRST = cs.concat(d.archive || []).reduce(function (m, c) { var f = (c.firstSeen || "").slice(0, 10); return f && (!m || f < m) ? f : m; }, ""); // pierwszy skan nie oznacza wszystkiego jako „Nowy”
      var cities = {}, months = {}; cs.forEach(function (c) { cities[c.city] = (cities[c.city] || 0) + 1; months[c.date.slice(0, 7)] = 1; });
      var cl = Object.keys(cities).sort(function (a, b) { return cities[b] - cities[a] || a.localeCompare(b, "pl"); });
      if (F.city && !cities[F.city]) F.city = ""; if (F.month && !months[F.month]) F.month = "";
      opts($("ccity"), cl.map(function (c) { return [c, c + " (" + cities[c] + ")"]; }), F.city, "Wszystkie miasta");
      opts($("cmonthsel"), Object.keys(months).sort().map(function (m) { return [m, MONTHS[+m.slice(5) - 1] + " " + m.slice(0, 4)]; }), F.month, "Każdy miesiąc");
      var moi = cs.filter(function (c) { return c.group === "moi"; }), arts = {}; moi.forEach(function (c) { arts[c.artist.split(/ [-–&|]/)[0]] = 1; });
      $("csummary").textContent = "Koncerty w Polsce pod Twój gust · aktualizacja " + d.updated.replace("T", ", ");
      $("cmetrics").innerHTML = [[cs.length, "nadchodzących"], [moi.length, "koncertów z Twojej listy"], [Object.keys(arts).length, "artystów z Twojej listy"], [cl.length, "miast"]].map(function (x) { return '<div class="metric"><b>' + x[0] + "</b><span>" + esc(x[1]) + "</span></div>"; }).join("");
      $("csources").innerHTML = d.sources.map(function (s) { return "<li><b>" + esc(s.name) + "</b> – " + (s.status === "ok" ? "działa" : "pominięte") + (s.note ? ": " + esc(s.note) : "") + "</li>"; }).join("") + "<li>Twoja lista: " + esc((d.taste || []).join(", ")) + ". Podobnych wykonawców dobiera stała lista klimatów (polski rock, blues-rock, gitarzyści, klasyczny rock, wielkie wokale); tribute’y i koncerty „przy świecach” mają niższą ocenę.</li><li>Nic nie jest kupowane – link prowadzi do strony sprzedawcy biletów.</li>";
      render();
    }).catch(function (e) { $("clist").setAttribute("aria-busy", "false"); $("clist").innerHTML = '<div class="empty"><p>Nie udało się wczytać koncertów (' + esc(e.message) + "). Odśwież stronę za chwilę.</p></div>"; $("ccount").textContent = "Błąd wczytywania"; });
  }
  var t;
  $("cq").addEventListener("input", function () { clearTimeout(t); t = setTimeout(function () { F.q = $("cq").value.trim(); render(); }, 120); });
  $("csearch").addEventListener("submit", function (e) { e.preventDefault(); F.q = $("cq").value.trim(); render(); $("cq").blur(); });
  $("ccity").onchange = function () { F.city = this.value; render(); };
  $("cmonthsel").onchange = function () { F.month = this.value; render(); };
  $("cclear").onclick = clearF;
  [].forEach.call(document.querySelectorAll("#tabs button"), function (b) { b.onclick = function () { setTab(b.dataset.tab, true); }; });
  var start = /(^|[#&])koncerty(&|$)/.test(location.hash) ? "koncerty" : (function () { try { return localStorage.getItem(TKEY); } catch (e) { return ""; } })();
  setTab(start === "koncerty" ? "koncerty" : "gitary", false);
})();
