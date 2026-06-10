<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $demoProduct = DB::table('products')
            ->where('shopify_id', 'demo-product-starter-set')
            ->first();

        if (! $demoProduct) {
            return;
        }

        $replacement = DB::table('products')
            ->where('handle', $demoProduct->handle)
            ->where('shopify_id', 'not like', 'demo-%')
            ->orderByDesc('synced_at')
            ->orderByDesc('id')
            ->first();

        if ($replacement) {
            DB::table('post_products')
                ->where('product_id', $demoProduct->id)
                ->update([
                    'product_id' => $replacement->id,
                    'product_variant_id' => null,
                    'variant_group_id' => null,
                ]);

            DB::table('hotspot_products')
                ->where('product_id', $demoProduct->id)
                ->update([
                    'product_id' => $replacement->id,
                    'product_variant_id' => null,
                    'variant_group_id' => null,
                ]);
        }

        DB::table('product_variants')
            ->where('product_id', $demoProduct->id)
            ->delete();

        DB::table('products')
            ->where('id', $demoProduct->id)
            ->delete();
    }

    public function down(): void
    {
        // Demo seed data should not be restored in Shopify-backed installations.
    }
};
