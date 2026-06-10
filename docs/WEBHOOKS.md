# Webhooks

Shopify-Webhooks werden über einen gemeinsamen Endpunkt verarbeitet:

```http
POST /api/webhooks/shopify/products
```

Unterstützte Topics:

- `products/create`
- `products/update`
- `products/delete`

Wenn `SHOPIFY_WEBHOOK_SECRET` gesetzt ist, prüft die API `X-Shopify-Hmac-Sha256`.

## Shopify Einrichtung

Webhook URL:

```text
https://cuffmap.fesselspiel.com/api/webhooks/shopify/products
```

Format:

```text
JSON
```

## Verhalten

- Create/Update: Produkt und Varianten werden aktualisiert.
- Delete: Produkt wird nicht hart gelöscht, sondern auf `hidden` und `is_selectable=false` gesetzt.

Dadurch bleiben historische Beitragsverknüpfungen erhalten.
