<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VariantGroup extends Model
{
    protected $fillable = ['product_id', 'name', 'description', 'visibility', 'is_selectable'];
    protected $casts = ['is_selectable' => 'boolean'];
}
