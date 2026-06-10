# Docker Anleitung

## Services

- `reverse-proxy`: interner Nginx, exposed über `PUBLIC_TEST_PORT`
- `frontend`: Next.js
- `api`: Laravel API
- `postgres`: PostgreSQL/PostGIS
- `redis`: Redis
- `queue`: Laravel Queue Worker
- `certbot-renew`: automatische Erneuerung vorhandener Let’s-Encrypt-Zertifikate per HTTP-Challenge

## Start

```bash
docker compose up -d --build
```

## Logs

```bash
docker compose logs -f api
docker compose logs -f frontend
```

## Migrationen

```bash
docker compose exec api php artisan migrate --force
docker compose exec api php artisan db:seed --force
```

## HTTPS per HTTP-Challenge

Docker Compose stellt zwei Volumes fuer Let's Encrypt bereit:

- `letsencrypt_webroot`: Challenge-Dateien unter `/var/www/certbot`
- `letsencrypt_certs`: Zertifikate unter `/etc/letsencrypt`

Aktivierung:

```env
PUBLIC_TEST_PORT=80
HTTPS_PORT=443
LETSENCRYPT_ENABLED=true
LETSENCRYPT_EMAIL=admin@example.com
LETSENCRYPT_STAGING=false
LETSENCRYPT_WEBROOT=/var/www/certbot
LETSENCRYPT_WEBROOT_PATH=./storage/certbot
LETSENCRYPT_CERTS_PATH=./storage/letsencrypt
```

Beim Speichern einer Nutzer-Subdomain fordert die API automatisch ein einzelnes Zertifikat fuer `<subdomain>.<PUBLIC_BASE_DOMAIN>` an:

```bash
docker compose exec api php artisan cuffmap:issue-subdomain-certificate username
```

Es wird ausschliesslich die HTTP-01-Challenge verwendet. DNS-API und DNS-01-Challenge sind nicht erforderlich.

Wenn ein externer Host-Nginx TLS beendet, setze die Pfade auf Host-Verzeichnisse:

```env
LETSENCRYPT_WEBROOT=/var/www/certbot
LETSENCRYPT_WEBROOT_PATH=/var/www/certbot
LETSENCRYPT_CERTS_PATH=/etc/letsencrypt
```

Der Host-Nginx muss dann `/.well-known/acme-challenge/` aus `/var/www/certbot` ausliefern und nach Zertifikatserneuerungen neu laden.

## Shell

```bash
docker compose exec api sh
docker compose exec frontend sh
```
