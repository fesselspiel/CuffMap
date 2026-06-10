<?php

namespace App\Http\Controllers;

use App\Models\ProductVariant;

class VariantController
{
    public function show(ProductVariant $variant)
    {
        abort_unless($variant->visibility === 'visible', 404);

        return $variant->load('product', 'group');
    }
}
