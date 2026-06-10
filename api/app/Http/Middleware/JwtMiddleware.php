<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\JwtService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class JwtMiddleware
{
    public function __construct(private readonly JwtService $jwt)
    {
    }

    public function handle(Request $request, Closure $next, ?string $mode = null): Response
    {
        $header = $request->header('Authorization', '');
        $optional = $mode === 'optional';

        if (! str_starts_with($header, 'Bearer ')) {
            if ($optional) {
                return $next($request);
            }

            return response()->json(['message' => 'Missing bearer token.'], 401);
        }

        $payload = $this->jwt->decode(substr($header, 7));

        if (! $payload || empty($payload['sub'])) {
            if ($optional) {
                return $next($request);
            }

            return response()->json(['message' => 'Invalid bearer token.'], 401);
        }

        $user = User::with('role')->find($payload['sub']);

        if (! $user) {
            if ($optional) {
                return $next($request);
            }

            return response()->json(['message' => 'User not found.'], 401);
        }

        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
