<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    protected $fillable = ['product_id', 'variant_group_id', 'shopify_id', 'title', 'sku', 'options', 'image_url', 'visibility', 'is_selectable', 'synced_at'];
    protected $casts = ['options' => 'array', 'is_selectable' => 'boolean', 'synced_at' => 'datetime'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function group()
    {
        return $this->belongsTo(VariantGroup::class, 'variant_group_id');
    }
}
