<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Hotspot extends Model
{
    protected $fillable = ['post_id', 'post_image_id', 'x', 'y', 'product_id', 'product_variant_id', 'variant_group_id', 'description'];
    protected $casts = ['x' => 'float', 'y' => 'float'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function group()
    {
        return $this->belongsTo(VariantGroup::class, 'variant_group_id');
    }
}
