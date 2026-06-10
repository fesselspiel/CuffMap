<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\AppSetting;
use GuzzleHttp\Client;
use Illuminate\Support\Arr;

class ShopifySyncService
{
    public function syncProducts(): int
    {
        $token = AppSetting::getValue('shopify_admin_api_token', env('SHOPIFY_ADMIN_API_TOKEN'));
        $shop = AppSetting::getValue('shopify_shop_domain', env('SHOPIFY_SHOP_DOMAIN'));

        if (! $token || ! $shop) {
            return 0;
        }

        $client = new Client([
            'base_uri' => 'https://'.$shop.'/admin/api/'.env('SHOPIFY_API_VERSION', '2026-04').'/graphql.json',
            'headers' => [
                'X-Shopify-Access-Token' => $token,
                'Content-Type' => 'application/json',
            ],
            'timeout' => 30,
        ]);

        $cursor = null;
        $count = 0;

        do {
            $query = <<<'GRAPHQL'
query Products($cursor: String) {
  products(first: 50, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id title handle vendor productType tags
      featuredImage { url }
      variants(first: 100) {
        nodes { id title sku image { url } selectedOptions { name value } }
      }
    }
  }
}
GRAPHQL;
            $response = $client->post('', ['json' => ['query' => $query, 'variables' => ['cursor' => $cursor]]]);
            $data = json_decode((string) $response->getBody(), true);
            $products = Arr::get($data, 'data.products.nodes', []);

            foreach ($products as $product) {
                $this->upsertGraphqlProduct($product);
                $count++;
            }

            $cursor = Arr::get($data, 'data.products.pageInfo.endCursor');
            $hasNext = (bool) Arr::get($data, 'data.products.pageInfo.hasNextPage', false);
        } while ($hasNext);

        return $count;
    }

    public function upsertWebhookProduct(array $payload): Product
    {
        $shopifyId = (string) ($payload['admin_graphql_api_id'] ?? $payload['id']);
        $product = Product::updateOrCreate(
            ['shopify_id' => $shopifyId],
            [
                'title' => $payload['title'] ?? 'Untitled product',
                'handle' => $payload['handle'] ?? null,
                'vendor' => $payload['vendor'] ?? null,
                'product_type' => $payload['product_type'] ?? null,
                'tags' => array_filter(array_map('trim', explode(',', (string) ($payload['tags'] ?? '')))),
                'image_url' => $payload['image']['src'] ?? null,
                'shop_url' => $this->shopUrl($payload['handle'] ?? null),
                'synced_at' => now(),
            ]
        );

        foreach ($payload['variants'] ?? [] as $variant) {
            ProductVariant::updateOrCreate(
                ['shopify_id' => (string) ($variant['admin_graphql_api_id'] ?? $variant['id'])],
                [
                    'product_id' => $product->id,
                    'title' => $variant['title'] ?? 'Default',
                    'sku' => $variant['sku'] ?? null,
                    'options' => $this->webhookOptions($variant),
                    'synced_at' => now(),
                ]
            );
        }

        return $product;
    }

    public function markProductDeleted(string $shopifyId): void
    {
        Product::where('shopify_id', $shopifyId)->update(['visibility' => 'hidden', 'is_selectable' => false]);
    }

    private function upsertGraphqlProduct(array $node): void
    {
        $product = Product::updateOrCreate(
            ['shopify_id' => $node['id']],
            [
                'title' => $node['title'],
                'handle' => $node['handle'] ?? null,
                'vendor' => $node['vendor'] ?? null,
                'product_type' => $node['productType'] ?? null,
                'tags' => $node['tags'] ?? [],
                'image_url' => Arr::get($node, 'featuredImage.url'),
                'shop_url' => $this->shopUrl($node['handle'] ?? null),
                'synced_at' => now(),
            ]
        );

        foreach (Arr::get($node, 'variants.nodes', []) as $variant) {
            ProductVariant::updateOrCreate(
                ['shopify_id' => $variant['id']],
                [
                    'product_id' => $product->id,
                    'title' => $variant['title'],
                    'sku' => $variant['sku'] ?? null,
                    'options' => collect($variant['selectedOptions'] ?? [])->pluck('value', 'name')->all(),
                    'image_url' => Arr::get($variant, 'image.url'),
                    'synced_at' => now(),
                ]
            );
        }
    }

    private function shopUrl(?string $handle): ?string
    {
        return $handle ? rtrim((string) env('SHOPIFY_STOREFRONT_BASE_URL'), '/').'/products/'.$handle : null;
    }

    private function webhookOptions(array $variant): array
    {
        $options = [];
        foreach (['option1', 'option2', 'option3'] as $key) {
            if (! empty($variant[$key])) {
                $options[$key] = $variant[$key];
            }
        }

        return $options;
    }
}
