<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('cuffmap:sync-shopify', function () {
    app(\App\Services\ShopifySyncService::class)->syncProducts();
    $this->info('Shopify sync completed.');
})->purpose('Synchronize Shopify products and variants');

Artisan::command('cuffmap:issue-subdomain-certificate {subdomain}', function (string $subdomain) {
    $result = app(\App\Services\LetsEncryptService::class)->requestForSubdomain($subdomain);
    $this->info(json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
})->purpose('Issue or reuse a Let’s Encrypt certificate for a public user subdomain via HTTP challenge');
