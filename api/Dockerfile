FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json ./
RUN composer install --no-interaction --no-progress --prefer-dist --no-dev --no-scripts --ignore-platform-req=ext-gd --ignore-platform-req=ext-pdo_pgsql
COPY . .
RUN composer dump-autoload --optimize

FROM php:8.4-cli-alpine AS base
WORKDIR /var/www/html
RUN apk add --no-cache postgresql-dev libpng-dev libjpeg-turbo-dev freetype-dev oniguruma-dev zip unzip autoconf g++ make linux-headers certbot \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo_pgsql gd mbstring exif \
    && apk del autoconf g++ make linux-headers
COPY --from=vendor /app /var/www/html
RUN mkdir -p storage/app/public storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache
EXPOSE 8000

FROM base AS development
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]

FROM base AS production
CMD ["sh", "-lc", "php artisan migrate --force && php artisan storage:link || true && php artisan serve --host=0.0.0.0 --port=8000"]
