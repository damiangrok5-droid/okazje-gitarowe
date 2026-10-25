# Okazje gitarowe – gitary elektryczne

Statyczna strona z przeglądem okazji na używane gitary elektryczne (budżet 5–15 tys. zł z dostawą do Polski) z OLX.pl, Kleinanzeigen.de i Reverb.

**Strona:** https://damiangrok5-droid.github.io/okazje-gitarowe/

## Co zawiera
- Karty ofert ze zdjęciem, ceną łączną (cena + wysyłka + ewentualne cło/VAT/opłaty), wartością rynkową ze źródłami i procentem okazji.
- Oceny 1–10 w 7 kategoriach, ocenę ogólną i werdykt (polecam / do rozważenia / nie polecam) z uzasadnieniem pod kątem gry i odsprzedaży.
- Filtry i sortowanie (okazja %, ocena, cena, źródło, werdykt).
- Oznaczenia „ulubione / kupione / archiwum” zapisywane lokalnie w przeglądarce (localStorage, klucz `okazje-gitarowe-marks-v1`) pod stałym ID oferty – aktualizacja danych ich nie kasuje.

## Pliki
- `index.html`, `style.css`, `app.js` – strona (bez zależności, bez budowania).
- `data/offers.json` – dane ofert ze stałymi ID (`olx-…`, `ka-…`, `reverb-…`) i metadanymi (kurs NBP, wagi, status źródeł).

## Metodologia (skrót)
Okazja % = (wartość rynkowa − cena łączna) / wartość rynkowa. Wartość rynkowa to mediana cen ofertowych porównywalnych używanych egzemplarzy (nie ceny transakcyjne). Kursy walut: NBP, tabela A. Szczegóły na stronie w sekcji „Metodologia”.

Dane mają charakter informacyjny – przed zakupem zweryfikuj stan, numer seryjny i sprzedawcę.
