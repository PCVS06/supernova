# Radian: nützliche Sternenkarte, Sidebar und zuverlässiger Chat

Stand: 13. September 2026. Autorisierter Umbauplan. Umsetzung und überprüfte Grenzen sind im [Abnahmebericht](radian-implementation-report.md) dokumentiert. Die folgende Problembeschreibung hält den Ausgangszustand fest.

Gestaltungspräzisierung: Karte und Workflow stehen frei im Chat ohne Kartenrahmen. Im eingeklappten Zustand bleibt nur das Symbol sichtbar; Beschriftungen und Status erscheinen bei Hover, Tastaturfokus oder Auswahl. Schmale weiße Lichtkanten und ein rein schwarzer Hintergrund ersetzen breite Leuchthöfe.

## Ausgangspunkt und belegte Probleme

Die bestehende Karte verteilt Knoten auf feste Spalten und zeigt je nach Breite zwei oder drei Einträge pro Seite. Gespräche werden im Graphaufbau nach aktuellem Gespräch und ID sortiert. Der Graph besitzt kein eigenes Modell für Aktualität, Aufmerksamkeit oder Relevanz. Seine Layout-Koordinaten beziehen sich auf den sichtbaren Bereich; eine unabhängige, zoombare Kartenfläche fehlt.

Sidebar und Karte verwenden teilweise gemeinsame Abfragen, stellen die Beziehungen aber jeweils eigenständig zusammen. Die Karte lädt die Arbeiter des ausgewählten Chats. Daraus entsteht noch keine zuverlässige Übersicht über aktuelle Arbeit im gesamten Harness.

Eine Zuweisung wird zudem für jeden Arbeiter als eigener Aufgabenstern dargestellt. Dadurch wird dieselbe Information oft zweimal gezeigt. Der Curator erscheint bereits wegen seiner Konfiguration, auch wenn aktuell nichts zu prüfen ist.

Vom Nutzer gemeldete Fehler:

- Nach dem Senden wird der Chat verlassen; erneutes Öffnen ist erforderlich. Der genaue technische Auslöser ist noch nicht reproduziert.
- Die Screenshots zeigen überlappende `/goal`-Vorschläge und unausgerichtete Aktionsschaltflächen. Der Nutzer hat klargestellt, dass `/goal` funktional arbeitet und die Darstellung kaputt ist.

Die bisherigen grünen Tests belegen diese konkreten nativen Abläufe nicht. Die neue Abnahme muss sie unmittelbar prüfen.

## 1. Produktaufteilung

| Bereich       | Aufgabe                                                | Typische Handlung                                                              |
| ------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Sidebar       | Arbeitsort oder Chat schnell finden und wechseln       | Projekt wählen, letzten Chat öffnen, auf eine offene Entscheidung zugreifen    |
| Karte im Chat | Beziehungen, aktuelle Arbeit und Hindernisse verstehen | Delegation verfolgen, Ursache einer Blockade sehen, verbundenes Ergebnis lesen |
| Chat          | Nachrichten, Entscheidungen und Ergebnisse bearbeiten  | Schreiben, antworten, Goal bedienen, Ergebnis lesen                            |

Alle drei Bereiche verwenden dieselben IDs, Statusangaben und Beziehungen. Die Karte bleibt im vorhandenen Aktivitätsbereich des Chats. Es gibt keine zusätzliche Star-Map-Seite.

### Geschlossener Normalzustand

- Neue beziehungsweise neu geöffnete Chats starten mit eingeklappter Karte.
- Sichtbar bleiben das jeweilige mathematische Symbol und eine kurze Statuszeile. Tatsächlich wartende Entscheidungen oder aktive Delegationen können dort zusammengefasst werden.
- Der Nutzer öffnet die Karte ausdrücklich. Start, Ende oder Fehler eines Turns öffnen sie nicht automatisch.
- Eine manuell geöffnete Karte bleibt während desselben Chat-Besuchs offen, auch beim Senden. Chat-Wechsel startet wieder geschlossen.
- Die bevorzugte Darstellungsart wird gespeichert. Auswahl, Zoom und Position bleiben beim Wechsel zwischen Darstellungen erhalten, soweit der neue Modus sie sinnvoll übernehmen kann.

## 2. Drei Darstellungen derselben Arbeit

### Fokus: Standard beim Öffnen

Eine freie, räumliche Konstellation um den aktuellen Chat oder das bewusst gewählte Arbeitselement. In der Nähe liegen direkte Delegationen, relevante Ziele, Ergebnisse und tatsächlich beteiligte Projekte. Das ist die Arbeitsansicht für die Frage: Was passiert hier gerade und was hängt davon ab?

Das Layout löst Überschneidungen und hält zusammengehörende Gruppen beieinander. Bestehende Sterne behalten ihre Position möglichst bei; neue Ereignisse verändern Status und ergänzen Nachbarn, statt alles neu zu verteilen.

### Orbits: Struktur verstehen

Eine hierarchische Darstellung von Harness, Orchestrator, Projekten und Chats. Radiale Abstände zeigen Zugehörigkeit beziehungsweise Tiefe. Beim Hineinzoomen öffnen sich ausgewählte Projektgruppen und anschließend ihre laufenden Delegationen.

Die Rolle bestimmt weiterhin das Symbol: π Harness, τ Hauptorchestrator, φ Projekt beziehungsweise Projektleitung, e Spezialist, i Curator. Ein konfigurierter Agent ist weiterhin kein beobachteter Lauf.

### Ablauf: Zusammenarbeit nachvollziehen

Eine zeitliche Darstellung der ausgewählten Arbeit mit Delegationen, Zielschritten, Ergebnissen und Blockaden. Sie beantwortet: Wer hat was angestoßen, was läuft parallel und worauf wartet der nächste Schritt?

Zeitliche Nähe erzeugt keine erfundene Abhängigkeit. Gerichtete Verbindungen erscheinen nur für gespeicherte Delegationen oder explizite Workflow-Abhängigkeiten. Wartezeiten und Fertigstellungen werden anhand tatsächlicher Ereignisse gezeigt.

## 3. Relevanz vor Menge

Die Auswahl erfolgt über nachvollziehbare Regeln, zunächst ohne KI-Bewertung. Ausgangspunkt ist der aktuelle Chat; der Nutzer kann den Bereich ausdrücklich auf Projekt oder Harness erweitern.

Priorität innerhalb des gewählten Bereichs:

1. Bewusst ausgewählter Knoten, aktueller Chat und die Beziehungen, die zu ihrer Einordnung nötig sind.
2. Arbeit, die eine Entscheidung braucht, blockierte notwendige Schritte und ungelöste Fehler.
3. Laufende Arbeit und ihre direkten Voraussetzungen beziehungsweise abhängigen Schritte.
4. Angeheftete Elemente und neue, noch nicht gelesene Ergebnisse.
5. Kürzlich abgeschlossene, verbundene Arbeit.
6. Ältere oder weiter entfernte Arbeit als aufklappbare Gruppen.

Das Alter allein darf eine ungelöste Blockade oder wichtige Abhängigkeit nicht verstecken. Aktualität stammt aus einem fachlichen Ereignis oder einer Änderung, nicht aus dem Zeitpunkt der letzten Abfrage. Ob ein Ergebnis gelesen wurde, braucht einen expliziten Lesestand; es darf nicht aus einem Hover abgeleitet werden.

Bei Auswahl wird der Grund knapp sichtbar: etwa „wartet auf deine Freigabe“, „vom aktuellen Chat delegiert“ oder „Ergebnis vor 8 Minuten“. Filter „Jetzt“, „Heute“ und „Verlauf“ verändern den sichtbaren Ausschnitt und zeigen an, wenn ältere Arbeit zusammengefasst ist.

Es gibt kein festes Schema „drei Projekte, drei Chats, drei Agenten“. Dichte Bereiche werden zu beschrifteten Gruppen mit korrekten Zählern verdichtet. Beim Auflösen einer Gruppe wird weiterer Kontext geladen. Noch nicht geladene Daten dürfen nicht als vollständig oder leer ausgegeben werden.

### Informationswert der einzelnen Sterne

- Eine bloße Aufgabenbeschreibung gehört zum Agentenstern und zu dessen Detailansicht. Sie erzeugt keinen zweiten Stern mit demselben Inhalt.
- Eigenständige Ziele, gespeicherte Aufgaben, Workflow-Schritte und separat adressierbare Ergebnisse können eigene Knoten sein.
- Eingereihte Nachrichten bleiben als solche erkennbar; sie werden nicht pauschal als bereits ausgeführte Aufgaben gezählt.
- Der Curator tritt in der Fokusansicht bei tatsächlich ausstehender Prüfung oder relevanter Aktivität auf. Seine Konfiguration bleibt in der Strukturansicht erreichbar.
- Dekorativer Sternenstaub bleibt sehr zurückhaltend und ist nie mit auswählbarer Arbeit zu verwechseln.

## 4. Zoom, Bewegung und Bedienung

- Karte durch Ziehen auf freiem Hintergrund verschieben. Pinch und explizite Plus/Minus-Tasten zoomen; normales Scrollen bewegt weiterhin den Chat. Eine unterstützte Zoom-Tastenkombination darf nur über der Karte wirken.
- Herausgezoomt: Projekt- und Arbeitsgruppen. Mittlere Ebene: relevante Chats und Agenten. Nah: Aufgaben, Ergebnisse und gespeicherte Verbindungen. Text bleibt lesbar, anstatt beliebig kleiner skaliert zu werden.
- Ein Klick wählt einen Stern und zeigt seine kurze Erklärung sowie eine Vorschau im selben Chat. Nur „Chat öffnen“ beziehungsweise „Agentengespräch öffnen“ wechselt bewusst die Route.
- „Zum aktuellen Chat“ setzt den Fokus zurück. Ein normaler Datenabgleich verschiebt weder Kamera noch Auswahl.
- Neue Arbeit erscheint nahe ihrem tatsächlichen Ausgangspunkt. Aktive Verbindungen dürfen einen dezenten Impuls tragen. Ruhephasen erzeugen keine dauernd wandernden Sterne.
- Nach Abschluss bleibt das Ergebnis erreichbar und verliert das Aktivitätssignal. Zusammenfassen erfolgt mit einer kurzen Schonfrist; ausgewählte oder fokussierte Elemente verschwinden nicht beim Lesen.
- Schwarz bleibt der Hintergrund. Weiße Symbole und Verbindungen leuchten abgestuft; notwendige Texte behalten ausreichenden Kontrast. Status wird zusätzlich durch Text beziehungsweise Form erkennbar.
- Der aufgeklappte Bereich erhält eine an Fenster und Chat angepasste, begrenzte Höhe. Statusänderungen lassen ihn nicht ständig wachsen. Composer, Leseposition und Scroll-Verankerung werden zusammen geprüft.
- Alle Handlungen sind über Tastatur erreichbar. Reduzierte Bewegung hält die Karte ruhig; beim Ausblenden pausiert die Animation.

## 5. Sidebar gemeinsam umbauen

Die Sidebar behält eine stabile, schnelle Navigation. Sie enthält Suche, angeheftete Arbeitsorte beziehungsweise Chats und zuletzt verwendete Chats im gewählten Kontext. Projekte und Harnesses bleiben über eine kompakte, aufklappbare Struktur vollständig erreichbar.

Aktive Arbeit wird in der jeweiligen Zeile knapp zusammengefasst, beispielsweise „2 arbeiten · 1 braucht dich“. Eine kleine Liste „Braucht dich“ kann offene Entscheidungen auch aus anderen Harnesses erreichbar machen, ohne alle laufenden Unteragenten dauerhaft aufzulisten.

Agentenbäume, einzelne Aufgaben und komplette vergangene Delegationen stehen nicht parallel in jeder Projektzeile. Der Statushinweis führt gezielt zum zugehörigen Chat und öffnet dort den passenden Kartenausschnitt. Bestehende Agentengespräche und Historie bleiben über diesen Weg sowie Suche erreichbar.

Sidebar-Auswahl navigiert. Karten-Auswahl erkundet zunächst nur. Dadurch darf das Betrachten einer Verbindung den Nutzer nicht aus seinem Chat werfen. Der aktive Chat bleibt in der Sidebar sichtbar; neue Antworten oder automatisch erzeugte Titel lösen keinen Ortswechsel aus.

Pins behalten ihre Reihenfolge. Aktivitätsänderungen dürfen Zeilen unter dem Mauszeiger nicht ständig umsortieren.

## 6. Gemeinsame technische Grundlage

### Datenmodell

Ein gemeinsames Arbeitsmodell führt Harnesses, Projekte, Chats, Agentenläufe, Ziele, Workflow-Schritte und Ergebnisse anhand stabiler IDs zusammen. Gespeicherte Beziehungen werden typisiert, etwa Zugehörigkeit, Delegation, explizite Abhängigkeit und Ergebnisherkunft.

Zu jedem Element gehören, soweit vorhanden, fachlicher Status, letzte relevante Änderung, Aufmerksamkeit, Herkunft und Aktualität der Daten. Darstellungsmodus, Farbe oder Bildschirmspalte gehören nicht in das fachliche Modell.

Das Modell liegt als gemeinsamer Bereich unter `packages/web/src/features/workspace`. Sidebar und Karte erhalten daraus unterschiedliche Ansichten. Vorhandene Abfragen werden zusammengeführt; es entsteht kein zweiter, konkurrierender Bestand an Chats.

### Server und Aktualisierung

- Ein begrenzter Überblick liefert Zusammenfassungen und Gruppen für den ausgewählten Bereich. Vollständige Transkripte werden erst beim Öffnen einer Vorschau geladen.
- Bestehende Ereignisse werden wiederverwendet; fehlende Änderungen an Agenten, Workflows oder Aufmerksamkeit werden über die vorhandene Server-/Vertragsgrenze ergänzt.
- Eine gemeinsame Aktualisierung bedient Sidebar und Karte. Es gibt keine eigene Abfrage pro sichtbarem Stern.
- Änderungen tragen Revisionen. Veraltete Ergebnisse dürfen neuere Zustände nicht überschreiben. Nach einer Unterbrechung werden fehlende Änderungen beziehungsweise ein neuer Überblick geladen.
- Bei fehlender Verbindung bleibt der letzte Stand erkennbar, verliert aber den Anspruch „jetzt aktiv“.

### Darstellung und Auswahl

Drei klar getrennte Schritte: echte Daten zusammenführen, relevante Nachbarschaft auswählen, diese Nachbarschaft räumlich anordnen. So lassen sich Relevanz und Layout unabhängig prüfen.

Die derzeitige feste Spaltenaufteilung in `constellation-layout.ts` wird ersetzt. Knotenkoordinaten liegen in einer unabhängigen Kartenfläche; die Kamera bestimmt Zoom und Ausschnitt. Ein gemeinsamer Interaktionszustand hält Auswahl, Bereich, Zeitfilter und Kamera. Layout-Berechnung erfolgt bei größeren Gruppen außerhalb des Chat-Renderpfads und wird gebündelt aktualisiert.

Zunächst bleiben vorhandene Vektorsymbole und gut zugängliche Bedienelemente erhalten. Ein Wechsel zu Canvas oder WebGL erfolgt nur, wenn gemessene Dichte- und Bewegungstests ihn rechtfertigen. Anzahl sichtbarer Details, Beschriftungen und gezeichneter Verbindungen richten sich nach Platz und Zoom. Auswahl und Details bleiben auch bei einer anderen Zeichenmethode semantisch zugänglich.

## 7. Fehler zuerst absichern

### Chat wird beim Senden verlassen

Vor einer Ursachenbehauptung wird der konkrete Ablauf reproduziert: bestehender Chat und neuer Chat, Senden per Enter und per Schaltfläche, Stream-Start, Abschluss, Fehler, Wiederverbindung und automatische Titeländerung. Der Prüfpunkt ist die erhaltene Chat-ID, Route, Sichtbarkeit und Eingabebereitschaft; ein allgemeiner erfolgreicher Send-Aufruf reicht nicht.

Ein neuer Chat darf einmal gezielt zu seiner neu angelegten Chat-ID wechseln. Anschließend darf ein normaler Stream- oder Listenabgleich ihn nicht verlassen. Absichtliche Navigation des Nutzers während des Sendens darf nicht durch eine späte Antwort rückgängig gemacht werden. Entwürfe und bereits angenommene Nachrichten bleiben erhalten.

### `/goal` und Schaltflächen

Zuerst die Screenshot-Zustände nachstellen: `/goal`-Vorschlag geöffnet, Ziel aktiv, Ziel aufgeklappt und kleine Fensterbreite. Menü, Statuszeile, Aufklapppfeil, Pause und Entfernen werden gemeinsam vermessen.

Zielbild: genau ein sauber verankertes Vorschlagsmenü ohne abgeschnittene Ränder oder Textüberlagerung; eine kompakte Zielzeile mit reservierten Bereichen für Text und Aktionen. Menüposition berücksichtigt den verfügbaren Platz. Icon-Schaltflächen teilen Hitbox, Zentrierung und klare Abstände; optische Zentrierung wird zusätzlich im nativen Rendering geprüft.

Die Zielausführung bleibt außerhalb dieses Layout-Fixes. Ein später unabhängig nachgewiesener Funktionsfehler wäre ein eigener Befund.

## 8. Umsetzung und Abnahme

| Schritt                      | Ergebnis                                                                            | Voraussetzung für den nächsten Schritt                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| A: Stabilisierung            | Karte standardmäßig geschlossen; Sende-Navigation und Goal-/Button-Layout repariert | Gemeldete Abläufe im nativen App-Fenster reproduziert und anschließend fehlerfrei wiederholt      |
| B: Gemeinsames Arbeitsmodell | Sidebar und Karte zeigen gleiche Statuswerte, Zähler und Beziehungen                | Wechsel, verspätete Antworten, Wiederverbindung und fehlende Daten sind geprüft                   |
| C: Nützliche Fokuskarte      | Relevanzregeln, Zoom, Verschieben, Gruppen und unmittelbare Vorschauen              | Wenige, viele, leere und blockierte Arbeitsstände funktionieren ohne feste Seiten à drei Einträge |
| D: Sidebar                   | Kompakte Navigation und gezielter Einstieg in relevante Arbeit                      | Alle bisherigen Ziele bleiben erreichbar; Agenten-/Aufgabenbäume werden nicht doppelt aufgelistet |
| E: Orbits und Ablauf         | Wechselbare Darstellungen mit gleicher Auswahl und verlässlichen Beziehungen        | Moduswechsel verliert weder Kontext noch Auswahl; keine erfundenen Abhängigkeiten                 |
| F: Feinschliff               | Ruhige, leuchtende Darstellung bei hoher Dichte                                     | Navigation, Lesbarkeit, Leistung und reduzierte Bewegung im installierten App-Fenster geprüft     |

Für die Abnahme werden kleine, mittlere und dichte Bestände verwendet, einschließlich verschachtelter Delegationen und mehrerer gleichzeitig aktiver Projekte. Blockierte Arbeit bleibt erreichbar, ältere Arbeit lässt sich gezielt auflösen, und neue Ereignisse reißen weder Kamera noch Chat weg.

Leistungsziel: flüssiges Verschieben und Zoomen auf dem Zielgerät bei normaler Dichte; große Bestände bleiben durch Gruppierung bedienbar. Diese Eigenschaft wird gemessen und nicht aus der bloßen Zahl bestandener Tests abgeleitet.

Der erste lieferbare Schritt ist A. Die neue Karte sollte erst nach der gemeinsamen Datenbasis entstehen; dekorative Animationen folgen der funktionalen Abnahme.
