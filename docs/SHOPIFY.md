# Shopify Integration

Shopify ist die zentrale Quelle für Produktdaten. CuffMap synchronisiert alle Produkte und Varianten, zeigt Nutzern aber nur explizit freigegebene Datensätze.

## Custom App

In Shopify eine Custom App mit Admin GraphQL Zugriff anlegen. Benötigte Leserechte:

- `read_products`

Empfohlene Webhook-Rechte:

- `products/create`
- `products/update`
- `products/delete`

## Umgebungsvariablen

```env
SHOPIFY_SHOP_DOMAIN=your-shop.myshopify.com
SHOPIFY_ADMIN_API_TOKEN=shpat_...
SHOPIFY_API_VERSION=2026-04
SHOPIFY_STOREFRONT_BASE_URL=https://fesselspiel.com
SHOPIFY_WEBHOOK_SECRET=...
```

## Synchronisierung

Manuell:

```bash
docker compose exec api php artisan cuffmap:sync-shopify
```

Per API:

```http
POST /api/admin/shopify/sync
Authorization: Bearer ADMIN_TOKEN
```

## Sichtbarkeit

Nach dem Import sind Shopify-Produkte standardmäßig:

- `visibility=hidden`
- `is_selectable=false`

Administratoren geben Produkte, Varianten oder Variantengruppen über die Admin API frei.

## Variantenlogik

Pro Produkt können gesetzt werden:

- `relevant_options`, z. B. `["Set", "Größe"]`
- `ignored_options`, z. B. `["Farbe", "Verpackung", "Lagerort"]`
- `merge_variants`, um Varianten in CuffMap zusammenzufassen

Variantengruppen erlauben eine Nutzeranzeige wie `Starter Set`, obwohl Shopify mehrere Farbvarianten enthält.
