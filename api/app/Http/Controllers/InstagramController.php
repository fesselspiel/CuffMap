<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use Illuminate\Http\Client\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class InstagramController
{
    public function user(Request $request)
    {
        $username = $this->validatedUsername($request);
        $ownProfile = $this->ownBusinessProfile('id,username,media_count');
        $profile = $this->sameUsername($ownProfile['username'] ?? null, $username)
            ? $ownProfile
            : $this->businessDiscovery($username, 'id,username,name,profile_picture_url,media_count');

        return response()->json($profile);
    }

    public function userMedia(Request $request)
    {
        $username = $this->validatedUsername($request);
        $ownProfile = $this->ownBusinessProfile('id,username');

        if ($this->sameUsername($ownProfile['username'] ?? null, $username)) {
            return response()->json($this->ownBusinessMedia());
        }

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
        $config = $this->config();

        $response = $this->graphGet($config, $config['business_account_id'], [
            'fields' => "business_discovery.username({$username}){{$fields}}",
        ]);

        if (! $response->successful()) {
            $this->abortGraphError($response, 'Instagram Business Discovery ist fehlgeschlagen. Eigene verknüpfte Konten funktionieren direkt; fremde Handles benötigen Business-Discovery-Berechtigungen.');
        }

        return $response->json('business_discovery') ?: [];
    }

    private function ownBusinessProfile(string $fields): array
    {
        $config = $this->config();
        $response = $this->graphGet($config, $config['business_account_id'], ['fields' => $fields]);

        if (! $response->successful()) {
            $this->abortGraphError($response, 'Instagram Business Account konnte nicht gelesen werden.');
        }

        return $response->json() ?: [];
    }

    private function ownBusinessMedia(): array
    {
        $config = $this->config();
        $response = $this->graphGet($config, "{$config['business_account_id']}/media", [
            'fields' => 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
            'limit' => 24,
        ]);

        if (! $response->successful()) {
            $this->abortGraphError($response, 'Instagram-Beiträge des eigenen Business Accounts konnten nicht gelesen werden.');
        }

        return $response->json('data') ?: [];
    }

    private function graphGet(array $config, string $path, array $query): Response
    {
        $url = "https://graph.facebook.com/{$config['version']}/{$path}";
        $response = Http::timeout(15)->get($url, $query + ['access_token' => $config['token']]);

        if (! $response->successful()) {
            $error = $response->json('error') ?: [];
            Log::warning('Instagram Graph API request failed', [
                'url' => $url,
                'query' => $query,
                'status' => $response->status(),
                'graph_error_code' => $error['code'] ?? null,
                'graph_error_type' => $error['type'] ?? null,
                'graph_error_message' => $error['message'] ?? null,
            ]);
        }

        return $response;
    }

    private function abortGraphError(Response $response, string $fallback): never
    {
        $error = $response->json('error') ?: [];
        $message = $error['message'] ?? $fallback;
        $code = $error['code'] ?? null;
        $type = $error['type'] ?? null;
        $details = trim(sprintf(
            '%s%s%s',
            $message,
            $code !== null ? " (Graph Code {$code})" : '',
            $type !== null ? " {$type}" : ''
        ));

        abort($response->status(), $details ?: $fallback);
    }

    private function config(): array
    {
        $token = (string) AppSetting::getValue('instagram_graph_access_token', env('INSTAGRAM_GRAPH_ACCESS_TOKEN'));
        $businessAccountId = (string) AppSetting::getValue('instagram_business_account_id', env('INSTAGRAM_BUSINESS_ACCOUNT_ID'));
        $version = (string) AppSetting::getValue('instagram_api_version', env('INSTAGRAM_API_VERSION', 'v23.0'));

        abort_if($token === '' || $businessAccountId === '', 503, 'Instagram API ist nicht konfiguriert.');

        return [
            'token' => $token,
            'business_account_id' => $businessAccountId,
            'version' => $version,
        ];
    }

    private function sameUsername(?string $left, string $right): bool
    {
        return strcasecmp((string) $left, $right) === 0;
    }
}
