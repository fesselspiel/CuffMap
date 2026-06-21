<?php

use App\Http\Controllers\AdminShopifyController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\HotspotController;
use App\Http\Controllers\InstagramController;
use App\Http\Controllers\MapController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\PublicSubdomainController;
use App\Http\Controllers\ShopifyOAuthController;
use App\Http\Controllers\UploadController;
use App\Http\Controllers\VariantController;
use App\Http\Controllers\WebhookController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['status' => 'ok', 'service' => 'cuffmap-api']);
Route::get('/public/subdomain', [PublicSubdomainController::class, 'show']);

Route::get('/shopify/oauth/install', [ShopifyOAuthController::class, 'install']);
Route::get('/shopify/oauth/callback', [ShopifyOAuthController::class, 'callback']);

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('jwt');
    Route::get('/me', [AuthController::class, 'me'])->middleware('jwt');
    Route::put('/me/subdomain', [AuthController::class, 'updateSubdomain'])->middleware('jwt');
    Route::post('/password/forgot', [AuthController::class, 'forgotPassword'])->middleware('throttle:password-reset');
    Route::post('/account/export', [AuthController::class, 'export'])->middleware('jwt');
    Route::delete('/account', [AuthController::class, 'deleteAccount'])->middleware('jwt');
});

Route::get('/posts', [PostController::class, 'index']);
Route::get('/me/posts', [PostController::class, 'mine'])->middleware('jwt');
Route::get('/posts/{postRef}', [PostController::class, 'show'])->middleware('jwt:optional');
Route::post('/posts', [PostController::class, 'store'])->middleware('jwt');
Route::put('/posts/{postRef}', [PostController::class, 'update'])->middleware('jwt');
Route::delete('/posts/{postRef}', [PostController::class, 'destroy'])->middleware('jwt');

Route::get('/map/markers', [MapController::class, 'markers']);
Route::get('/instagram/user', [InstagramController::class, 'user'])->middleware('jwt');
Route::get('/instagram/user-media', [InstagramController::class, 'userMedia'])->middleware('jwt');

Route::post('/uploads/image', [UploadController::class, 'store'])->middleware('jwt');
Route::delete('/uploads/{image}', [UploadController::class, 'destroy'])->middleware('jwt');

Route::get('/products/search', [ProductController::class, 'search']);
Route::get('/products/{product}', [ProductController::class, 'show']);
Route::get('/variants/{variant}', [VariantController::class, 'show']);

Route::post('/posts/{post}/hotspots', [HotspotController::class, 'store'])->middleware('jwt');
Route::put('/hotspots/{hotspot}', [HotspotController::class, 'update'])->middleware('jwt');
Route::delete('/hotspots/{hotspot}', [HotspotController::class, 'destroy'])->middleware('jwt');

Route::prefix('admin')->middleware(['jwt', 'role:administrator,moderator'])->group(function () {
    Route::get('/shopify/products', [AdminShopifyController::class, 'products']);
    Route::put('/shopify/products/bulk-settings', [AdminShopifyController::class, 'bulkUpdateProductSettings']);
    Route::get('/shopify/products/{product}', [AdminShopifyController::class, 'product']);
    Route::get('/shopify/variants', [AdminShopifyController::class, 'variants']);
    Route::put('/shopify/products/{product}/settings', [AdminShopifyController::class, 'updateProductSettings']);
    Route::put('/shopify/variants/{variant}/settings', [AdminShopifyController::class, 'updateVariantSettings']);
    Route::post('/shopify/sync', [AdminShopifyController::class, 'sync'])->middleware('role:administrator');
    Route::get('/posts', [PostController::class, 'adminIndex']);
    Route::put('/posts/{postRef}/moderation', [PostController::class, 'moderate']);
});

Route::post('/webhooks/shopify/products', [WebhookController::class, 'shopifyProduct']);
