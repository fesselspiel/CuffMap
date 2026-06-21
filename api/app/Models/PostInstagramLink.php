<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PostInstagramLink extends Model
{
    protected $fillable = [
        'post_id',
        'instagram_media_id',
        'permalink',
        'username',
        'caption',
        'media_url',
        'thumbnail_url',
        'media_type',
        'media_product_type',
        'posted_at',
        'source',
        'sort_order',
    ];

    protected $casts = [
        'posted_at' => 'datetime',
    ];

    public function post()
    {
        return $this->belongsTo(Post::class);
    }
}
