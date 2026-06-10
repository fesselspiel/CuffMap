<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use GuzzleHttp\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ShopifyOAuthController
{
    public function install(Request $request)
    {
        $shop = $this->validShop((string) $request->query('shop', env('SHOPIFY_SHOP_DOMAIN', '')));
        abort_unless($shop, 422, 'Invalid Shopify shop domain.');

        $clientId = (string) env('SHOPIFY_CLIENT_ID', '');
        abort_unless($clientId !== '', 500, 'SHOPIFY_CLIENT_ID is missing.');

        $state = Str::random(40);
        AppSetting::setValue('shopify_oauth_state', $state);
        AppSetting::setValue('shopify_shop_domain', $shop);

        $query = http_build_query([
            'client_id' => $clientId,
            'scope' => 'read_products',
            'redirect_uri' => $this->callbackUrl(),
            'state' => $state,
        ], '', '&', PHP_QUERY_RFC3986);

        return redirect()->away("https://{$shop}/admin/oauth/authorize?{$query}");
    }

    public function callback(Request $request)
    {
        $shop = $this->validShop((string) $request->query('shop', ''));
        abort_unless($shop, 422, 'Invalid Shopify shop domain.');
        abort_unless($this->validHmac($request), 401, 'Invalid Shopify callback signature.');

        $state = (string) $request->query('state', '');
        abort_unless($state !== '' && $state === AppSetting::getValue('shopify_oauth_state'), 401, 'Invalid Shopify OAuth state.');

        $code = (string) $request->query('code', '');
        abort_unless($code !== '', 422, 'Missing Shopify OAuth code.');

        $clientId = (string) env('SHOPIFY_CLIENT_ID', '');
        $clientSecret = (string) env('SHOPIFY_CLIENT_SECRET', '');
        abort_unless($clientId !== '' && $clientSecret !== '', 500, 'Shopify OAuth credentials are missing.');

        $client = new Client(['timeout' => 30]);
        $response = $client->post("https://{$shop}/admin/oauth/access_token", [
            'form_params' => [
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'code' => $code,
            ],
            'headers' => ['Accept' => 'application/json'],
        ]);

        $payload = json_decode((string) $response->getBody(), true);
        $token = (string) ($payload['access_token'] ?? '');
        abort_unless($token !== '', 502, 'Shopify did not return an access token.');

        AppSetting::setValue('shopify_admin_api_token', $token);
        AppSetting::setValue('shopify_shop_domain', $shop);
        AppSetting::setValue('shopify_granted_scopes', (string) ($payload['scope'] ?? ''));
        AppSetting::setValue('shopify_oauth_state', null);

        return response()->json([
            'ok' => true,
            'shop' => $shop,
            'message' => 'Shopify app installed. You can now run the CuffMap product sync.',
        ]);
    }

    private function callbackUrl(): string
    {
        return rtrim((string) env('APP_URL', 'https://cuffmap.fesselspiel.com'), '/').'/api/shopify/oauth/callback';
    }

    private function validShop(string $shop): ?string
    {
        $shop = strtolower(trim($shop));

        return preg_match('/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/', $shop) ? $shop : null;
    }

    private function validHmac(Request $request): bool
    {
        $secret = (string) env('SHOPIFY_CLIENT_SECRET', '');
        if ($secret === '') {
            return false;
        }

        $params = $request->query();
        $hmac = (string) ($params['hmac'] ?? '');
        unset($params['hmac'], $params['signature']);
        ksort($params);

        $message = http_build_query($params, '', '&', PHP_QUERY_RFC3986);
        $calculated = hash_hmac('sha256', $message, $secret);

        return $hmac !== '' && hash_equals($calculated, $hmac);
    }
}
