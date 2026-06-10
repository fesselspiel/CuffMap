# Entwicklerdokumentation

## Architektur

Das Frontend spricht ausschließlich mit der Laravel REST API. Die Datenbank ist nicht direkt vom Frontend abhängig. Dadurch können TYPO3, Mobile Apps oder Shopify Apps dieselben Endpunkte verwenden.

## Moderation

Statuswerte:

- `submitted`
- `reviewing`
- `approved`
- `rejected`

Öffentliche Listen und Kartenmarker zeigen nur `approved`.

## Datenschutz

- Standortdaten werden pro Beitrag gespeichert.
- `location_precision` dokumentiert die gewünschte Rundung.
- EXIF wird beim Speichern neu encodiert und dadurch bereinigt.
- EXIF-GPS wird nur verarbeitet, wenn `use_exif_gps=true` gesendet wird.
- Datenexport: `POST /api/auth/account/export`
- Kontolöschung: `DELETE /api/auth/account`

## Tests

Empfohlene Kommandos:

```bash
docker compose exec api php artisan test
docker compose exec frontend npm run lint
```

## Erweiterungen

Naheliegende nächste Schritte:

- Geocoding-Dienst für Standortsuche ergänzen
- Admin-UI für Variantengruppen ausbauen
- Queue-Schedule für regelmäßigen Shopify-Sync aktivieren
- Mail-Transport für Passwort-Reset konfigurieren
