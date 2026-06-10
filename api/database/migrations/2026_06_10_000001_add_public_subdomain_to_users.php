<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'public_subdomain')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('public_subdomain', 63)->nullable()->unique()->after('username');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'public_subdomain')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropUnique(['public_subdomain']);
                $table->dropColumn('public_subdomain');
            });
        }
    }
};
