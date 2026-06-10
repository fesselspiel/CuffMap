<?php

namespace App\Services;

class JwtService
{
    public function encode(array $payload, int $ttlSeconds = 604800): string
    {
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $now = time();
        $payload = array_merge($payload, ['iat' => $now, 'exp' => $now + $ttlSeconds]);

        $segments = [
            $this->base64Url(json_encode($header, JSON_THROW_ON_ERROR)),
            $this->base64Url(json_encode($payload, JSON_THROW_ON_ERROR)),
        ];

        $signature = hash_hmac('sha256', implode('.', $segments), $this->secret(), true);
        $segments[] = $this->base64Url($signature);

        return implode('.', $segments);
    }

    public function decode(string $token): ?array
    {
        $segments = explode('.', $token);
        if (count($segments) !== 3) {
            return null;
        }

        [$header, $payload, $signature] = $segments;
        $expected = $this->base64Url(hash_hmac('sha256', "$header.$payload", $this->secret(), true));

        if (! hash_equals($expected, $signature)) {
            return null;
        }

        $decoded = json_decode($this->base64UrlDecode($payload), true);

        if (! is_array($decoded) || ($decoded['exp'] ?? 0) < time()) {
            return null;
        }

        return $decoded;
    }

    private function secret(): string
    {
        return (string) env('JWT_SECRET', 'dev-secret-change-me');
    }

    private function base64Url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): string
    {
        return base64_decode(strtr($value, '-_', '+/').str_repeat('=', (4 - strlen($value) % 4) % 4)) ?: '';
    }
}
