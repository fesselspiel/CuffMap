<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CorsMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $allowed = array_filter(array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGINS', '*'))));
        $origin = $request->headers->get('Origin');
        $allowOrigin = in_array('*', $allowed, true) ? '*' : ($origin && in_array($origin, $allowed, true) ? $origin : '');

        if ($request->isMethod('OPTIONS')) {
            $response = response('', 204);
        } else {
            $response = $next($request);
        }

        if ($allowOrigin !== '') {
            $response->headers->set('Access-Control-Allow-Origin', $allowOrigin);
            $response->headers->set('Vary', 'Origin');
        }

        $response->headers->set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With, X-Shopify-Hmac-Sha256');
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Credentials', 'true');

        return $response;
    }
}
