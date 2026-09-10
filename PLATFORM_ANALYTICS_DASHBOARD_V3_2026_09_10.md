# Platform Analytics Dashboard V3 · 2026-09-10

## Ziel
Visuelles Platform-Admin-Dashboard für schnelle Auffälligkeitserkennung plus kompakte Deep-Dive-Tabellen und Excel-kompatible Exporte.

## Oberfläche
- KPI-Leiste: aktive User, Logins, Modulaufrufe, Food-Moment-Verknüpfungen, Einkaufsaktionen
- Aktivitätsverlauf als Chart
- Top-Module als Balkenauswertung
- Device-Verteilung der Logins
- Top-Auffälligkeiten aus Friction-/Verweildauer-/Connection-Signalen
- Funnel-Vorschau und Retention D1/D7/D14/D30
- Vorschautabellen für letzte Logins, Aktionen und Top-User
- Deep-Dive-Sektionen für User & Logins, Klickstrecken, Module, Funktionen, Conversions, Fehler & Friction
- User-Detail-Journey per Klick

## Export
Jede Deep-Dive-Auswertung besitzt einen Excel-Export. Die Dateien werden als UTF-8-CSV mit Semikolon-Trennung erzeugt und sind direkt mit Excel kompatibel. Dadurch ist keine zusätzliche Frontend- oder Serverbibliothek erforderlich.

## Backend
Keine Backend- oder Datenbankänderung notwendig. Dashboard V3 nutzt die vorhandenen Platform-Analytics-V2-Endpunkte und die bestehende `product_events`-Instrumentierung.
