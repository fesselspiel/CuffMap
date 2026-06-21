# REST API

Alle geschützten Endpunkte nutzen:

```http
Authorization: Bearer TOKEN
```

## Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/me/subdomain`
- `POST /api/auth/account/export`
- `DELETE /api/auth/account`

Login akzeptiert E-Mail oder Benutzername:

```json
{
  "login": "admin",
  "password": "ChangeMe123!"
}
```

## Öffentliche Subdomains

- `GET /api/public/subdomain`

Der Endpunkt erkennt die Nutzer-Subdomain über den `Host`-Header und gibt Nutzer, öffentliche Beiträge und Marker zurück. Auf der Basisdomain liefert er `is_subdomain=false`.

## Beiträge

- `GET /api/posts`
- `GET /api/me/posts`
- `GET /api/posts/{idOrSlug}`
- `POST /api/posts`
- `PUT /api/posts/{idOrSlug}`
- `DELETE /api/posts/{idOrSlug}`

Beiträge liefern `slug` und optional `instagram_links`. Beim Erstellen wird der Slug automatisch aus dem Titel erzeugt. Administratoren dürfen den Slug beim Bearbeiten setzen. `instagram_links` akzeptiert bis zu 10 konkrete Instagram-Post-URLs.

Beitrag erstellen:

```json
{
  "title": "Am See",
  "description": "Sommerfoto",
  "latitude": 52.52,
  "longitude": 13.405,
  "location_label": "Berlin",
  "location_precision": 100,
  "gps_consent": false,
  "image_ids": [1],
  "products": [{ "product_id": 1, "product_variant_id": null, "variant_group_id": null }],
  "instagram_links": [{ "permalink": "https://www.instagram.com/p/ABC123/" }]
}
```

## Instagram

- `GET /api/instagram/user?username=handle`
- `GET /api/instagram/user-media?username=handle`

Diese Endpunkte benötigen `INSTAGRAM_GRAPH_ACCESS_TOKEN` und `INSTAGRAM_BUSINESS_ACCOUNT_ID`. Manuelle Instagram-URLs können auch ohne API-Konfiguration gespeichert werden.

## Karte

- `GET /api/map/markers`
- `GET /api/map/markers?bbox=west,south,east,north`
- `GET /api/map/markers?product=Starter`
- `GET /api/map/markers?location=See`

## Uploads

- `POST /api/uploads/image`
- `DELETE /api/uploads/{id}`

Multipart-Felder:

- `image`: JPG, PNG oder WEBP
- `use_exif_gps`: `true` nur nach Zustimmung

## Produkte

- `GET /api/products/search?q=...`
- `GET /api/products/{id}`
- `GET /api/variants/{id}`

Die öffentliche Produktsuche liefert ausschließlich freigegebene und auswählbare Produkte aus.

## Hotspots

- `POST /api/posts/{id}/hotspots`
- `PUT /api/hotspots/{id}`
- `DELETE /api/hotspots/{id}`

```json
{
  "post_image_id": 1,
  "x": 0.42,
  "y": 0.63,
  "product_id": 1,
  "product_variant_id": null,
  "variant_group_id": null,
  "description": "Produkt im Bild"
}
```

## Admin

- `GET /api/admin/shopify/products`
- `GET /api/admin/shopify/products/{id}`
- `GET /api/admin/shopify/variants`
- `PUT /api/admin/shopify/products/{id}/settings`
- `PUT /api/admin/shopify/variants/{id}/settings`
- `POST /api/admin/shopify/sync`
- `PUT /api/admin/posts/{id}/moderation`
