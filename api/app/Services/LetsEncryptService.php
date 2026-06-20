<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use App\Support\PublicSubdomain;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class LetsEncryptService
{
    public function enabled(): bool
    {
        return filter_var(env('LETSENCRYPT_ENABLED', false), FILTER_VALIDATE_BOOL);
    }

    public function requestForSubdomain(?string $subdomain, ?User $user = null): array
    {
        $subdomain = PublicSubdomain::normalize($subdomain);
        if (! $this->enabled()) {
            return ['status' => 'skipped', 'reason' => 'disabled'];
        }

        if (! PublicSubdomain::isValid($subdomain)) {
            throw new RuntimeException('Invalid public subdomain.');
        }

        $baseDomains = PublicSubdomain::baseDomains();
        if ($baseDomains === []) {
            throw new RuntimeException('PUBLIC_BASE_DOMAIN or PUBLIC_BASE_DOMAINS is not configured.');
        }

        $results = [];
        foreach ($baseDomains as $baseDomain) {
            $results[] = $this->requestCertificate($subdomain.'.'.$baseDomain, $user);
        }

        return count($results) === 1 ? $results[0] : ['status' => 'processed', 'domains' => $results];
    }

    private function requestCertificate(string $domain, ?User $user = null): array
    {
        if ($this->certificateExists($domain)) {
            return ['status' => 'exists', 'domain' => $domain];
        }

        $email = trim((string) env('LETSENCRYPT_EMAIL'));
        if ($email === '') {
            throw new RuntimeException('LETSENCRYPT_EMAIL is required when LETSENCRYPT_ENABLED=true.');
        }

        $webroot = rtrim((string) env('LETSENCRYPT_WEBROOT', '/var/www/certbot'), '/');
        $certbot = (string) env('LETSENCRYPT_CERTBOT_BIN', 'certbot');
        $command = [
            $certbot,
            'certonly',
            '--webroot',
            '--webroot-path',
            $webroot,
            '--domain',
            $domain,
            '--cert-name',
            $domain,
            '--email',
            $email,
            '--agree-tos',
            '--non-interactive',
            '--keep-until-expiring',
            '--preferred-challenges',
            'http',
        ];

        if (filter_var(env('LETSENCRYPT_STAGING', false), FILTER_VALIDATE_BOOL)) {
            $command[] = '--staging';
        }

        $result = $this->run($command, (int) env('LETSENCRYPT_TIMEOUT', 180));
        $payload = [
            'domain' => $domain,
            'exit_code' => $result['exit_code'],
            'output' => mb_substr($result['output'], -4000),
        ];

        if ($user) {
            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'letsencrypt.certificate.request',
                'subject_type' => User::class,
                'subject_id' => $user->id,
                'payload' => $payload,
            ]);
        }

        if ($result['exit_code'] !== 0 || ! $this->certificateExists($domain)) {
            Log::error('Let’s Encrypt HTTP challenge failed.', $payload);
            throw new RuntimeException('Let’s Encrypt certificate request failed for '.$domain.'.');
        }

        return ['status' => 'created', 'domain' => $domain];
    }

    public function certificateExists(string $domain): bool
    {
        return is_file('/etc/letsencrypt/live/'.$domain.'/fullchain.pem')
            && is_file('/etc/letsencrypt/live/'.$domain.'/privkey.pem');
    }

    private function run(array $command, int $timeout): array
    {
        $descriptorSpec = [
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = proc_open($command, $descriptorSpec, $pipes);
        if (! is_resource($process)) {
            throw new RuntimeException('Could not start certbot process.');
        }

        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        $startedAt = time();
        $output = '';
        $exitCode = null;
        do {
            $output .= stream_get_contents($pipes[1]);
            $output .= stream_get_contents($pipes[2]);
            $status = proc_get_status($process);
            if (! $status['running']) {
                $exitCode = $status['exitcode'];
                break;
            }
            if (time() - $startedAt > $timeout) {
                proc_terminate($process);
                throw new RuntimeException('Certbot timed out.');
            }
            usleep(200000);
        } while (true);

        $output .= stream_get_contents($pipes[1]);
        $output .= stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        proc_close($process);

        return [
            'exit_code' => $exitCode ?? 1,
            'output' => $output,
        ];
    }
}
