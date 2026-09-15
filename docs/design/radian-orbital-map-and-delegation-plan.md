# Radian: der Chat als dauerhaftes Orbit-System

Stand: 13. September 2026. Überarbeiteter Entwurf nach der Klarstellung: Auch der Lead-Chat ist ein Stern; seine aktuell und früher beteiligte Arbeit bildet ein gemeinsames, direkt sichtbares System. Diese Fassung ersetzt die zuvor getrennte Planung von Chat-Delegation und zusätzlicher Sternenkarte. Noch nicht in der App umgesetzt.

## Verbindliche Gestaltungsrichtung

1. **Sidebar:** Symbolringe optisch ausbalancieren. Die Navigationszeilen kreisen nicht.
2. **Chat:** Jeder Chat, auch der Lead-Chat, wird als Stern dargestellt. Seine beteiligten Agenten und tatsächlich genutzten Projekte beziehungsweise Dienste umkreisen ihn dauerhaft; frühere Beteiligung bleibt erreichbar.
3. **Eine Ansicht:** Dieses System übernimmt die bisherige Sternenkarte. Zoom, Kontext, Beziehungen und Historie werden innerhalb derselben Szene erschlossen. Der separate Kartenknopf und der Wechsel zwischen Chatbild und Sternenkarte entfallen nach funktionaler Übernahme.
4. **Orchestrierung:** Gerade beauftragte Agenten werden in einen näheren Orbit ihres tatsächlichen Orchestrators gezogen und erhalten direkt sichtbare Verbindungen. Nach dieser aktiven Phase gehen sie wieder nach außen.
5. **Hohe Dichte:** Auch Hunderte Agenten bleiben vollständig auffindbar. Sichtbare Einzelheiten werden räumlich verdichtet, ohne Beteiligung oder offene Arbeit aus dem Bestand zu entfernen.

## Belegter Ausgangspunkt

Die vorangegangene Quellprüfung ergab: `delegation-graph.tsx` erzeugt je Agent eine weitere Zeile von 112 Pixeln; `workspace-layout.ts` ordnet im Orbitsmodus alles um denselben Mittelpunkt an. Es existieren bereits getrennte Chatsterne, Zoom, Verschieben und ein Arbeitsmodell für Zugehörigkeit, Delegation, Arbeitsprojekt, Voraussetzungen und Ergebnisse. Diese Funktionen werden in die gemeinsame Chatszene überführt.

Die Sidebar verwendet unterschiedlich große Marken und wechselt unter 40 Pixel auf kompakte Konturen. Mehrere Animationen verändern zusätzlich die Ringdeckkraft. Das ist die Grundlage der getrennten Ringkorrektur, kein Anlass, sämtliche Chatmarken global abzudunkeln.

Frühere Pläne dokumentieren historische Ausgangszustände. Aussagen über damals fehlende Parallelität sind kein neuer Befund über die aktuelle Ausführung.

## A. Sidebar: gleichmäßige Symbolringe

Das Symbol bleibt der helle, scharfe Mittelpunkt. Der mathematische Ring unterstützt seine Identität, ohne mehr Aufmerksamkeit als der Name anzuziehen. π darf durch seine Größe höher in der Hierarchie stehen, aber nicht durch einen unverhältnismäßig hellen Kranz.

- Einen eigenen Sidebar-Darstellungsstil an `ConstantOrb` und `AgentMark` weiterreichen. Keine globalen CSS-Änderungen, die gleichzeitig Chat und Karte abdunkeln.
- Konturen für kleine Größen gezielt vereinfachen: weniger, dafür erkennbare Zeichen statt vieler kaum sichtbarer Punkte. Falls 16 Pixel für die Agentenkontur nicht reichen, die sichtbare Marke auf 18 Pixel erhöhen; die reservierte Symbolspalte bleibt gleich.
- Größe, Zeichenhelligkeit und Ringhelligkeit getrennt steuern. Als Ausgangswert liegt der ruhige Ring ungefähr bei einem Drittel der Zeichenhelligkeit; geometriespezifische Korrekturen erfolgen nach Sichtprüfung, nicht mit demselben pauschalen Opazitätswert für alle Marken.
- Eine gleichmäßig sichtbare Grundkontur erhalten. Die Animation verändert nur einen schwachen darüberliegenden Akzent, sodass ein Ring nicht je nach Phase verschwindet oder plötzlich dominant wird.
- Hervorhebung durch Auswahl oder Hover an der Zeile lösen. Keinen zusätzlichen starken Leuchtring über die mathematische Kontur legen. Tastaturfokus bleibt klar erkennbar.
- Keine neue globale Ring-Einstellung nötig. Vorhandene Bewegungseinstellungen bleiben wirksam; ruhige Sidebar-Symbole behaupten keine laufende Arbeit.

Abnahme: π, τ, φ, e und i nebeneinander in tatsächlichen Sidebar-Größen, ruhend und aktiv, ausgewählt und nicht ausgewählt. Prüfen bei mehreren Animationsphasen, normalem und erhöhtem UI-Maßstab sowie mit reduzierter Bewegung. Die Anpassung der Ringhelligkeit muss auf Sidebar-Marken begrenzt bleiben.

## B. Ein Chatstern mit dauerhaftem Umfeld

Der Mittelpunkt ist immer der aktuelle Chatstern, auch wenn darin der Lead-Orchestrator arbeitet. Die Rolle kann bei Auswahl erklärt werden; sie ersetzt den Stern nicht wieder durch τ. Ein Projekt bleibt ein Projektkörper, ein Agent bleibt eine Agentenmarke. Es gibt keinen zweiten Lead-Ursprung neben dem Chatstern.

Die Szene enthält die in diesem Chat tatsächlich verwendeten oder zuvor beteiligten Agenten, Projekte und Dienste. Bloße Verfügbarkeit im Harness erzeugt keinen Körper. Harness und Curator erscheinen als Kontextbegleiter, wenn ihre Beteiligung belegt ist; sie werden nicht als vom Chat gestartete Agenten ausgegeben.

Zugehörigkeit entsteht aus gespeicherten Beteiligungs- und Ausführungsbeziehungen, nicht aus Namen oder zeitlicher Nähe. Ein Projektkörper kann mehrere Aufträge zusammenfassen; dessen Agenten beziehungsweise Unteragenten bleiben beim tatsächlichen Auftraggeber. Andere Chats werden nur dann als eigene Sterne eingeblendet, wenn es einen belegten Zusammenhang mit diesem Chat gibt oder der Nutzer bewusst dorthin navigiert.

Früher beteiligte Arbeit bleibt im äußeren Bereich des Systems. Sie darf nach zehn Minuten nicht verschwinden. Bei vielen Einträgen repräsentieren Gruppen ihren Bestand vollständig. Die langsame Grundbewegung bedeutet jetzt **Zugehörigkeit zum Chat** und darf deshalb auch abgeschlossene Arbeit umfassen. Laufender Status wird durch Nähe, Verbindung und gezielte Aktivitätsimpulse gezeigt, zusätzlich durch eine lesbare Statusangabe bei Auswahl. Ein abgeschlossener Körper ist kein laufender Agent.

## C. Näherer Orbit für aktuelle Orchestrierung

Für jeden tatsächlichen Orchestrator werden Beteiligung und momentane Zusammenarbeit getrennt betrachtet. Der nahe Orbit entsteht um den jeweiligen Auftraggeber: beim Lead um den Chatstern, bei einem untergeordneten Orchestrator um dessen Körper.

| Fachlicher Zustand                             | Räumliches Verhalten                                                                          | Verbindung                                            |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Früher beteiligt, aktuell ohne Auftrag         | Langsamer äußerer Umlauf, einzeln oder gruppiert                                              | Keine dauerhafte Arbeitslinie                         |
| Auftrag bestätigt und gerade in Ausführung     | Sanfter Wechsel in einen freien nahen Orbit                                                   | Direkte, schmale Linie vom tatsächlichen Orchestrator |
| Laufend, aber wartet auf ein Ergebnis          | Innerhalb der aktuellen Arbeitsgruppe, mit erkennbarem Wartezustand                           | Ruhige Verbindung; keine Arbeitspulse                 |
| Nur eingeplant, noch nicht gestartet           | Kein erfundenes laufendes Agentensymbol; bei Bedarf als geplanter Workflow-Schritt erreichbar | Keine Live-Verbindung                                 |
| Ergebnis zurückgegeben                         | Einmaliger Rückgabeimpuls, anschließend äußerer Umlauf                                        | Live-Linie klingt ab; Herkunft bleibt abrufbar        |
| Fehlgeschlagen oder braucht Entscheidung       | Nahe am zuständigen Orchestrator beziehungsweise in dessen Aufmerksamkeitsgruppe gehalten     | Ruhiger, lesbarer Problemzustand                      |
| Verbindung unterbrochen, Zustand nicht aktuell | Letzte Position bleibt erhalten; keine aktive Bewegung                                        | Letzter bekannter Stand ausdrücklich kenntlich        |

„Gerade orchestriert“ wird aus bestätigter Zuordnung und Ausführung bestimmt. Die UI darf es nicht aus einem Toolnamen, einer Formulierung oder einer Animation erraten. Reichen vorhandene Ereignisse nicht aus, wird ein typisiertes Zuordnungsereignis an der bestehenden Server-/Vertragsgrenze ergänzt.

Ein Orchestrator kann mehrere Agenten gleichzeitig im nahen Orbit halten und selbst weiterarbeiten. Die Nähe ändert keine Ausführungsreihenfolge, kein Budget und keine Parallelitätsgrenze. Eine Priorisierung für die Darstellung ist keine Priorisierung des Schedulers.

Der Wechsel nach innen behält Identität und Winkel möglichst bei. Radien werden über eine kurze, begrenzte Bahnänderung angepasst; bei reduzierter Bewegung erfolgt die Umstellung unmittelbar. Beendete, neu gestartete und weiterlaufende Zweige werden unabhängig behandelt. Ein Agent, den der Nutzer gerade liest, wird nicht weggezogen; Auswahl hält seine Darstellung bis zum Schließen fest.

Direkte Linien erklären aktuelle Koordination. Zusätzliche Workflow-Abhängigkeiten werden bei Auswahl gezielt eingeblendet und als Voraussetzungen oder Ergebnisübergaben unterschieden. So bleibt eine Zusammenführung aus mehreren Vorgängern nachvollziehbar.

## D. Bedienung innerhalb derselben Szene

- Der Chatstern und die beteiligte Arbeit sind direkt sichtbar, frei im Chat und ohne zusätzliche Box. Ohne Beteiligung bleibt nur der Stern.
- Hineinzoomen, Verschieben oder das Öffnen einer Gruppe vergrößert denselben Zusammenhang. Es gibt keine zusätzliche Sternenkartenansicht und keinen verpflichtenden Kartenmodus.
- Ein Klick auf einen Agenten öffnet dessen Arbeit; Ergebnis bleibt im Mittelpunkt, Auftrag und Aktivität sind bei Bedarf zugänglich. Die Rückkehr stellt denselben Chat, Ausschnitt und Auswahlzustand wieder her.
- Klick auf eine Gruppe öffnet ihre Mitglieder im selben räumlichen Kontext. Für die gezielte Suche nach einem bestimmten Agenten steht dort eine Suche beziehungsweise sortierbare Liste zur Verfügung. Diese bleibt standardmäßig geschlossen.
- Hover in der Szene, Tastaturfokus und das Öffnen von Details pausieren die Ortsbewegung. Während einer Untersuchung wechseln Körper auch bei neuen Ereignissen nicht ihren Platz; Zustandsangaben dürfen sich weiter aktualisieren. Nach dem Verlassen werden Änderungen geordnet nachgeführt.
- Eine Statusänderung öffnet nichts automatisch, verschiebt nicht die Kamera, ändert nicht die Route und verlängert nicht fortlaufend den Chatbereich. Hintergrundfenster, unsichtbare Szenen und reduzierte Bewegung stoppen die Animation.
- Frühere Arbeit bleibt Teil des Systems. Weitere Historie wird bei Bedarf nachgeladen; eine unvollständige Datenmenge wird weder als vollständige Anzahl noch als leer dargestellt.

Die Szene ist ein gemeinsames Element des Chats und bleibt beim Verlauf verankert. Ein Workflow-Start fügt eine referenzierte Aktivität hinzu, keinen zweiten vollständigen Graphen derselben Agenten. Mehrere Workflows haben unterscheidbare Gruppen beziehungsweise auswählbare Aufträge im selben System. Das ursprüngliche Startereignis im Verlauf führt zur entsprechenden Auswahl. Der Workflow-Editor bleibt für das Planen von Abhängigkeiten erhalten.

## E. Hunderte Agenten ohne Hunderte Einzelverbindungen

Vollständigkeit bezieht sich auf den Datenbestand und die Erreichbarkeit. Bei geringerem Zoom ist nicht jeder einzelne Agent gleichzeitig als kleines e sichtbar. Die Verdichtung richtet sich nach Fläche, Mindestgröße der Klickziele, Anzahl sichtbarer Ebenen und tatsächlicher Zusammenarbeit.

### Relevanz ohne Verlust

1. Aktuell ausgewählter Agent samt Auftraggeber und benötigten Beziehungen bleibt einzeln sichtbar.
2. Aktuelle Zusammenarbeit erscheint im nahen Orbit. Wenn ihre Menge die verfügbare Fläche überschreitet, entstehen lokale Gruppen nach tatsächlichem Orchestrator und Workflow-Zweig.
3. Offene Entscheidungen und Fehler bleiben über erkennbare Aufmerksamkeitssignale und exakte Zähler erreichbar, auch wenn es mehr Probleme als freie Einzelplätze gibt. Sie werden nie still als erledigte Historie einsortiert.
4. Frühere Beteiligte bilden äußere Gruppen nach tatsächlichem Zusammenhang, beispielsweise Projekt, Workflow-Lauf oder Delegationsfamilie. Alter kann ihre Reihenfolge beeinflussen, nicht ihre Zugehörigkeit löschen.

Eine verdichtete aktive Gruppe zeigt eine gebündelte Verbindung und die genaue Zahl gerade orchestrierter Mitglieder. Beim Öffnen fächert sich diese Verbindung in die echten Einzelverbindungen auf. Sie darf nicht suggerieren, dass jedes historische Mitglied der Gruppe gerade arbeitet. Gemischte Gruppen müssen aktive, wartende, offene und abgeschlossene Anteile getrennt ausweisen können.

Beispiel: 500 beteiligte Agenten, davon 9 gerade in Arbeit, 3 mit offenen Entscheidungen und 488 frühere Beteiligte. Bei ausreichender Breite erscheinen die 9 einzeln im Nahorbit; die 3 offenen Fälle bleiben direkt zugänglich; die 488 werden in wenige äußere Gruppen verdichtet. Sind dagegen 200 gleichzeitig aktiv, muss auch der Nahorbit nach Workflow und Auftraggeber verdichten. Zoom oder Gruppenauswahl legt jeweils den relevanten Zweig offen.

### Stabile Gruppen und Auffindbarkeit

- Gruppen haben stabile IDs aus ihrem fachlichen Zusammenhang. Ereignisse sortieren nicht ständig das ganze Bild um.
- Öffnen einer Gruppe löst nur den betrachteten Zweig auf. Eine räumliche oder virtualisierte Mitgliederliste macht alle Einzelagenten auch dann erreichbar, wenn weiterer Zoom keinen Platz schafft.
- Eine Suche über die Beteiligten kann einen bestimmten Agenten oder Auftrag hervorheben, dessen Gruppe öffnen und seinen Pfad zeigen. Für nicht lokal geladene Historie wird die Anfrage serverseitig fortgesetzt.
- Eine markierte Gruppe bleibt während der Interaktion stabil. Offene Ergebnisse und Tastaturfokus werden vor automatischem Verdichten geschützt.
- Schwellen haben eine Hysterese: leichtes Zoomen führt nicht abwechselnd zum Gruppieren und Auflösen. Gruppen werden nicht allein wegen einer kleinen Statusschwankung umgebaut.
- Gleichnamige Agenten und wiederholte Aufgaben bleiben anhand ihrer tatsächlichen IDs unterscheidbar. Ein Workflow-Schritt und sein ausführender Lauf werden nicht als zwei unabhängige Agenten gezählt. Mehrere Ausführungen derselben Rolle werden nicht allein aufgrund des Namens zusammengelegt.

## F. Technische Umsetzung

### Daten, Szene und Ausführung trennen

Das vorhandene `WorkspaceModel` wird zur gemeinsamen Beteiligungssicht des Chats weiterentwickelt. Benötigt werden stabile Objekt- und Ausführungs-IDs, Chatzugehörigkeit, tatsächlicher Auftraggeber, Workflow-Zuordnung, Status und Aktualität. Frühere Beteiligung muss dauerhaft und seitenweise abrufbar sein. Bestehende Zeitfilter, die ältere Agenten aus dem aktuellen Kontext entfernen, werden für diese Ansicht ersetzt.

Die Ansichtsstruktur ergänzt `orbitParentId`, `orbitBand` (nah, außen), Gruppenmitgliedschaft und Auswahl. Physische Datenbeziehungen werden beim Heranziehen nicht umgeschrieben. Ein Körper besitzt pro Szene eine Position; mehrere sachliche Beziehungen bleiben über separate Referenzen erreichbar. Fehlende Eltern und unvollständige Daten erzeugen einen gekennzeichneten Zusammenhang, keine erfundene direkte Delegation.

Eine gemeinsame Orbitszene ersetzt die bisher getrennten Darstellungen in `delegation-graph.tsx`, `workspace-map-canvas.tsx` und den wiederholten Workflow-Graphen im Chat. Bestehende Navigation, Zoom, Ergebnisse und Historie werden zuerst übernommen; danach entfällt der separate Kartenzugang. Der Workflow-Editor und die Ergebnisrouten bleiben erhalten.

### Berechnung und Bewegung

- Weltkoordinaten mit lokalen Umlaufbahnen und stabilen Startwinkeln. Das Symbol selbst bleibt aufrecht; nur sein Mittelpunkt wandert.
- Kollisionsprüfung berücksichtigt den gesamten Bewegungsraum eines Körpers samt Unteragenten und Klickfläche, einschließlich Wechseln zwischen nahem und äußerem Orbit. Nicht nur ein statischer Screenshot muss passen.
- Gruppen wählen sich aus Bildschirmraum und Zoom. Keine feste inhaltliche Begrenzung auf drei Projekte, sechs Chats oder fünfzig Agenten.
- Nur sichtbare Einzelkörper und Gruppen werden gezeichnet. Hunderte gespeicherte Datensätze erzeugen nicht automatisch Hunderte DOM-Elemente und Animationen.
- Eine gemeinsame Uhr für die sichtbare Szene; keine Layoutberechnung und kein kompletter React-Neuaufbau pro Frame. Strukturänderungen werden gebündelt verarbeitet. Transkripte werden erst beim Öffnen geladen.
- Zugehörigkeitsumlauf langsam und gleichmäßig, Arbeitsimpulse ausschließlich ereignisgebunden. Keine physikalische Simulation nötig; deterministische Bahnen und begrenzte Übergänge halten die Ansicht vorhersehbar.
- Anhalten und Fortsetzen erhalten die Phase. Nach einem Hintergrundaufenthalt werden keine historischen Impulse abgespielt und keine großen Positionssprünge nachgeholt.
- Zunächst SVG-Bahnen und zugängliche HTML-Ziele. Ein Wechsel zu Canvas wird nur durch gemessene Grenzen begründet. Die Verdichtung bleibt auch mit Canvas notwendig.

### Betroffene Bereiche

| Bereich                                                   | Änderung                                                                                            |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Sidebar-Aufrufer, `constant-orb.*`, `agent-mark.tsx`      | Ausschließlich Sidebar-Ringe optisch ausbalancieren                                                 |
| Chat-Ursprung und bisheriger Kartenknopf                  | Lead-Chat als Stern, gemeinsame Szene direkt einbetten                                              |
| `build-workspace-model.ts`, Kontext und Relevanz          | Aktuelle und frühere Beteiligung vollständig zusammenführen; alte automatische Ausblendung ersetzen |
| Layout und neue Orbitsmodule                              | Echte Elternbahnen, naher Orbit, Übergänge und stabile Verdichtung                                  |
| Delegations- und Workflow-Chatkomponenten                 | Eine Szene statt mehrfacher Graphen, aktuelle direkte Verbindungen                                  |
| Überblicksvertrag und Serverabfragen, soweit erforderlich | Beteiligungshistorie, vollständige Zähler, paginierte Mitglieder und Suche                          |
| Bestehende Ergebnisansichten und Navigation               | Zielgenauen Zugriff und Rückkehr zum gleichen Ausschnitt erhalten                                   |

## Reihenfolge und Abnahme

1. Sidebar-Ringe getrennt korrigieren; Chatstern und Rollenbedeutung festlegen.
2. Beteiligungsmodell samt Historie, IDs und korrekten Zählern absichern.
3. Statische gemeinsame Chatszene mit nahem und äußerem Orbit, Verdichtung und Ergebniszugriff fertigstellen.
4. Bestätigte Orchestrierung an den Nahorbit und direkte Verbindungen anbinden; Workflow-Zweige und gemeinsame Ergebnisse prüfen.
5. Zoom, Gruppensuche und bisherige Kartenfunktionen übernehmen; separaten Kartenzugang anschließend entfernen.
6. Bewegung und Übergänge ergänzen, Belastung messen und die installierte App nativ abnehmen.

Prüffälle umfassen 0, 1, 12, 100, 500 und 1.000 beteiligte Agenten; zusätzlich 200 gleichzeitig aktive, viele gleichnamige Rollen, verschachtelte Delegationen, mehrere parallele Workflows und mehr offene Entscheidungen als verfügbare Einzelplätze. Geprüft werden alle Fälle mit schmalem Fenster, Tastatur, reduzierter Bewegung, Verbindungsabbruch und nachgeladener Historie.

Abnahmekriterien:

- Lead-Chat bleibt ein Stern. Aktuelle und frühere Beteiligung ist vollständig repräsentiert und auffindbar.
- Jeder gerade orchestrierte Agent ist einzeln oder über eine korrekt gezählte aktive Gruppe im Nahorbit seines tatsächlichen Orchestrators erreichbar.
- Wechsel in den Nahorbit erzeugen direkte Verbindungen, ohne Agenten zu duplizieren oder die Ausführung zu beeinflussen.
- Keine Kollisionen über vollständige Umläufe und Orbitwechsel, keine unbedienbar kleinen Ziele und keine endlose vertikale Agentenspalte.
- Gruppierte Zähler stimmen mit eindeutigen Mitgliedern und den serverseitigen Gesamtzahlen überein; ungeladene Daten bleiben erkennbar.
- Kamera, Leseposition, Auswahl und offene Ergebnisse überstehen Zustandswechsel und Wiederverbindung.
- Auf dem Zielgerät werden Framezeiten, Interaktionslatenz und Leerlauflast bei 500 und 1.000 Beteiligten gemessen. Flüssigkeit wird erst nach dieser Messung bestätigt, nicht aus einer Skizze abgeleitet.

Die begleitende Skizze demonstriert Chatstern, Orbitwechsel, direkte Verbindungen und Verdichtung mit Beispieldaten. Sie belegt weder eine Laufzeitanbindung noch die fertige Skalierung der installierten App.
