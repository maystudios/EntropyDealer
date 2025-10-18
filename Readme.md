# Entropy Dealer — Basis-Game (Web)

## -1. Projektstruktur & Tech-Stack (V1, ganz simpel)
- **Ziel:** Einfache Files, statisch hostbar. Keine Framework-Orgie.
- **CSS-Framework:** **Tailwind** empfohlen (klein, schnell, Utility-first). Output in eine einzige `css/app.css`. Alternativ Zero-Build: pures CSS in `app.css` (nur falls Build-Step unerwünscht).
- **Ordnerstruktur:**
  /
  ├─ **index.html**                # Einstieg, minimaler Markup
  ├─ **css/**
  │  ├─ **app.css**                # gebaute oder handgeschriebene Styles (V1)
  │  └─ vendor/                    # optional (Reset, Fonts)
  ├─ **js/**
  │  ├─ **app.js**                 # State, Loop, Events
  │  └─ utils.js                   # RNG, Helpers (optional)
  ├─ **assets/**
  │  ├─ img/                       # Logos, Icons (später)
  │  └─ sfx/                       # kurze UI-Sounds (später)
  └─ **data/**                     # seeds, presets (optional, V2+)

- **Build-Variante A (empfohlen):** Tailwind CLI baut `css/app.css` (purge auf `index.html` + `js/**/*.js`).
- **Build-Variante B (Zero-Build):** nur `css/app.css` manuell pflegen, später auf Tailwind umstellen.

---

## 0. Zielbild (V1)
- Ein-Klick-Rundenloop mit klarer Risiko-/Belohnungs-Spannung.
- Kurzer Run: 6–12 Minuten. Sofort verständlich. Replays lohnend.
- Keine Accounts. Nur Local Storage. Offline spielbar.

---

## 1. Spiel-Fantasie
Du handelst mit Wahrscheinlichkeiten. Jede Runde manipulieren Karten die Erfolgsquote und die Hauskante. Du kämpfst nicht gegen Gegner, sondern gegen Entropie.

---

## 2. Kern-Loop (pro Zug)
1) **Karte ziehen** → Effekt lesen.
2) **Entscheiden** (immer „gehen“; V1 ohne „passen“, damit Fokus):
   - Effekte der Karte anwenden (temporär oder dauerhaft).
3) **Trial** ausführen:
   - Erfolg: +Einsatz.
   - Misserfolg: −Einsatz (ggf. modifiziert).
4) **State aufräumen**:
   - Temporäre Effekte fallen weg.
   - Deck ggf. neu mischen, wenn leer.
5) **Shop-Fenster** (alle X Züge):
   - Optional 1 Upgrade kaufen.
6) **Weiter oder tot**:
   - Kapital ≤ 0 → Run-Ende.

---

## 3. Sieg-/Fail-Zustände
- **Siegbedingung V1**: Erreiche Zielvermögen (z. B. 1.000) oder überlebe N Züge (z. B. 25).
- **Fail**: Kapital auf 0 oder „Entropy Collapse“ (Edge ≥ 0,5 als Weiche optional erst V2).

---

## 4. Ressourcen
- **Kapital (money)**: Start 100. Gewinn/Verlust je Zug.
- **Einsatz (bet)**: Start 10. Spieler kann zwischen fixen Stufen wählen (5/10/20/40).
- **Basiswahrscheinlichkeit (baseP)**: Start 0,50.
- **Hauskante (edge)**: Start 0,00. Senkt effektive Erfolgsquote.
- **Fokus (focus)**: Start 0–2. Für Deck-Information (V1 minimal).

Effektive Erfolgsquote p_eff = clamp(baseP − edge + temporäre Modifikatoren, 0,05…0,95).

---

## 5. Deck (V1 Scope)
- Größe: 10 Karten.
- Mischung: 6 neutrale Modifikatoren, 3 „gute“, 1 „schlechte“.
- **Zuglogik**: Ziehe oberste Karte. Ablage. Wenn Deck leer → mischen (Ablage zurück).

### Start-Deck-Vorschlag (klar, lesbar)
- 3× **Leichte Neigung (+0,05 p für diesen Zug)**  [temporär]
- 3× **Kaltes Pech (−0,05 p für diesen Zug)**      [temporär]
- 1× **Glücksmoment (−0,01 edge dauerhaft)**
- 2× **Riskanter Hebel (Einsatz ×1,5 nur diesen Zug)**
- 1× **Haus dreht nach (+0,01 edge dauerhaft)**

Ziel: Sofortiges Gefühl von Kontrolle vs. Drift. Wenig Text, klare Wirkung.

---

## 6. Shop (alle 4 Züge erscheint 1 Angebot)
- Ein einziges zufälliges Angebot (V1 reduziert, um Overhead zu sparen).
- Preise niedrig halten, damit spürbar.
- Beispiel-Pool (V1, 5 Items):
  - **Kante feilen**: −0,02 edge (200)
  - **Instinkt trainieren**: +0,02 baseP (180)
  - **Verbannung: Kaltes Pech**: entferne 1 negative Karte (150)
  - **Neue Karte: Leichte Neigung**: +1 Kopie ins Deck (120)
  - **Einsatz-Stufe freischalten**: neue Bet-Stufe +50% max (100)
- Wirtschaft: Nach 2–3 Treffern kann man sich 1 Shopkauf leisten. Entscheidungen wirken bedeutsam.

---

## 7. Difficulty Curve (erste 10–20 Züge)
- Züge 1–4: Tutorial-Gefühl. Mindestens 1 „gute“ Karte garantiert im Top-3-Chunk (V1 heimliche Gnade).
- Züge 5–12: Variabilität steigt. Edge-Zuwachs kann stacken. Spieler spürt Druck.
- Züge 13–20: Survival. Ohne Shop-Entschärfung wird es eng.

Metrikziel: ~55–65 % Runs scheitern vor Erreichen des Zielvermögens. Gefühl von „knapp daneben“.

---

## 8. Entscheidungen pro Zug
- **Vor der Runde**: Einsatzstufe wählen (fixe Buttons). Kein Slidermikado in V1.
- **Nach Kartenziehen**: Nur lesen und akzeptieren. Kein „skip“. Schnelle Zugfolge.
- **Shop-Fenster**: 1 Kauf oder „weiter“.

Konzentration auf einen klaren Fluss. Kein Inventar-Management in V1.

---

## 9. Lesbarkeit / UX
- Single-Column-Kern: Oben Kapital + p_eff + Edge. Mitte: Karte. Unten: Aktion.
- Farbsprache: Grün = Gewinn/positiv. Rot = Verlust/negativ. Blau = Info.
- Mikrofeedback: kurzer Textticker: „Erfolg (63 %) +10“ / „Fail (37 %) −10“.
- Tooltips minimal: Hovertitle für Kartenname erklärt Effekt in 1 Zeile.

---

## 10. Run-Länge und Taktung
- Ziel: 25 Züge als Obergrenze (oder Zielvermögen).
- Pro Zug < 2 Sekunden bei erfahrenen Spielern.
- Shop bei Zügen 4, 8, 12, 16, 20.

---

## 11. Balancing-Startwerte (Richtwerte)
- baseP_start = 0,50
- edge_max_soft = 0,20 (V1; darüber wird’s fast unrettbar)
- bet_stufen = {5, 10, 20, 40}
- shop_preise = {100–200}
- typische Karteneffekte:
  - +/−0,05 p temporär
  - +/−0,01 edge dauerhaft
  - ×1,5 Einsatz temporär
- Zielvermögen = 1.000 (oder 2× Startkapital je nach Tests)

---

## 12. Progression außerhalb des Runs (V1)
- Minimal: Bestscore speichern. Seed-Info für Replays optional.
- Kein Meta-Fortschritt in V1. Fokus bleibt auf Loop.

---

## 13. Erweiterbarkeit (V2+, nur planen)
- **Events**: „Entropy Surge“ verschiebt mehrere Kartenwerte für 3 Züge.
- **Seltene Karten**: „Verhandlung“ (edge halbieren), „Normalisieren“ (p in Richtung 0,50).
- **Prestige**: Talisman, der Start-edge −0,01 setzt.

---

## 14. Telemetrie (lokal, anonym)
- Zähle: Züge pro Run, Shopkäufe, mittlere p_eff, Todesursache (Kapital 0 vs. edge zu hoch).
- Ziel: Identifikation von Frustrationsspitzen und Dead-Ends.

---

## 15. Testplan (funktional)
- Kartentexte korrekt und eindeutig?
- p_eff immer in 0,05…0,95?
- Deck-Umschlag korrekt? Keine Kartenduplikation außer gewollt?
- Shop-Fenster Intervall passt? Preisabzug korrekt?
- Run-Ende sauber: Score speichern, Neustart klar.

---

## 16. Risiken und Gegenmaßnahmen
- **Gefahr: gefühlte Unfairness** → Einblenden der berechneten p_eff in % vor jedem Wurf.
- **Gefahr: Snowball in Edge** → Obergrenze + Shop-Gegenmittel verfügbar halten.
- **Gefahr: Überkomplexität** → V1 ohne Skip/Pass/Inventar.

---

## 17. Definition of Done (V1)
- Start-Run, 25 Züge möglich, Sieg/Fail logisch.
- 10er-Deck wie oben, Shop mit 5 Items zufällig.
- Save/Load lokales Bestscore.
- UI klar auf Handy und Desktop.
