<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class InstagramController
{
    public function user(Request $request)
    {
        $username = $this->validatedUsername($request);
        $profile = $this->businessDiscovery($username, 'id,username,name,profile_picture_url,media_count');

        return response()->json($profile);
    }

    public function userMedia(Request $request)
    {
        $username = $this->validatedUsername($request);
        $fields = 'id,username,media_count,media.limit(24){id,caption,media_type,media_url,thumbnail_url,permalink,timestamp}';
        $profile = $this->businessDiscovery($username, $fields);

        return response()->json($profile['media']['data'] ?? []);
    }

    private function validatedUsername(Request $request): string
    {
        if ($request->has('username')) {
            $request->merge(['username' => ltrim((string) $request->input('username'), '@')]);
        }

        $data = $request->validate([
            'username' => ['required', 'string', 'min:1', 'max:30', 'regex:/^[A-Za-z0-9._]+$/'],
        ]);

        return $data['username'];
    }

    private function businessDiscovery(string $username, string $fields): array
    {
        $token = (string) env('INSTAGRAM_GRAPH_ACCESS_TOKEN', '');
        $businessAccountId = (string) env('INSTAGRAM_BUSINESS_ACCOUNT_ID', '');
        $version = (string) env('INSTAGRAM_API_VERSION', 'v23.0');

        abort_if($token === '' || $businessAccountId === '', 503, 'Instagram API ist nicht konfiguriert.');

        $response = Http::timeout(15)->get("https://graph.facebook.com/{$version}/{$businessAccountId}", [
            'fields' => "business_discovery.username({$username}){{$fields}}",
            'access_token' => $token,
        ]);

        if (! $response->successful()) {
            abort($response->status(), $response->json('error.message') ?: 'Instagram API Anfrage fehlgeschlagen.');
        }

        return $response->json('business_discovery') ?: [];
    }
}
