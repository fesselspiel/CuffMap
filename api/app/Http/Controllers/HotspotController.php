<?php

namespace App\Http\Controllers;

use App\Models\Hotspot;
use App\Models\Post;
use Illuminate\Http\Request;

class HotspotController
{
    public function store(Request $request, Post $post)
    {
        abort_unless($post->user_id === $request->user()->id || in_array($request->user()->role?->slug, ['administrator', 'moderator'], true), 403);
        $hotspot = $post->hotspots()->create($this->validateHotspot($request));

        return response()->json($hotspot->load(['product', 'variant', 'group']), 201);
    }

    public function update(Request $request, Hotspot $hotspot)
    {
        $hotspot->load('post');
        abort_unless($hotspot->post->user_id === $request->user()->id || in_array($request->user()->role?->slug, ['administrator', 'moderator'], true), 403);
        $hotspot->update($this->validateHotspot($request, true));

        return $hotspot->fresh()->load(['product', 'variant', 'group']);
    }

    public function destroy(Request $request, Hotspot $hotspot)
    {
        $hotspot->load('post');
        abort_unless($hotspot->post->user_id === $request->user()->id || in_array($request->user()->role?->slug, ['administrator', 'moderator'], true), 403);
        $hotspot->delete();

        return response()->json(['message' => 'Hotspot deleted.']);
    }

    private function validateHotspot(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'post_image_id' => ['nullable', 'exists:post_images,id'],
            'x' => [$required, 'numeric', 'between:0,1'],
            'y' => [$required, 'numeric', 'between:0,1'],
            'product_id' => ['nullable', 'exists:products,id'],
            'product_variant_id' => ['nullable', 'exists:product_variants,id'],
            'variant_group_id' => ['nullable', 'exists:variant_groups,id'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);
    }
}
