<?php

namespace App\Services;

use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Single place every upload (web forms, driver app, passenger app) is written to storage.
 * Runs after the request's own `mimes`/`max` validation and goes further:
 *  - the type is taken from the file's content, never its name or the client's Content-Type;
 *  - photos are decoded and re-encoded: EXIF (GPS location, device) is dropped, anything
 *    appended to or hidden inside the image is discarded, and oversized photos are downscaled;
 *  - PDFs must start with a real PDF header;
 *  - the stored name is random, so a client filename can never reach the filesystem.
 */
class SecureUpload
{
    /** Content types served back inline by SecureDocumentController; anything else is a download. */
    public const SAFE_INLINE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    /** Decoding cost guard (a few KB of PNG can declare a gigapixel canvas). */
    private const MAX_PIXELS = 25_000_000;

    private const JPEG_QUALITY = 82;

    /**
     * @param string $field  request field the error is reported against
     * @return array{path: string, size: int, mime: string}
     *
     * @throws ValidationException
     */
    public static function store(UploadedFile $file, string $directory, string $disk, string $field, int $maxDimension = 2400): array
    {
        $mime = $file->getMimeType();

        if (in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
            return self::storeImage($file, $mime, $directory, $disk, $field, $maxDimension);
        }

        if ($mime === 'application/pdf') {
            $handle = fopen($file->getRealPath(), 'rb');
            $header = $handle ? fread($handle, 5) : '';
            if ($handle) {
                fclose($handle);
            }
            if ($header !== '%PDF-') {
                self::fail($field, 'The file is not a valid PDF document.');
            }

            $path = $directory . '/' . Str::random(40) . '.pdf';
            Storage::disk($disk)->putFileAs($directory, $file, basename($path));

            return ['path' => $path, 'size' => (int) $file->getSize(), 'mime' => 'application/pdf'];
        }

        self::fail($field, 'Only PDF, JPG, PNG or WebP files are accepted.');
    }

    /**
     * URL of a file on the 'public' disk: the bucket URL when uploads live in object storage
     * (UPLOADS_DRIVER=s3), otherwise the requesting host's /storage link (so phones on the LAN
     * load it in local development).
     */
    public static function publicUrl(string $path): string
    {
        return config('filesystems.disks.public.driver') === 's3'
            ? Storage::disk('public')->url($path)
            : asset('storage/' . $path);
    }

    /**
     * Client filename made safe to keep for display/download: no path, control or shell
     * characters, bounded length, and the extension of what was actually stored.
     */
    public static function displayName(UploadedFile $file, string $storedPath, string $prefix = ''): string
    {
        $base = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $base = trim(preg_replace('/[^A-Za-z0-9._ -]+/', '_', $base) ?? '', ' ._-');
        $base = Str::limit($base !== '' ? $base : 'document', 120, '');

        return $prefix . $base . '.' . pathinfo($storedPath, PATHINFO_EXTENSION);
    }

    /**
     * @return array{path: string, size: int, mime: string}
     */
    private static function storeImage(UploadedFile $file, string $mime, string $directory, string $disk, string $field, int $maxDimension): array
    {
        $source = $file->getRealPath();
        $info = @getimagesize($source);
        if (! $info || $info[0] < 1 || $info[1] < 1) {
            self::fail($field, 'The image could not be read. Please upload a clear JPG or PNG photo.');
        }
        if ($info[0] * $info[1] > self::MAX_PIXELS) {
            self::fail($field, 'The image resolution is too large. Please upload a smaller photo.');
        }

        $image = match ($mime) {
            'image/jpeg' => @imagecreatefromjpeg($source),
            'image/png'  => @imagecreatefrompng($source),
            'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($source) : false,
        };
        if (! $image instanceof GdImage) {
            self::fail($field, 'The image could not be read. Please upload a clear JPG or PNG photo.');
        }

        if ($mime === 'image/jpeg') {
            $image = self::applyExifOrientation($image, $source);
        }

        $width = imagesx($image);
        $height = imagesy($image);
        if (max($width, $height) > $maxDimension) {
            $scale = $maxDimension / max($width, $height);
            $image = imagescale($image, max(1, (int) round($width * $scale)), max(1, (int) round($height * $scale)), IMG_BICUBIC);
        }

        // PNG stays lossless (QR codes, screenshots); JPEG and WebP become JPEG.
        ob_start();
        if ($mime === 'image/png') {
            imagesavealpha($image, true);
            imagepng($image, null, 9);
            [$extension, $storedMime] = ['png', 'image/png'];
        } else {
            imagejpeg(self::flattenOnWhite($image), null, self::JPEG_QUALITY);
            [$extension, $storedMime] = ['jpg', 'image/jpeg'];
        }
        $bytes = (string) ob_get_clean();

        $path = $directory . '/' . Str::random(40) . '.' . $extension;
        Storage::disk($disk)->put($path, $bytes);

        return ['path' => $path, 'size' => strlen($bytes), 'mime' => $storedMime];
    }

    /** Phone cameras store rotation as an EXIF flag; it is lost on re-encode, so bake it in. */
    private static function applyExifOrientation(GdImage $image, string $source): GdImage
    {
        $orientation = function_exists('exif_read_data') ? (@exif_read_data($source)['Orientation'] ?? 1) : 1;

        $rotated = match ((int) $orientation) {
            3 => imagerotate($image, 180, 0),
            6 => imagerotate($image, -90, 0),
            8 => imagerotate($image, 90, 0),
            default => $image,
        };

        return $rotated instanceof GdImage ? $rotated : $image;
    }

    /** JPEG has no transparency: WebP alpha would otherwise turn black. */
    private static function flattenOnWhite(GdImage $image): GdImage
    {
        $canvas = imagecreatetruecolor(imagesx($image), imagesy($image));
        imagefill($canvas, 0, 0, imagecolorallocate($canvas, 255, 255, 255));
        imagecopy($canvas, $image, 0, 0, 0, 0, imagesx($image), imagesy($image));

        return $canvas;
    }

    /**
     * @throws ValidationException
     */
    private static function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
