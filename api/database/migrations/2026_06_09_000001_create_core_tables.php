<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS postgis');

        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
        });

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained();
            $table->string('name');
            $table->string('username')->unique();
            $table->string('email')->unique();
            $table->string('password');
            $table->jsonb('profile')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('moderation_status', function (Blueprint $table) {
            $table->string('slug')->primary();
            $table->string('label');
        });

        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained();
            $table->string('title');
            $table->text('description')->nullable();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->string('location_label')->nullable();
            $table->unsignedSmallInteger('location_precision')->default(100);
            $table->boolean('gps_consent')->default(false);
            $table->string('status')->default('submitted');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
        DB::statement('ALTER TABLE posts ADD COLUMN geo geography(Point, 4326)');
        DB::statement('CREATE INDEX posts_geo_idx ON posts USING GIST (geo)');

        Schema::create('post_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained();
            $table->string('path');
            $table->string('thumbnail_path');
            $table->string('mime_type');
            $table->unsignedInteger('width');
            $table->unsignedInteger('height');
            $table->unsignedBigInteger('size');
            $table->decimal('gps_latitude', 10, 7)->nullable();
            $table->decimal('gps_longitude', 10, 7)->nullable();
            $table->boolean('exif_gps_available')->default(false);
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('shopify_id')->unique();
            $table->string('title');
            $table->string('handle')->nullable();
            $table->string('vendor')->nullable();
            $table->string('product_type')->nullable();
            $table->jsonb('tags')->nullable();
            $table->text('image_url')->nullable();
            $table->text('shop_url')->nullable();
            $table->string('visibility')->default('hidden');
            $table->boolean('is_selectable')->default(false);
            $table->jsonb('relevant_options')->nullable();
            $table->jsonb('ignored_options')->nullable();
            $table->boolean('merge_variants')->default(false);
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
        });

        Schema::create('variant_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('visibility')->default('hidden');
            $table->boolean('is_selectable')->default(false);
            $table->timestamps();
        });

        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('variant_group_id')->nullable()->constrained()->nullOnDelete();
            $table->string('shopify_id')->unique();
            $table->string('title');
            $table->string('sku')->nullable()->index();
            $table->jsonb('options')->nullable();
            $table->text('image_url')->nullable();
            $table->string('visibility')->default('hidden');
            $table->boolean('is_selectable')->default(false);
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
        });

        Schema::create('post_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('variant_group_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('hotspots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('post_image_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('x', 6, 4);
            $table->decimal('y', 6, 4);
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('variant_group_id')->nullable()->constrained()->nullOnDelete();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('hotspot_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hotspot_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('variant_group_id')->nullable()->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hotspot_products');
        Schema::dropIfExists('hotspots');
        Schema::dropIfExists('post_products');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('variant_groups');
        Schema::dropIfExists('products');
        Schema::dropIfExists('post_images');
        Schema::dropIfExists('posts');
        Schema::dropIfExists('moderation_status');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
        Schema::dropIfExists('roles');
    }
};
