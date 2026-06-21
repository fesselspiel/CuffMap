<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use Illuminate\Http\Request;

class AdminSettingsController
{
    public function instagram()
    {
        $token = AppSetting::getValue('instagram_graph_access_token', env('INSTAGRAM_GRAPH_ACCESS_TOKEN'));

        return [
            'instagram_graph_access_token_configured' => filled($token),
            'instagram_business_account_id' => AppSetting::getValue('instagram_business_account_id', env('INSTAGRAM_BUSINESS_ACCOUNT_ID')),
            'instagram_api_version' => AppSetting::getValue('instagram_api_version', env('INSTAGRAM_API_VERSION', 'v23.0')),
        ];
    }

    public function updateInstagram(Request $request)
    {
        $data = $request->validate([
            'instagram_graph_access_token' => ['nullable', 'string', 'max:2000'],
            'instagram_business_account_id' => ['nullable', 'string', 'max:190'],
            'instagram_api_version' => ['required', 'string', 'max:20', 'regex:/^v[0-9]+\\.[0-9]+$/'],
            'clear_token' => ['boolean'],
        ]);

        if ($request->boolean('clear_token')) {
            AppSetting::setValue('instagram_graph_access_token', null);
        } elseif (filled($data['instagram_graph_access_token'] ?? null)) {
            AppSetting::setValue('instagram_graph_access_token', trim($data['instagram_graph_access_token']));
        }

        AppSetting::setValue('instagram_business_account_id', filled($data['instagram_business_account_id'] ?? null) ? trim($data['instagram_business_account_id']) : null);
        AppSetting::setValue('instagram_api_version', $data['instagram_api_version']);

        return $this->instagram();
    }
}
