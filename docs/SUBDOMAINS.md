# Nutzer-Subdomains

CuffMap unterstützt öffentliche Nutzerseiten unter Wildcard-Subdomains, z. B.:

```text
user.cuffmap.fesselspiel.com
```

Beim Aufruf einer Subdomain erkennt die API den `Host`-Header, lädt den zugeordneten Nutzer über `users.public_subdomain` und liefert nur dessen freigegebene Beiträge (`status=approved`) aus.

## DNS

Für den Produktivbetrieb müssen beide Records auf den Server zeigen:

```text
cuffmap.fesselspiel.com       A/AAAA  SERVER-IP
*.cuffmap.fesselspiel.com     A/AAAA  SERVER-IP
```

Ohne Wildcard-DNS funktionieren einzelne Nutzer-Subdomains nicht zuverlässig. Der Betrieb per `http://SERVER-IP:PUBLIC_TEST_PORT` bleibt für Entwicklung und Tests möglich.

## Umgebungsvariablen

```env
APP_URL=https://cuffmap.fesselspiel.com
PUBLIC_BASE_DOMAIN=cuffmap.fesselspiel.com
NEXT_PUBLIC_PUBLIC_BASE_DOMAIN=cuffmap.fesselspiel.com
```

`PUBLIC_BASE_DOMAIN` ist die Basis, gegen die Laravel Subdomains aus dem Host-Header erkennt.

## Let’s Encrypt ohne DNS-Challenge

CuffMap verwendet fuer Nutzer-Subdomains keine DNS-API und keine DNS-01-Challenge.
Wildcard-Zertifikate fuer `*.cuffmap.fesselspiel.com` sind mit der HTTP-01-Challenge technisch nicht moeglich. Stattdessen erstellt CuffMap fuer jede aktivierte Nutzer-Subdomain automatisch ein einzelnes Zertifikat, z. B. fuer:

```text
user.cuffmap.fesselspiel.com
```

Voraussetzungen:

- `cuffmap.fesselspiel.com` zeigt auf den Server.
- `*.cuffmap.fesselspiel.com` zeigt per Wildcard-DNS auf denselben Server.
- Port 80 ist von Let's Encrypt erreichbar.
- Nginx liefert `/.well-known/acme-challenge/` aus dem ACME-Webroot aus.

Die Anwendung ruft beim Setzen einer Subdomain intern Certbot mit Webroot/HTTP-Challenge auf:

```bash
certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --preferred-challenges http \
  -d user.cuffmap.fesselspiel.com
```

Es wird kein DNS-Plugin benoetigt.

## Docker-Konfiguration

Aktiviere die automatische Zertifikatsausstellung in `.env`:

```env
LETSENCRYPT_ENABLED=true
LETSENCRYPT_EMAIL=admin@example.com
LETSENCRYPT_STAGING=false
HTTPS_PORT=443
PUBLIC_TEST_PORT=80
```

Fuer den ersten Test sollte `LETSENCRYPT_STAGING=true` gesetzt werden, damit keine Rate-Limits von Let's Encrypt verbraucht werden.

Docker Compose stellt zwei gemeinsame Volumes bereit:

```text
letsencrypt_certs     -> /etc/letsencrypt
letsencrypt_webroot   -> /var/www/certbot
```

Der `api`-Container schreibt die HTTP-Challenge-Dateien und Zertifikate. Der `reverse-proxy`-Container liest Challenge-Dateien und Zertifikate. Der `certbot-renew`-Container erneuert bestehende Zertifikate automatisch. Der Reverse Proxy prueft regelmaessig Zertifikatsdateien und laedt Nginx nach Aenderungen neu.

Wenn ein Host-Nginx vor Docker TLS beendet, muessen Docker und Host dieselben Pfade verwenden:

```env
LETSENCRYPT_CERTS_PATH=/etc/letsencrypt
LETSENCRYPT_WEBROOT=/var/www/certbot
LETSENCRYPT_WEBROOT_PATH=/var/www/certbot
```

Dann kann die API Zertifikate in die Host-Zertifikatsstruktur schreiben, waehrend Nginx die HTTP-Challenge unter `/var/www/certbot` ausliefert.

## Externer Nginx vor Docker

Wenn ein Host-Nginx vor Docker laeuft, muss dessen ACME-Webroot auf denselben Pfad zeigen, der fuer Certbot erreichbar ist. Die Beispielkonfiguration nutzt:

```text
/var/www/cuffmap-certbot
```

Die Challenge-Location muss vor Redirects greifen:

```nginx
location ^~ /.well-known/acme-challenge/ {
    root /var/www/cuffmap-certbot;
    default_type text/plain;
    try_files $uri =404;
}
```

Die externe Nginx-Konfiguration muss beide Hosts bedienen:

```nginx
server_name cuffmap.fesselspiel.com *.cuffmap.fesselspiel.com;
```

Die Beispielkonfiguration liegt unter:

```text
infra/nginx/cuffmap.fesselspiel.com.conf
```

Wichtig: Wenn ein externer Nginx TLS beendet, muss dieser Zugriff auf die erzeugten Zertifikate unter `/etc/letsencrypt/live/<hostname>/` haben oder selbst denselben Certbot-Webroot verwenden. Alternativ kann Docker direkt Port 80/443 uebernehmen.

Fuer automatisch eingebundene Nutzer-Zertifikate liegt ein Generator unter:

```text
infra/nginx/cuffmap-refresh-subdomain-nginx.sh
```

Dieser erzeugt aus vorhandenen Zertifikaten passende Nginx-Serverbloecke fuer `*.cuffmap.fesselspiel.com`, testet die Nginx-Konfiguration und laedt Nginx neu. Auf Hosts mit externem Nginx sollte er per systemd-Timer regelmaessig laufen und als Certbot-Deploy-Hook eingebunden werden:

```bash
install -m 0755 infra/nginx/cuffmap-refresh-subdomain-nginx.sh /usr/local/sbin/cuffmap-refresh-subdomain-nginx
cat >/etc/letsencrypt/renewal-hooks/deploy/reload-nginx <<'HOOK'
#!/bin/sh
/usr/local/sbin/cuffmap-refresh-subdomain-nginx
systemctl reload nginx
HOOK
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx
```

## Nutzer-Konfiguration

Angemeldete Nutzer setzen ihre Subdomain im Profil. Erlaubt sind:

- Kleinbuchstaben `a-z`
- Zahlen `0-9`
- Bindestriche
- Länge 3 bis 40 Zeichen
- kein Bindestrich am Anfang oder Ende

Reservierte Namen wie `admin`, `api`, `www`, `shopify`, `mail`, `storage`, `posts` und weitere technische Begriffe sind gesperrt.

## API

Aktuellen Subdomain-Kontext anhand des Host-Headers laden:

```http
GET /api/public/subdomain
```

Subdomain des eingeloggten Nutzers setzen oder löschen:

```http
PUT /api/auth/me/subdomain
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "public_subdomain": "username"
}
```

Zum Entfernen:

```json
{
  "public_subdomain": null
}
```
