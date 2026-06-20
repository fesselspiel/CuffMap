# Deployment

## Server-Voraussetzungen

- Docker
- Docker Compose V2
- Externer Nginx mit SSL-Zertifikaten oder Docker-Reverse-Proxy auf Port 80/443
- DNS-A-Record für `cuffmap.fesselspiel.com`, falls Domainbetrieb gewünscht ist
- DNS-Wildcard-Record für `*.cuffmap.fesselspiel.com`, falls Nutzer-Subdomains verwendet werden
- DNS-A-Record für `cuffmap.com`, falls die zusätzliche Hauptdomain verwendet wird
- DNS-Wildcard-Record für `*.cuffmap.com`, falls Nutzer-Subdomains auch unter `cuffmap.com` verwendet werden

DNS ist nicht zwingend: Für Tests genügt `http://SERVER-IP:PUBLIC_TEST_PORT`.

## Installation

```bash
git clone <repo> /opt/cuffmap
cd /opt/cuffmap
cp .env.example .env
nano .env
docker compose up -d --build
```

## Initiale Befehle

```bash
docker compose exec api php artisan db:seed --force
docker compose exec api php artisan cuffmap:sync-shopify
```

## Updates

```bash
cd /opt/cuffmap
git pull
docker compose up -d --build
docker compose exec api php artisan migrate --force
```

## Reverse Proxy

Die Datei `infra/nginx/cuffmap.fesselspiel.com.conf` leitet HTTPS-Traffic an den internen Docker-Proxy weiter:

```nginx
proxy_pass http://127.0.0.1:8088;
```

Für größere Bilder `client_max_body_size` passend zu `UPLOAD_MAX_SIZE` setzen.

Für Nutzer-Subdomains muss der externe Nginx `cuffmap.fesselspiel.com`, `*.cuffmap.fesselspiel.com`, `cuffmap.com` und `*.cuffmap.com` bedienen. CuffMap nutzt keine DNS-API und keine DNS-01-Challenge. Stattdessen werden einzelne Zertifikate pro Nutzer-Subdomain per Let’s-Encrypt-HTTP-01-Challenge erstellt.

Wichtige Produktionswerte:

```env
PUBLIC_TEST_PORT=80
HTTPS_PORT=443
PUBLIC_BASE_DOMAIN=cuffmap.fesselspiel.com
PUBLIC_BASE_DOMAINS=cuffmap.fesselspiel.com,cuffmap.com
LETSENCRYPT_ENABLED=true
LETSENCRYPT_EMAIL=admin@example.com
LETSENCRYPT_STAGING=false
```

Port 80 muss fuer `/.well-known/acme-challenge/` von Let's Encrypt erreichbar sein. Details stehen in `docs/SUBDOMAINS.md`.

## Backups

```bash
docker compose exec postgres pg_dump -U cuffmap cuffmap > cuffmap.sql
docker run --rm -v cuffmap_api_uploads:/data -v "$PWD:/backup" alpine tar czf /backup/uploads.tgz /data
```
