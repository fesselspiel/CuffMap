<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('post_instagram_links')) {
            return;
        }

        DB::statement('ALTER TABLE post_instagram_links ADD COLUMN IF NOT EXISTS media_product_type varchar(255) NULL');
    }

    public function down(): void
    {
        if (! Schema::hasTable('post_instagram_links')) {
            return;
        }

        DB::statement('ALTER TABLE post_instagram_links DROP COLUMN IF EXISTS media_product_type');
    }
};
