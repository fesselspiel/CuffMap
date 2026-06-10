<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Post;
use App\Models\PostImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PostController
{
    public function index(Request $request)
    {
        $query = Post::with(['images', 'products', 'hotspots.product'])->where('status', 'approved')->latest();

        return $query->paginate((int) $request->integer('per_page', 20));
    }

    public function mine(Request $request)
    {
        return Post::with(['images', 'products', 'hotspots.product'])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->paginate((int) $request->integer('per_page', 20));
    }

    public function adminIndex(Request $request)
    {
        return Post::with(['user:id,name,email', 'images', 'products'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->latest()
            ->paginate((int) $request->integer('per_page', 50));
    }

    public function show(Request $request, Post $post)
    {
        $user = $request->user();
        $role = $user?->role?->slug;
        $canViewDraft = $user && (
            $post->user_id === $user->id || in_array($role, ['administrator', 'moderator'], true)
        );

        if ($post->status !== 'approved' && ! $canViewDraft) {
            abort(404);
        }

        return $post->load(['user:id,name', 'images', 'products.variants', 'hotspots.product', 'hotspots.variant', 'hotspots.group']);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $post = DB::transaction(function () use ($request, $data) {
            $post = Post::create(array_merge($data, [
                'user_id' => $request->user()->id,
                'status' => 'submitted',
                'submitted_at' => now(),
            ]));
            DB::statement('UPDATE posts SET geo = ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography WHERE id = ?', [$post->longitude, $post->latitude, $post->id]);
            $this->syncRelations($post, $request);

            return $post;
        });

        return response()->json($post->load(['images', 'products', 'hotspots']), 201);
    }

    public function update(Request $request, Post $post)
    {
        $this->authorizePostWrite($request, $post);
        $data = $this->validated($request, true);
        $post->update($data);
        DB::statement('UPDATE posts SET geo = ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography WHERE id = ?', [$post->longitude, $post->latitude, $post->id]);
        $this->syncRelations($post, $request);

        return $post->load(['images', 'products', 'hotspots']);
    }

    public function destroy(Request $request, Post $post)
    {
        $this->authorizePostWrite($request, $post);
        $post->delete();

        return response()->json(['message' => 'Post deleted.']);
    }

    public function moderate(Request $request, Post $post)
    {
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

        return $post->fresh()->load(['images', 'products']);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'title' => [$required, 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:5000'],
            'latitude' => [$required, 'numeric', 'between:-90,90'],
            'longitude' => [$required, 'numeric', 'between:-180,180'],
            'location_label' => ['nullable', 'string', 'max:190'],
            'location_precision' => ['nullable', 'integer', 'min:10', 'max:50000'],
            'gps_consent' => ['boolean'],
        ]);
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

    private function authorizePostWrite(Request $request, Post $post): void
    {
        $role = $request->user()->role?->slug;
        abort_unless($post->user_id === $request->user()->id || in_array($role, ['administrator', 'moderator'], true), 403);
    }
}
