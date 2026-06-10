<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\Request;

class MapController
{
    public function markers(Request $request)
    {
        $query = Post::query()
            ->with(['images:id,post_id,thumbnail_path', 'products:id,title,display_title,image_url,shop_url'])
            ->where('status', 'approved');

        if ($request->filled('bbox')) {
            [$west, $south, $east, $north] = array_map('floatval', explode(',', $request->string('bbox')));
            $query->whereBetween('longitude', [$west, $east])->whereBetween('latitude', [$south, $north]);
        }

        if ($request->filled('product')) {
            $term = $request->string('product');
            $query->whereHas('products', fn ($q) => $q->where('title', 'ilike', "%$term%")->orWhere('display_title', 'ilike', "%$term%"));
        }

        if ($request->filled('location')) {
            $term = $request->string('location');
            $query->where('location_label', 'ilike', "%$term%");
        }

        return $query->limit(500)->get()->map(fn (Post $post) => [
            'id' => $post->id,
            'title' => $post->title,
            'latitude' => $post->latitude,
            'longitude' => $post->longitude,
            'location_label' => $post->location_label,
            'thumbnail_url' => $post->images->first()?->thumbnail_path ? '/storage/'.$post->images->first()->thumbnail_path : null,
            'products' => $post->products->map(fn ($product) => [
                'id' => $product->id,
                'title' => $product->effective_title,
                'image_url' => $product->image_url,
                'shop_url' => $product->shop_url,
            ]),
        ]);
    }
}
