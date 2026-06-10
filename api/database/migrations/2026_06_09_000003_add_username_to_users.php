<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'username')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('username')->nullable()->after('name');
            });

            DB::table('users')->orderBy('id')->each(function ($user) {
                $base = Str::slug($user->name ?: Str::before($user->email, '@')) ?: 'user';
                $username = $base;
                $suffix = 1;

                while (DB::table('users')->where('username', $username)->where('id', '!=', $user->id)->exists()) {
                    $username = $base.'-'.$suffix++;
                }

                DB::table('users')->where('id', $user->id)->update(['username' => $username]);
            });

            DB::statement('ALTER TABLE users ALTER COLUMN username SET NOT NULL');
            Schema::table('users', function (Blueprint $table) {
                $table->unique('username');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'username')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropUnique(['username']);
                $table->dropColumn('username');
            });
        }
    }
};
