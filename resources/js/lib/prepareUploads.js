import Swal from 'sweetalert2';

/**
 * Browser-side mirror of the server's upload rules (App\Services\SecureUpload): same accepted
 * types and size cap, checked before anything is sent. Photos are downscaled and re-encoded
 * first, so a full-resolution phone picture fits under the cap instead of failing on submit.
 * The server still re-validates and re-encodes everything — this is for speed and clear errors.
 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_FILES_PER_DOCUMENT = 5;

const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_DIMENSION = 2400;
const JPEG_QUALITY = 0.82;

async function shrinkPhoto(file) {
    let bitmap;
    try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
        return null; // undecodable (corrupt, or a format the browser can't read)
    }

    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    // A small PNG (QR, screenshot) is already fine — keep it lossless.
    if (file.type === 'image/png' && scale === 1 && file.size <= 1024 * 1024) {
        bitmap.close();
        return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!blob || (scale === 1 && blob.size >= file.size)) return file;

    const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}

/**
 * @param {FileList|File[]} fileList
 * @param {{ types?: string[] }} [options]  accepted types (default: PDF + JPG/PNG/WebP)
 * @returns {Promise<{ files: File[], errors: string[] }>}
 */
export async function prepareUploads(fileList, { types = DOCUMENT_TYPES } = {}) {
    const files = [];
    const errors = [];

    for (const file of Array.from(fileList || [])) {
        if (!types.includes(file.type)) {
            errors.push(`${file.name}: only ${types.includes('application/pdf') ? 'PDF, ' : ''}JPG, PNG or WebP files are accepted.`);
            continue;
        }

        const prepared = file.type === 'application/pdf' ? file : await shrinkPhoto(file);
        if (!prepared) {
            errors.push(`${file.name}: this image could not be read. Please choose a clear JPG or PNG photo.`);
        } else if (prepared.size > MAX_UPLOAD_BYTES) {
            errors.push(`${file.name}: the file is larger than 5 MB.`);
        } else {
            files.push(prepared);
        }
    }

    return { files, errors };
}

const escapeHtml = (value) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Shows rejected files; names are escaped since they are user-controlled. */
export function showUploadErrors(errors) {
    if (!errors.length) return;
    Swal.fire({
        icon: 'warning',
        title: errors.length === 1 ? 'File not added' : 'Some files were not added',
        html: errors.map(escapeHtml).join('<br>'),
        confirmButtonColor: '#182B62',
    });
}
