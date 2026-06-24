<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Post extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'title',
        'slug',
        'description',
        'latitude',
        'longitude',
        'location_label',
        'location_precision',
        'gps_consent',
        'status',
        'submitted_at',
        'published_at',
    ];

    protected $casts = [
        'gps_consent' => 'boolean',
        'submitted_at' => 'datetime',
        'published_at' => 'datetime',
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function images()
    {
        return $this->hasMany(PostImage::class);
    }

    public function hotspots()
    {
        return $this->hasMany(Hotspot::class);
    }

    public function products()
    {
        return $this->belongsToMany(Product::class, 'post_products')->withPivot(['product_variant_id', 'variant_group_id']);
    }

    public function instagramLinks()
    {
        return $this->hasMany(PostInstagramLink::class)->orderBy('sort_order');
    }

    public function comments()
    {
        return $this->hasMany(PostComment::class)->latest();
    }
}
