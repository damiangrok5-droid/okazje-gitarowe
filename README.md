# Okazje gitarowe – gitary elektryczne

Statyczna strona z przeglądem okazji na używane gitary elektryczne (budżet 5–15 tys. zł z dostawą do Polski) z OLX.pl, Kleinanzeigen.de i Reverb (eBay – przygotowany przez oficjalne eBay Browse API, włączany po dodaniu kluczy).

**Strona:** https://damiangrok5-droid.github.io/okazje-gitarowe/

## Co zawiera
- Karty ofert ze zdjęciem, ceną łączną (cena + wysyłka + ewentualne cło/VAT/opłaty), wartością rynkową ze źródłami i procentem okazji.
- Oceny 1–10 w 7 kategoriach, ocenę ogólną i werdykt (polecam / do rozważenia / nie polecam) z uzasadnieniem pod kątem gry i odsprzedaży.
- Wyszukiwarka z przyciskiem „Szukaj” (oraz Enter) – szuka bez polskich znaków w tytule, marce, typie, opisie i lokalizacji.
- Filtry w arkuszu: źródło (OLX, Kleinanzeigen, Reverb, eBay), typ gitary (Strat, Tele, Les Paul, SG, semi-hollow, superstrat, offset, double-cut PRS, kształty, inne), producent, zakres ceny łącznej w zł (z szybkimi progami), werdykt, tylko zweryfikowana wartość. Licznik wyników, chipy aktywnych filtrów, „Wyczyść filtry”. Filtry są zapamiętywane w przeglądarce (klucz `okazje-gitarowe-filters-v1`).
- Sortowanie: najnowsze (domyślnie, z plakietką NOWE dla ofert z ostatnich 24 h), okazja %, ocena, cena.
- Styl iOS: efekt szkła, tryb jasny/ciemny/automatyczny, układ projektowany najpierw pod iPhone’a, możliwość dodania do ekranu początkowego.
- Oznaczenia „ulubione / kupione / archiwum” zapisywane lokalnie w przeglądarce (localStorage, klucz `okazje-gitarowe-marks-v1`) pod stałym ID oferty – aktualizacja danych ich nie kasuje. Kopia w cookie `okg_marks` oraz kod `OKG1:` / link `#m=` do przenoszenia między przeglądarkami.

## Pliki
- `index.html`, `style.css`, `app.js` – strona (bez zależności, bez budowania).
- `data/offers.json` – dane ofert ze stałymi ID (`olx-…`, `ka-…`, `reverb-…`) i metadanymi (kurs NBP, wagi, status źródeł).

## Metodologia (skrót)
Okazja % = (wartość rynkowa − cena łączna) / wartość rynkowa. Wartość rynkowa to mediana cen ofertowych porównywalnych używanych egzemplarzy (nie ceny transakcyjne). Dla ofert spoza UE doliczane jest cło 3,2%, VAT 23% i opłata agencji celnej. Typ i producent są wyprowadzane z tytułu ogłoszenia. Kursy walut: NBP, tabela A. Szczegóły na stronie w sekcji „Metodologia”.

Dane mają charakter informacyjny – przed zakupem zweryfikuj stan, numer seryjny i sprzedawcę.
