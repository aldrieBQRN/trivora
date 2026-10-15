<?php

namespace App\Console\Commands;

use App\Models\ApplicationDocument;
use App\Models\ViolationAppeal;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class MigrateDocumentsToPrivateStorage extends Command
{
    protected $signature = 'documents:migrate-to-private {--delete-old : Delete the old files from the public disk after copying}';

    protected $description = 'Safely copy existing application documents and violation appeal evidence from public disk to private storage.';

    public function handle(): int
    {
        $this->info('Starting migration of confidential documents to private storage...');

        $publicDisk = Storage::disk('public');
        $privateDisk = Storage::disk('local');
        $deleteOld = $this->option('delete-old');

        $docCount = 0;
        foreach (ApplicationDocument::all() as $doc) {
            if (!$doc->file_path) {
                continue;
            }

            $path = str_replace('\\', '/', $doc->file_path);
            if ($publicDisk->exists($path)) {
                if (!$privateDisk->exists($path)) {
                    $privateDisk->put($path, $publicDisk->get($path));
                    $this->line("Copied ApplicationDocument ID {$doc->id} ({$path}) to private storage.");
                    $docCount++;
                }

                if ($deleteOld && $privateDisk->exists($path)) {
                    $publicDisk->delete($path);
                    $this->line("Deleted old public file for ApplicationDocument ID {$doc->id}.");
                }
            }
        }

        $appealCount = 0;
        foreach (ViolationAppeal::whereNotNull('evidence_path')->get() as $appeal) {
            $path = str_replace('\\', '/', $appeal->evidence_path);
            if ($publicDisk->exists($path)) {
                if (!$privateDisk->exists($path)) {
                    $privateDisk->put($path, $publicDisk->get($path));
                    $this->line("Copied ViolationAppeal ID {$appeal->id} ({$path}) to private storage.");
                    $appealCount++;
                }

                if ($deleteOld && $privateDisk->exists($path)) {
                    $publicDisk->delete($path);
                    $this->line("Deleted old public file for ViolationAppeal ID {$appeal->id}.");
                }
            }
        }

        $this->info("Migration completed. {$docCount} application documents and {$appealCount} appeal evidence files copied to private storage.");

        return Command::SUCCESS;
    }
}
