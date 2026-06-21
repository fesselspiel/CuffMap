<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageService
{
    public function store(UploadedFile $file, bool $useGps): array
    {
        $info = getimagesize($file->getRealPath());
        abort_unless($info !== false, 422, 'Invalid image.');

        [$width, $height] = $info;
        $mime = $this->normalizeMime($info['mime'] ?? $file->getMimeType());
        abort_unless(in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true), 422, 'Unsupported image MIME type.');

        $uuid = (string) Str::uuid();
        $extension = $mime === 'image/png' ? 'png' : ($mime === 'image/webp' ? 'webp' : 'jpg');
        $path = "uploads/$uuid.$extension";
        $thumb = "uploads/{$uuid}_thumb.jpg";

        $image = $this->loadImage($file->getRealPath(), $mime);
        $image = $this->applyExifOrientation($image, $file->getRealPath(), $mime);
        $width = imagesx($image);
        $height = imagesy($image);
        $image = $this->resize($image, $width, $height, 1920);
        Storage::disk('public')->put($path, $this->encode($image, $mime));

        $thumbnail = $this->resize($image, imagesx($image), imagesy($image), 480);
        Storage::disk('public')->put($thumb, $this->encode($thumbnail, 'image/jpeg'));

        $gps = $useGps ? $this->gpsFromExif($file->getRealPath()) : null;

        return [
            'path' => $path,
            'thumbnail_path' => $thumb,
            'mime_type' => $mime,
            'width' => imagesx($image),
            'height' => imagesy($image),
            'size' => $file->getSize(),
            'gps_latitude' => $gps['lat'] ?? null,
            'gps_longitude' => $gps['lng'] ?? null,
            'exif_gps_available' => $gps !== null,
        ];
    }

    private function loadImage(string $path, string $mime)
    {
        return match ($mime) {
            'image/png' => imagecreatefrompng($path),
            'image/webp' => imagecreatefromwebp($path),
            default => imagecreatefromjpeg($path),
        };
    }

    private function normalizeMime(?string $mime): string
    {
        return match (strtolower((string) $mime)) {
            'image/jpg', 'image/jpeg', 'image/pjpeg' => 'image/jpeg',
            'image/png', 'image/x-png' => 'image/png',
            'image/webp', 'image/x-webp' => 'image/webp',
            default => strtolower((string) $mime),
        };
    }

    private function applyExifOrientation($image, string $path, string $mime)
    {
        if ($mime !== 'image/jpeg' || ! function_exists('exif_read_data')) {
            return $image;
        }

        $exif = @exif_read_data($path);
        $orientation = is_array($exif) ? (int) ($exif['Orientation'] ?? 1) : 1;

        return match ($orientation) {
            2 => $this->flip($image, IMG_FLIP_HORIZONTAL),
            3 => $this->rotate($image, 180),
            4 => $this->flip($image, IMG_FLIP_VERTICAL),
            5 => $this->rotate($this->flip($image, IMG_FLIP_HORIZONTAL), 270),
            6 => $this->rotate($image, 270),
            7 => $this->rotate($this->flip($image, IMG_FLIP_HORIZONTAL), 90),
            8 => $this->rotate($image, 90),
            default => $image,
        };
    }

    private function flip($image, int $mode)
    {
        imageflip($image, $mode);

        return $image;
    }

    private function rotate($image, int $angle)
    {
        $rotated = imagerotate($image, $angle, 0);
        if ($rotated === false) {
            return $image;
        }

        imagedestroy($image);
        return $rotated;
    }

    private function resize($source, int $width, int $height, int $max)
    {
        if ($width <= $max && $height <= $max) {
            return $source;
        }

        $ratio = min($max / $width, $max / $height);
        $newWidth = (int) round($width * $ratio);
        $newHeight = (int) round($height * $ratio);
        $target = imagecreatetruecolor($newWidth, $newHeight);
        imagecopyresampled($target, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        return $target;
    }

    private function encode($image, string $mime): string
    {
        ob_start();
        match ($mime) {
            'image/png' => imagepng($image),
            'image/webp' => imagewebp($image, null, 86),
            default => imagejpeg($image, null, 86),
        };

        return (string) ob_get_clean();
    }

    private function gpsFromExif(string $path): ?array
    {
        if (! function_exists('exif_read_data')) {
            return null;
        }
        $exif = @exif_read_data($path);
        if (! is_array($exif) || empty($exif['GPSLatitude']) || empty($exif['GPSLongitude'])) {
            return null;
        }

        return [
            'lat' => $this->gpsPart($exif['GPSLatitude'], $exif['GPSLatitudeRef'] ?? 'N'),
            'lng' => $this->gpsPart($exif['GPSLongitude'], $exif['GPSLongitudeRef'] ?? 'E'),
        ];
    }

    private function gpsPart(array $coord, string $ref): float
    {
        $parts = array_map(fn ($part) => str_contains($part, '/') ? ((float) explode('/', $part)[0] / max(1, (float) explode('/', $part)[1])) : (float) $part, $coord);
        $value = $parts[0] + ($parts[1] / 60) + ($parts[2] / 3600);

        return in_array($ref, ['S', 'W'], true) ? -$value : $value;
    }
}
