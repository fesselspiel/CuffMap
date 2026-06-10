<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'shopify_id',
        'title',
        'display_title',
        'handle',
        'vendor',
        'product_type',
        'tags',
        'image_url',
        'shop_url',
        'visibility',
        'is_selectable',
        'relevant_options',
        'ignored_options',
        'merge_variants',
        'synced_at',
    ];

    protected $casts = [
        'tags' => 'array',
        'relevant_options' => 'array',
        'ignored_options' => 'array',
        'is_selectable' => 'boolean',
        'merge_variants' => 'boolean',
        'synced_at' => 'datetime',
    ];

    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function getEffectiveTitleAttribute(): string
    {
        return $this->display_title ?: $this->title;
    }
}
