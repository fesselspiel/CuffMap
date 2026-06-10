<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $fillable = ['user_id', 'action', 'subject_type', 'subject_id', 'payload', 'ip_address'];
    protected $casts = ['payload' => 'array'];
}
