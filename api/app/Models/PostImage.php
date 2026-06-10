<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PostImage extends Model
{
    protected $fillable = ['post_id', 'user_id', 'path', 'thumbnail_path', 'mime_type', 'width', 'height', 'size', 'gps_latitude', 'gps_longitude', 'exif_gps_available'];
    protected $casts = ['exif_gps_available' => 'boolean', 'gps_latitude' => 'float', 'gps_longitude' => 'float'];
}
