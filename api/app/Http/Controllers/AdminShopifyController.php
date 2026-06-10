<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\ShopifySyncService;
use Illuminate\Http\Request;

class AdminShopifyController
{
    public function products(Request $request)
    {
        return Product::query()
            ->withCount('variants')
            ->when($request->filled('q'), function ($query) use ($request) {
                $term = '%'.$request->string('q').'%';
                $query->where('title', 'ilike', $term)->orWhere('display_title', 'ilike', $term);
            })
            ->orderByRaw('COALESCE(display_title, title) ASC')
            ->paginate(50);
    }

    public function product(Product $product)
    {
        return $product->load('variants.group');
    }

    public function variants(Request $request)
    {
        return ProductVariant::query()
            ->with('product', 'group')
            ->when($request->filled('q'), function ($q) use ($request) {
                $term = '%'.$request->string('q').'%';
                $q->where('title', 'ilike', $term)->orWhere('sku', 'ilike', $term);
            })
            ->paginate(100);
    }

    public function updateProductSettings(Request $request, Product $product)
    {
        $data = $request->validate([
            'visibility' => ['required', 'in:visible,hidden,internal'],
            'display_title' => ['nullable', 'string', 'max:190'],
            'is_selectable' => ['required', 'boolean'],
            'relevant_options' => ['nullable', 'array'],
            'ignored_options' => ['nullable', 'array'],
            'merge_variants' => ['required', 'boolean'],
        ]);
        $data['display_title'] = filled($data['display_title'] ?? null) ? trim($data['display_title']) : null;
        $product->update($data);
        $product->variants()->update([
            'visibility' => $data['visibility'],
            'is_selectable' => $data['is_selectable'],
        ]);

        return $product->fresh()->load('variants');
    }

    public function bulkUpdateProductSettings(Request $request)
    {
        $data = $request->validate([
            'product_ids' => ['required', 'array', 'min:1', 'max:500'],
            'product_ids.*' => ['integer', 'exists:products,id'],
            'visibility' => ['nullable', 'in:visible,hidden,internal'],
            'is_selectable' => ['nullable', 'boolean'],
        ]);

        $updates = [];
        if (array_key_exists('visibility', $data) && $data['visibility'] !== null) {
            $updates['visibility'] = $data['visibility'];
        }
        if (array_key_exists('is_selectable', $data) && $data['is_selectable'] !== null) {
            $updates['is_selectable'] = $data['is_selectable'];
        }

        if ($updates === []) {
            return response()->json(['message' => 'Keine Bulk-Aenderung ausgewaehlt.'], 422);
        }

        $updated = Product::query()
            ->whereIn('id', $data['product_ids'])
            ->update($updates);

        ProductVariant::query()
            ->whereIn('product_id', $data['product_ids'])
            ->update($updates);

        return [
            'updated' => $updated,
            'products' => Product::query()
                ->withCount('variants')
                ->whereIn('id', $data['product_ids'])
                ->orderByRaw('COALESCE(display_title, title) ASC')
                ->get(),
        ];
    }

    public function updateVariantSettings(Request $request, ProductVariant $variant)
    {
        $data = $request->validate([
            'visibility' => ['required', 'in:visible,hidden,internal'],
            'is_selectable' => ['required', 'boolean'],
            'variant_group_id' => ['nullable', 'exists:variant_groups,id'],
        ]);
        $variant->update($data);

        return $variant->fresh()->load('product', 'group');
    }

    public function sync(ShopifySyncService $sync)
    {
        return ['synced' => $sync->syncProducts()];
    }
}
