<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;

class ProductController
{
    public function search(Request $request)
    {
        $term = $request->string('q')->toString();
        $limit = min(max((int) $request->integer('limit', 100), 1), 200);

        return Product::query()
            ->with(['variants' => fn ($q) => $q->where('visibility', 'visible')->where('is_selectable', true), 'variants.group'])
            ->where('visibility', 'visible')
            ->where('is_selectable', true)
            ->whereHas('variants', fn ($q) => $q->where('visibility', 'visible')->where('is_selectable', true))
            ->when($term !== '', function ($query) use ($term) {
                $query->where(function ($q) use ($term) {
                    $q->where('title', 'ilike', "%$term%")
                        ->orWhere('display_title', 'ilike', "%$term%")
                        ->orWhere('product_type', 'ilike', "%$term%")
                        ->orWhereJsonContains('tags', $term)
                        ->orWhereHas('variants', fn ($v) => $v->where('sku', 'ilike', "%$term%"));
                });
            })
            ->limit($limit)
            ->get();
    }

    public function show(Product $product)
    {
        abort_unless($product->visibility === 'visible', 404);

        return $product->load(['variants' => fn ($q) => $q->where('visibility', 'visible')]);
    }
}
