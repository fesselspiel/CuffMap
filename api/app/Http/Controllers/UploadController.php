<?php

namespace App\Http\Controllers;

use App\Models\PostImage;
use App\Services\ImageService;
use Illuminate\Http\UploadedFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class UploadController
{
    public function __construct(private readonly ImageService $images)
    {
    }

    public function store(Request $request)
    {
        $uploaded = $request->file('image');
        if ($uploaded instanceof UploadedFile && ! $uploaded->isValid()) {
            return response()->json(['message' => $this->uploadFailureMessage($uploaded->getError())], 422);
        }

        $maxKb = (int) ceil(((int) env('UPLOAD_MAX_SIZE', 8388608)) / 1024);
        $data = $request->validate([
            'image' => ['required', 'file', 'mimetypes:image/jpeg,image/pjpeg,image/png,image/webp', 'max:'.$maxKb],
            'use_exif_gps' => ['nullable', 'in:true,false,1,0,on,off'],
        ]);

        $useExifGps = filter_var($request->input('use_exif_gps', false), FILTER_VALIDATE_BOOLEAN);
        $result = $this->images->store($data['image'], $useExifGps);
        $image = PostImage::create(array_merge($result, ['user_id' => $request->user()->id]));

        return response()->json($image, 201);
    }

    private function uploadFailureMessage(int $error): string
    {
        return match ($error) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Das Bild ist zu groß für den Upload. Bitte ein kleineres Bild wählen oder die Uploadgröße erhöhen.',
            UPLOAD_ERR_PARTIAL => 'Das Bild wurde nur teilweise übertragen. Bitte erneut versuchen.',
            default => 'Das Bild konnte nicht hochgeladen werden. Bitte JPG/JPEG, PNG oder WEBP verwenden.',
        };
    }

    public function destroy(Request $request, PostImage $image)
    {
        abort_unless($image->user_id === $request->user()->id || in_array($request->user()->role?->slug, ['administrator', 'moderator'], true), 403);
        Storage::disk('public')->delete([$image->path, $image->thumbnail_path]);
        $image->delete();

        return response()->json(['message' => 'Image deleted.']);
    }
}
