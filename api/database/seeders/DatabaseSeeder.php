<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            'guest' => 'Gast',
            'user' => 'Benutzer',
            'moderator' => 'Moderator',
            'administrator' => 'Administrator',
        ] as $slug => $name) {
            Role::updateOrCreate(['slug' => $slug], ['name' => $name]);
        }

        foreach ([
            'submitted' => 'Eingereicht',
            'reviewing' => 'In Prüfung',
            'approved' => 'Freigegeben',
            'rejected' => 'Abgelehnt',
        ] as $slug => $label) {
            DB::table('moderation_status')->updateOrInsert(['slug' => $slug], ['label' => $label]);
        }

        $adminRole = Role::where('slug', 'administrator')->first();
        User::updateOrCreate(
            ['email' => 'admin@cuffmap.local'],
            ['name' => 'CuffMap Admin', 'username' => 'admin', 'role_id' => $adminRole->id, 'password' => Hash::make('ChangeMe123!')]
        );

        if (env('SHOPIFY_SHOP_DOMAIN')) {
            return;
        }

        $product = Product::updateOrCreate(
            ['shopify_id' => 'demo-product-starter-set'],
            [
                'title' => 'Starter Set',
                'handle' => 'starter-set',
                'tags' => ['demo', 'set'],
                'image_url' => 'https://images.unsplash.com/photo-1519741497674-611481863552',
                'shop_url' => rtrim((string) env('SHOPIFY_STOREFRONT_BASE_URL', 'https://fesselspiel.com'), '/').'/products/starter-set',
                'visibility' => 'visible',
                'is_selectable' => true,
                'relevant_options' => ['Set'],
                'ignored_options' => ['Farbe'],
                'merge_variants' => true,
            ]
        );

        ProductVariant::updateOrCreate(
            ['shopify_id' => 'demo-variant-starter-set-black'],
            [
                'product_id' => $product->id,
                'title' => 'Starter Set Schwarz',
                'sku' => 'STARTER-BLACK',
                'options' => ['Set' => 'Starter Set', 'Farbe' => 'Schwarz'],
                'visibility' => 'visible',
                'is_selectable' => true,
            ]
        );
    }
}
