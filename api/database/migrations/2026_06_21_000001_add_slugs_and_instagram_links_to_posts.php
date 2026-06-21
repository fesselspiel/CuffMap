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
        Schema::table('posts', function (Blueprint $table) {
            $table->string('slug')->nullable()->unique();
        });

        DB::table('posts')->orderBy('id')->select(['id', 'title'])->chunk(100, function ($posts) {
            foreach ($posts as $post) {
                $base = Str::slug($post->title) ?: 'beitrag';
                $slug = $base;
                $counter = 2;

                while (DB::table('posts')->where('slug', $slug)->where('id', '!=', $post->id)->exists()) {
                    $slug = $base.'-'.$counter;
                    $counter++;
                }

                DB::table('posts')->where('id', $post->id)->update(['slug' => $slug]);
            }
        });

        Schema::create('post_instagram_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained()->cascadeOnDelete();
            $table->string('instagram_media_id')->nullable();
            $table->text('permalink');
            $table->string('username')->nullable();
            $table->text('caption')->nullable();
            $table->text('media_url')->nullable();
            $table->text('thumbnail_url')->nullable();
            $table->string('media_type')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->string('source')->default('manual');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
            $table->unique(['post_id', 'permalink']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('post_instagram_links');

        Schema::table('posts', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn('slug');
        });
    }
};
