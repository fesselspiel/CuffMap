# CuffMap

CuffMap ist eine API-first Community-Plattform für Produktfotos auf einer interaktiven Karte. Nutzer reichen Bilder mit Standort und Produktverknüpfungen ein, Moderatoren geben Beiträge frei, Besucher sehen veröffentlichte Beiträge auf einer Leaflet-Karte.

## Stack

- Frontend: Next.js, React, TypeScript, TailwindCSS, Leaflet, MarkerCluster
- Backend: Laravel 11, REST API, JWT Bearer Auth
- Datenbank: PostgreSQL 16 mit PostGIS
- Container: Docker Compose mit Frontend, API, PostgreSQL/PostGIS, Redis, Queue Worker, internem Nginx
- Reverse Proxy: interner Nginx auf `PUBLIC_TEST_PORT`/`HTTPS_PORT`, optional externer Nginx davor

## Lokal starten

```bash
cp .env.example .env
docker compose up --build
```

Die Plattform ist danach über `http://localhost:8088` erreichbar. Der Port kann über `PUBLIC_TEST_PORT` geändert werden.

Admin-Seed:

- E-Mail: `admin@cuffmap.local`
- Benutzername: `admin`
- Passwort: `ChangeMe123!`

## Entwicklung

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

- Frontend direkt: `http://localhost:3000`
- API direkt: `http://localhost:8000/api/health`
- Komplett über internen Proxy: `http://localhost:8088`

## Produktivbetrieb

1. `.env` aus `.env.example` erstellen.
2. Sichere Werte für `APP_KEY`, `JWT_SECRET`, Datenbankpasswort und Shopify-Token setzen.
3. `PUBLIC_TEST_PORT` auf den lokalen Zielport setzen, z. B. `8088`.
4. Container starten:

```bash
docker compose up -d --build
```

5. Externen Nginx mit `infra/nginx/cuffmap.fesselspiel.com.conf` konfigurieren oder Docker direkt auf Port 80/443 betreiben.

Die Anwendung funktioniert auch ohne DNS direkt per `http://SERVER-IP:PUBLIC_TEST_PORT`.

## Wichtige Umgebungsvariablen

- `APP_URL`: öffentliche Domain, produktiv `https://cuffmap.fesselspiel.com`
- `PUBLIC_BASE_DOMAIN`: Basisdomain für Nutzer-Subdomains, z. B. `cuffmap.fesselspiel.com`
- `PUBLIC_TEST_PORT`: Host-Port des internen Nginx
- `HTTPS_PORT`: HTTPS-Port des internen Nginx
- `LETSENCRYPT_ENABLED`: automatische HTTP-01-Zertifikatsausstellung fuer Nutzer-Subdomains aktivieren
- `LETSENCRYPT_EMAIL`: Kontaktadresse fuer Let’s Encrypt
- `LETSENCRYPT_STAGING`: Testmodus fuer Let’s Encrypt ohne Produktiv-Rate-Limits
- `DATABASE_URL`: PostgreSQL-Verbindungs-URL
- `JWT_SECRET`: Signatur-Secret für Bearer Tokens
- `UPLOAD_MAX_SIZE`: maximale Uploadgröße in Bytes
- `SHOPIFY_SHOP_DOMAIN`: Shopify-Shop, z. B. `example.myshopify.com`
- `SHOPIFY_ADMIN_API_TOKEN`: Token der Shopify Custom App
- `SHOPIFY_API_VERSION`: Admin API Version
- `SHOPIFY_STOREFRONT_BASE_URL`: Shop-URL für Produktlinks
- `INSTAGRAM_GRAPH_ACCESS_TOKEN`: Meta Graph API Token für Instagram Business Discovery
- `INSTAGRAM_BUSINESS_ACCOUNT_ID`: Instagram Business/Creator Account ID, über den Business Discovery ausgeführt wird
- `INSTAGRAM_API_VERSION`: Meta Graph API Version, z. B. `v23.0`
- `CORS_ALLOWED_ORIGINS`: erlaubte Frontend-Origins

## Nutzer-Subdomains

Nutzer können im Profil eine öffentliche Subdomain wie `username.cuffmap.fesselspiel.com` reservieren. Die API erkennt den Host-Header und zeigt auf dieser Subdomain nur freigegebene Beiträge dieses Nutzers. Zertifikate werden pro Nutzer-Subdomain per Let’s-Encrypt-HTTP-01-Challenge erstellt; DNS-API und DNS-01-Challenge werden nicht verwendet. Einrichtung von Wildcard-DNS, Nginx und Let’s Encrypt ist in `docs/SUBDOMAINS.md` dokumentiert.

## Sicherheitsmodell

- JWT Bearer Token im Header `Authorization: Bearer TOKEN`
- Rollen: `guest`, `user`, `moderator`, `administrator`
- Admin-Endpunkte verlangen mindestens Moderator, Shopify-Sync verlangt Administrator
- Uploads prüfen Extension, MIME-Type, Größe und Bildlesbarkeit
- EXIF wird beim Re-Encoding entfernt; GPS wird nur bei Zustimmung gelesen
- Neue Beiträge starten im Status `submitted` und sind erst nach `approved` öffentlich
- Nutzer sehen nur Produkte, Varianten und Variantengruppen mit `visibility=visible` und `is_selectable=true`

## Projektstruktur

```text
api/          Laravel REST API
frontend/     Next.js Web-App
infra/nginx/  interner und externer Nginx
docs/         API, Deployment, Shopify und Entwicklung
```
