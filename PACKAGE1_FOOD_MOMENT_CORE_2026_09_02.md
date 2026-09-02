# Paket 1 – Frontend-Hinweis

Paket 1 ist bewusst ein Core-/API-Paket. Die bestehende UI bleibt unverändert, damit vor Paket 2 keine halbfertige Doppel-UX entsteht.

Der Server unterstützt jetzt das zentrale Food-Moment-Zeitmodell (`starts_at`, `ends_at`, `is_all_day`), Herkunft und Wiederholung. Paket 2 stellt die bestehende Wochenansicht auf diese API um und ergänzt die Kalenderansicht.
