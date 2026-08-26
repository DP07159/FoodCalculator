# Wochenplan Board · UX-Überarbeitung 2026-08

Umgesetzt:
- Karten-/Slot-Board statt permanenter Rezept-Dropdowns
- Such-Picker für passende Rezepte und Wallet-Inspirationen
- Drag & Drop für Wochenplan-Karten auf Desktop
- Mobile Tagesansicht als primäre Wochenplan-Nutzung
- Feiner Kalorien-Progress pro Tag statt prominenter Summen-/Rest-Zeilen
- Bewusster Speicher-Workflow: Laden, Entwurf ändern, Plan aktualisieren oder als neuen Plan speichern
- Kennzeichnung ungespeicherter Änderungen und Warnung vor Planwechsel/Seitenwechsel
- Bestehende gespeicherte Pläne mit `recipeId` bleiben kompatibel
- Einkaufsliste berücksichtigt weiterhin alle im Plan platzierten Rezepte

Backend-Hinweis:
Die bestehende Meal-Plan-API speichert den Planinhalt als JSON-Array. Der zusätzliche Eintragstyp `inspiration` ist deshalb ohne Schema-/Datenbankmigration kompatibel.
