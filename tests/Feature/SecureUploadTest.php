<?php

namespace Tests\Feature;

use App\Services\SecureUpload;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * SecureUpload is the single write path for every upload (web forms, driver app, passenger app).
 */
class SecureUploadTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    /** A real JPEG with an EXIF segment (standing in for GPS data) and bytes smuggled after it. */
    private function jpegWithMetadataAndPayload(int $width, int $height): UploadedFile
    {
        $image = imagecreatetruecolor($width, $height);
        imagefill($image, 0, 0, imagecolorallocate($image, 30, 90, 160));
        ob_start();
        imagejpeg($image, null, 90);
        $jpeg = (string) ob_get_clean();

        $exif = 'Exif' . "\0\0" . 'SECRET-GPS-14.0722N-120.6315E';
        $withExif = substr($jpeg, 0, 2) . "\xFF\xE1" . pack('n', strlen($exif) + 2) . $exif . substr($jpeg, 2);

        return UploadedFile::fake()->createWithContent('photo.jpg', $withExif . '<?php system($_GET["c"]); ?>');
    }

    #[Test]
    public function photos_are_re_encoded_without_metadata_or_appended_payloads(): void
    {
        $stored = SecureUpload::store($this->jpegWithMetadataAndPayload(800, 600), 'applications/documents', 'local', 'doc');

        $bytes = Storage::disk('local')->get($stored['path']);
        $this->assertSame('image/jpeg', $stored['mime']);
        $this->assertStringNotContainsString('SECRET-GPS', $bytes);
        $this->assertStringNotContainsString('<?php', $bytes);
        $this->assertNotFalse(imagecreatefromstring($bytes));
    }

    #[Test]
    public function oversized_photos_are_downscaled(): void
    {
        $stored = SecureUpload::store($this->jpegWithMetadataAndPayload(3000, 1500), 'profile_photos', 'local', 'photo', 1024);

        [$width, $height] = getimagesizefromstring(Storage::disk('local')->get($stored['path']));
        $this->assertSame([1024, 512], [$width, $height]);
    }

    #[Test]
    public function stored_names_are_random_and_never_the_client_name(): void
    {
        $file = UploadedFile::fake()->createWithContent('../../public/shell.php.pdf', "%PDF-1.4\nbody");
        $stored = SecureUpload::store($file, 'applications/documents', 'local', 'doc');

        $this->assertMatchesRegularExpression('#^applications/documents/[A-Za-z0-9]{40}\.pdf$#', $stored['path']);
        $this->assertSame('shell.php.pdf', SecureUpload::displayName($file, $stored['path']));
        $this->assertSame('x_a_b.jpg', SecureUpload::displayName(UploadedFile::fake()->create('a<b>.png'), 'p/q.jpg', 'x_'));
    }

    #[Test]
    public function a_file_whose_content_is_not_a_document_is_rejected(): void
    {
        $this->expectException(ValidationException::class);

        SecureUpload::store(UploadedFile::fake()->createWithContent('license.pdf', '<html><script>alert(1)</script></html>'), 'applications/documents', 'local', 'doc');
    }

    #[Test]
    public function a_corrupt_image_is_rejected(): void
    {
        $this->expectException(ValidationException::class);

        SecureUpload::store(UploadedFile::fake()->createWithContent('photo.jpg', "\xFF\xD8\xFF\xE0" . str_repeat('x', 500)), 'profile_photos', 'local', 'photo');
    }
}
