<?php

namespace App\Http\Controllers;

use App\Services\ShopifySyncService;
use Illuminate\Http\Request;

class WebhookController
{
    public function shopifyProduct(Request $request, ShopifySyncService $sync)
    {
        $secret = (string) env('SHOPIFY_WEBHOOK_SECRET', '');
        if ($secret !== '') {
            $hmac = $request->header('X-Shopify-Hmac-Sha256', '');
            $calculated = base64_encode(hash_hmac('sha256', $request->getContent(), $secret, true));
            abort_unless(hash_equals($calculated, $hmac), 401);
        }

        $topic = $request->header('X-Shopify-Topic', '');
        if ($topic === 'products/delete') {
            $sync->markProductDeleted((string) $request->input('admin_graphql_api_id', $request->input('id')));
        } else {
            $sync->upsertWebhookProduct($request->all());
        }

        return response()->json(['ok' => true]);
    }
}
