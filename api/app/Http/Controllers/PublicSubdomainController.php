<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\User;
use App\Support\PublicSubdomain;
use Illuminate\Http\Request;

class PublicSubdomainController
{
    public function show(Request $request)
    {
        $subdomain = PublicSubdomain::fromRequest($request);
        if (! $subdomain) {
            return [
                'is_subdomain' => false,
                'base_domain' => PublicSubdomain::baseDomain(),
            ];
        }

        abort_unless(PublicSubdomain::isValid($subdomain), 404);

        $user = User::query()
            ->select('id', 'name', 'username', 'public_subdomain', 'profile')
            ->where('public_subdomain', $subdomain)
            ->firstOrFail();

        $posts = Post::query()
            ->with(['images:id,post_id,path,thumbnail_path', 'products:id,title,display_title,shop_url'])
            ->where('user_id', $user->id)
            ->where('status', 'approved')
            ->latest('published_at')
            ->limit(100)
            ->get();

        return [
            'is_subdomain' => true,
            'subdomain' => $subdomain,
            'user' => $user,
            'posts' => $posts,
            'markers' => $posts->map(fn (Post $post) => [
                'id' => $post->id,
                'title' => $post->title,
                'latitude' => $post->latitude,
                'longitude' => $post->longitude,
                'location_label' => $post->location_label,
                'thumbnail_url' => $post->images->first()?->thumbnail_path ? '/storage/'.$post->images->first()->thumbnail_path : null,
                'products' => $post->products->map(fn ($product) => [
                    'id' => $product->id,
                    'title' => $product->effective_title,
                    'shop_url' => $product->shop_url,
                ]),
            ]),
        ];
    }
}
