<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Post;
use App\Models\PostImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class PostController
{
    public function index(Request $request)
    {
        $query = Post::with(['images', 'products', 'hotspots.product', 'instagramLinks'])->where('status', 'approved')->latest();

        return $query->paginate((int) $request->integer('per_page', 20));
    }

    public function mine(Request $request)
    {
        return Post::with(['images', 'products', 'hotspots.product', 'instagramLinks'])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->paginate((int) $request->integer('per_page', 20));
    }

    public function adminIndex(Request $request)
    {
        return Post::with(['user:id,name,email', 'images', 'products', 'instagramLinks'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->latest()
            ->paginate((int) $request->integer('per_page', 50));
    }

    public function show(Request $request, string $postRef)
    {
        $post = $this->resolvePost($postRef);
        $user = $request->user();
        $role = $user?->role?->slug;
        $canViewDraft = $user && (
            $post->user_id === $user->id || in_array($role, ['administrator', 'moderator'], true)
        );

        if ($post->status !== 'approved' && ! $canViewDraft) {
            abort(404);
        }

        return $post->load(['user:id,name', 'images', 'products.variants', 'hotspots.product', 'hotspots.variant', 'hotspots.group', 'instagramLinks']);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $post = DB::transaction(function () use ($request, $data) {
            unset($data['instagram_links']);
            $data['slug'] = $this->uniqueSlug($data['title']);
            $post = Post::create(array_merge($data, [
                'user_id' => $request->user()->id,
                'status' => 'submitted',
                'submitted_at' => now(),
            ]));
            DB::statement('UPDATE posts SET geo = ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography WHERE id = ?', [$post->longitude, $post->latitude, $post->id]);
            $this->syncRelations($post, $request);
            $this->syncInstagramLinks($post, $request);

            return $post;
        });

        return response()->json($post->load(['images', 'products', 'hotspots', 'instagramLinks']), 201);
    }

    public function update(Request $request, string $postRef)
    {
        $post = $this->resolvePost($postRef);
        $this->authorizePostWrite($request, $post);
        $data = $this->validated($request, true, $post);
        unset($data['instagram_links']);
        if (! $this->isAdministrator($request) || ! $request->has('slug')) {
            unset($data['slug']);
        }

        DB::transaction(function () use ($post, $request, $data) {
            $post->update($data);
            DB::statement('UPDATE posts SET geo = ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography WHERE id = ?', [$post->longitude, $post->latitude, $post->id]);
            $this->syncRelations($post, $request);
            $this->syncInstagramLinks($post, $request);
        });

        return $post->fresh()->load(['images', 'products', 'hotspots', 'instagramLinks']);
    }

    public function destroy(Request $request, string $postRef)
    {
        $post = $this->resolvePost($postRef);
        $this->authorizePostWrite($request, $post);
        $post->delete();

        return response()->json(['message' => 'Post deleted.']);
    }

    public function moderate(Request $request, string $postRef)
    {
        $post = $this->resolvePost($postRef);
        $data = $request->validate([
            'status' => ['required', 'in:submitted,reviewing,approved,rejected'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);
        $post->update([
            'status' => $data['status'],
            'published_at' => $data['status'] === 'approved' ? now() : $post->published_at,
        ]);
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'post.moderate',
            'subject_type' => Post::class,
            'subject_id' => $post->id,
            'payload' => $data,
            'ip_address' => $request->ip(),
        ]);

        return $post->fresh()->load(['images', 'products', 'instagramLinks']);
    }

    private function validated(Request $request, bool $partial = false, ?Post $post = null): array
    {
        $required = $partial ? 'sometimes' : 'required';
        $rules = [
            'title' => [$required, 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:5000'],
            'latitude' => [$required, 'numeric', 'between:-90,90'],
            'longitude' => [$required, 'numeric', 'between:-180,180'],
            'location_label' => ['nullable', 'string', 'max:190'],
            'location_precision' => ['nullable', 'integer', 'min:10', 'max:50000'],
            'gps_consent' => ['boolean'],
            'instagram_links' => ['sometimes', 'array', 'max:10'],
            'instagram_links.*.instagram_media_id' => ['nullable', 'string', 'max:190'],
            'instagram_links.*.permalink' => ['required_with:instagram_links', 'url', 'max:500'],
            'instagram_links.*.username' => ['nullable', 'string', 'max:190'],
            'instagram_links.*.caption' => ['nullable', 'string', 'max:2200'],
            'instagram_links.*.media_url' => ['nullable', 'url', 'max:1000'],
            'instagram_links.*.thumbnail_url' => ['nullable', 'url', 'max:1000'],
            'instagram_links.*.media_type' => ['nullable', 'string', 'max:60'],
            'instagram_links.*.media_product_type' => ['nullable', 'string', 'max:60'],
            'instagram_links.*.posted_at' => ['nullable', 'date'],
            'instagram_links.*.source' => ['nullable', 'in:manual,api'],
        ];

        if ($this->isAdministrator($request) && $request->has('slug')) {
            $rules['slug'] = [
                'required',
                'string',
                'max:160',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('posts', 'slug')->ignore($post?->id),
            ];
        }

        return $request->validate($rules);
    }

    private function syncRelations(Post $post, Request $request): void
    {
        if ($request->has('image_ids')) {
            $imageIds = collect($request->input('image_ids', []))->filter()->map(fn ($id) => (int) $id)->values();

            PostImage::where('post_id', $post->id)
                ->when($imageIds->isNotEmpty(), fn ($query) => $query->whereNotIn('id', $imageIds))
                ->update(['post_id' => null]);

            PostImage::whereIn('id', $imageIds)
                ->where(function ($query) use ($request, $post) {
                    $query->where('user_id', $request->user()->id)
                        ->orWhere('post_id', $post->id);
                })
                ->update(['post_id' => $post->id]);
        }

        if ($request->has('products')) {
            $post->products()->detach();
            foreach ($request->input('products', []) as $product) {
                $post->products()->attach($product['product_id'], [
                    'product_variant_id' => $product['product_variant_id'] ?? null,
                    'variant_group_id' => $product['variant_group_id'] ?? null,
                ]);
            }
        }
    }

    private function syncInstagramLinks(Post $post, Request $request): void
    {
        if (! $request->has('instagram_links')) {
            return;
        }

        $links = collect($request->input('instagram_links', []))
            ->take(10)
            ->map(function (array $link, int $index) {
                $permalink = $this->normalizeInstagramPermalink((string) ($link['permalink'] ?? ''));

                return [
                    'instagram_media_id' => $link['instagram_media_id'] ?? null,
                    'permalink' => $permalink,
                    'username' => isset($link['username']) ? ltrim((string) $link['username'], '@') : null,
                    'caption' => $link['caption'] ?? null,
                    'media_url' => $link['media_url'] ?? null,
                    'thumbnail_url' => $link['thumbnail_url'] ?? null,
                    'media_type' => $link['media_type'] ?? null,
                    'media_product_type' => $link['media_product_type'] ?? null,
                    'posted_at' => $link['posted_at'] ?? null,
                    'source' => $link['source'] ?? 'manual',
                    'sort_order' => $index,
                ];
            })
            ->unique('permalink')
            ->values();

        $post->instagramLinks()->delete();
        $post->instagramLinks()->createMany($links->all());
    }

    private function normalizeInstagramPermalink(string $url): string
    {
        $parts = parse_url(trim($url));
        $host = strtolower($parts['host'] ?? '');
        $path = '/'.trim($parts['path'] ?? '', '/').'/';
        $allowedHosts = ['instagram.com', 'www.instagram.com'];

        abort_unless(in_array($host, $allowedHosts, true), 422, 'Bitte eine gültige Instagram-Post-URL verwenden.');
        abort_unless((bool) preg_match('#^/(p|reel|reels|tv)/[A-Za-z0-9_-]+/#', $path), 422, 'Bitte eine genaue Instagram-Post-URL verwenden.');

        return 'https://www.instagram.com'.$path;
    }

    private function uniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title) ?: 'beitrag';
        $slug = $base;
        $counter = 2;

        while (Post::where('slug', $slug)->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))->exists()) {
            $slug = $base.'-'.$counter;
            $counter++;
        }

        return $slug;
    }

    private function resolvePost(string $postRef): Post
    {
        $post = ctype_digit($postRef)
            ? Post::find($postRef)
            : Post::where('slug', $postRef)->first();

        abort_unless($post, 404);

        return $post;
    }

    private function authorizePostWrite(Request $request, Post $post): void
    {
        $role = $request->user()->role?->slug;
        abort_unless($post->user_id === $request->user()->id || in_array($role, ['administrator', 'moderator'], true), 403);
    }

    private function isAdministrator(Request $request): bool
    {
        return $request->user()?->role?->slug === 'administrator';
    }
}
