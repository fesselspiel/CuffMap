<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PublicSubdomain
{
    public const RESERVED = [
        'admin',
        'api',
        'app',
        'assets',
        'auth',
        'blog',
        'cuffmap',
        'dashboard',
        'docs',
        'ftp',
        'help',
        'imap',
        'login',
        'mail',
        'map',
        'me',
        'moderation',
        'moderator',
        'ns1',
        'ns2',
        'pop',
        'post',
        'posts',
        'products',
        'profile',
        'register',
        'root',
        'shop',
        'shopify',
        'smtp',
        'static',
        'status',
        'storage',
        'support',
        'variants',
        'webhook',
        'webhooks',
        'www',
    ];

    public static function normalize(?string $value): ?string
    {
        $value = Str::lower(trim((string) $value));

        return $value === '' ? null : $value;
    }

    public static function isValid(?string $value): bool
    {
        $value = self::normalize($value);

        if ($value === null) {
            return false;
        }

        return (bool) preg_match('/^(?!-)[a-z0-9-]{3,40}(?<!-)$/', $value)
            && ! in_array($value, self::RESERVED, true);
    }

    public static function baseDomain(): ?string
    {
        $configured = self::hostOnly(env('PUBLIC_BASE_DOMAIN'));
        if ($configured) {
            return $configured;
        }

        return self::hostOnly(env('APP_URL'));
    }

    public static function fromRequest(Request $request): ?string
    {
        $host = self::hostOnly($request->getHost());
        $base = self::baseDomain();

        if (! $host || ! $base || $host === $base || ! str_ends_with($host, '.'.$base)) {
            return null;
        }

        $prefix = Str::beforeLast($host, '.'.$base);

        return str_contains($prefix, '.') ? null : self::normalize($prefix);
    }

    private static function hostOnly(?string $value): ?string
    {
        $value = trim((string) $value);
        if ($value === '') {
            return null;
        }

        $host = parse_url($value, PHP_URL_HOST) ?: $value;
        $host = Str::lower(trim($host, " \t\n\r\0\x0B."));

        return $host === '' ? null : $host;
    }
}
