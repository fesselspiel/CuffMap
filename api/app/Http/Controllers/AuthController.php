<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use App\Services\JwtService;
use App\Services\LetsEncryptService;
use App\Support\PublicSubdomain;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class AuthController
{
    public function __construct(
        private readonly JwtService $jwt,
        private readonly LetsEncryptService $letsEncrypt,
    )
    {
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'username' => ['required', 'string', 'min:3', 'max:40', 'regex:/^[a-zA-Z0-9_.-]+$/', 'unique:users,username'],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'password' => ['required', Password::min(10)->mixedCase()->numbers()],
        ]);

        $role = Role::where('slug', 'user')->firstOrFail();
        $user = User::create([
            'name' => $data['name'],
            'username' => strtolower($data['username']),
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role_id' => $role->id,
        ]);

        return response()->json($this->tokenResponse($user), 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'login' => ['required', 'string', 'max:190'],
            'password' => ['required', 'string'],
        ]);

        $login = strtolower($data['login']);
        $user = User::with('role')
            ->whereRaw('lower(email) = ?', [$login])
            ->orWhereRaw('lower(username) = ?', [$login])
            ->first();
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Invalid credentials.'], 422);
        }

        return $this->tokenResponse($user);
    }

    public function logout()
    {
        return ['message' => 'Token discarded client-side.'];
    }

    public function me(Request $request)
    {
        return $request->user()->load('role');
    }

    public function updateSubdomain(Request $request)
    {
        $request->merge([
            'public_subdomain' => PublicSubdomain::normalize($request->input('public_subdomain')),
        ]);

        $data = $request->validate([
            'public_subdomain' => [
                'nullable',
                'string',
                'max:40',
                Rule::unique('users', 'public_subdomain')->ignore($request->user()->id),
            ],
        ]);

        $subdomain = PublicSubdomain::normalize($data['public_subdomain'] ?? null);
        if ($subdomain !== null && ! PublicSubdomain::isValid($subdomain)) {
            throw ValidationException::withMessages([
                'public_subdomain' => 'Diese Subdomain ist ungueltig oder reserviert.',
            ]);
        }

        $request->user()->update(['public_subdomain' => $subdomain]);

        $certificateStatus = ['status' => $subdomain === null ? 'not_requested' : 'pending'];
        if ($subdomain !== null) {
            try {
                $certificateStatus = $this->letsEncrypt->queueForSubdomain($subdomain, $request->user());
            } catch (RuntimeException $exception) {
                $certificateStatus = [
                    'status' => 'failed',
                    'message' => $exception->getMessage(),
                ];
                Log::warning('Let’s Encrypt certificate queueing failed after subdomain update.', [
                    'user_id' => $request->user()->id,
                    'subdomain' => $subdomain,
                    'message' => $exception->getMessage(),
                ]);
            }
        }

        $user = $request->user()->fresh()->load('role');

        return response()->json(array_merge($user->toArray(), [
            'certificate_status' => $certificateStatus,
        ]));
    }

    public function forgotPassword()
    {
        return ['message' => 'Password reset endpoint is reserved for mail transport configuration.'];
    }

    public function export(Request $request)
    {
        $user = $request->user()->load('posts.images', 'posts.hotspots');

        return response()->json([
            'user' => $user,
            'exported_at' => now()->toIso8601String(),
        ]);
    }

    public function deleteAccount(Request $request)
    {
        $user = $request->user();
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'account.delete',
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'ip_address' => $request->ip(),
        ]);
        $user->delete();

        return response()->json(['message' => 'Account deleted.']);
    }

    private function tokenResponse(User $user): array
    {
        $user->load('role');

        return [
            'token_type' => 'Bearer',
            'access_token' => $this->jwt->encode(['sub' => $user->id, 'role' => $user->role->slug]),
            'user' => $user,
        ];
    }
}
