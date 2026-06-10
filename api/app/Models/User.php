<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use Notifiable;
    use SoftDeletes;

    protected $fillable = ['name', 'username', 'public_subdomain', 'email', 'password', 'role_id', 'profile'];
    protected $hidden = ['password'];
    protected $casts = ['profile' => 'array'];

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function posts()
    {
        return $this->hasMany(Post::class);
    }
}
