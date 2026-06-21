<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('post_instagram_links') || Schema::hasColumn('post_instagram_links', 'media_product_type')) {
            return;
        }

        Schema::table('post_instagram_links', function (Blueprint $table) {
            $table->string('media_product_type')->nullable()->after('media_type');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('post_instagram_links') || ! Schema::hasColumn('post_instagram_links', 'media_product_type')) {
            return;
        }

        Schema::table('post_instagram_links', function (Blueprint $table) {
            $table->dropColumn('media_product_type');
        });
    }
};
