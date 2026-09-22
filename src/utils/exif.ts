/**
 * Extracts photo timestamp from File (EXIF DateTimeOriginal if JPEG, or lastModified)
 */
export async function extractPhotoTimestamp(file: File): Promise<{
  timestampIso: string;
  source: 'exif' | 'file_modified' | 'current';
}> {
  try {
    // Attempt basic EXIF DateTime extraction for JPEGs
    if (file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) {
      const buffer = await file.slice(0, 131072).arrayBuffer(); // read first 128KB
      const exifDate = parseExifDate(buffer);
      if (exifDate) {
        return { timestampIso: exifDate.toISOString(), source: 'exif' };
      }
    }
  } catch (err) {
    console.warn('Could not parse EXIF:', err);
  }

  // Fallback to file.lastModified
  if (file.lastModified) {
    const modDate = new Date(file.lastModified);
    if (!isNaN(modDate.getTime())) {
      return { timestampIso: modDate.toISOString(), source: 'file_modified' };
    }
  }

  return { timestampIso: new Date().toISOString(), source: 'current' };
}

function parseExifDate(buffer: ArrayBuffer): Date | null {
  const view = new DataView(buffer);
  if (view.getUint16(0, false) !== 0xFFD8) return null; // Not a JPEG

  let length = view.byteLength;
  let offset = 2;

  while (offset < length) {
    if (view.getUint8(offset) !== 0xFF) return null;
    const marker = view.getUint8(offset + 1);

    // APP1 Marker containing EXIF
    if (marker === 0xE1) {
      const app1Length = view.getUint16(offset + 2, false);
      const exifString = String.fromCharCode(
        view.getUint8(offset + 4),
        view.getUint8(offset + 5),
        view.getUint8(offset + 6),
        view.getUint8(offset + 7)
      );

      if (exifString === 'Exif') {
        const tiffOffset = offset + 10;
        const littleEndian = view.getUint16(tiffOffset, false) === 0x4949;
        const ifd0Offset = view.getUint32(tiffOffset + 4, littleEndian);
        const entries = view.getUint16(tiffOffset + ifd0Offset, littleEndian);

        // Scan tags for 0x9003 (DateTimeOriginal) or 0x0132 (DateTime)
        for (let i = 0; i < entries; i++) {
          const entryOffset = tiffOffset + ifd0Offset + 2 + i * 12;
          const tag = view.getUint16(entryOffset, littleEndian);
          if (tag === 0x0132 || tag === 0x9003) {
            const valOffset = view.getUint32(entryOffset + 8, littleEndian);
            let str = '';
            for (let j = 0; j < 19; j++) {
              str += String.fromCharCode(view.getUint8(tiffOffset + valOffset + j));
            }
            // Format: "YYYY:MM:DD HH:MM:SS"
            const parts = str.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
            if (parts) {
              return new Date(
                Number(parts[1]),
                Number(parts[2]) - 1,
                Number(parts[3]),
                Number(parts[4]),
                Number(parts[5]),
                Number(parts[6])
              );
            }
          }
        }
      }
      offset += 2 + app1Length;
    } else if (marker === 0xD9 || marker === 0xDA) {
      break;
    } else {
      offset += 2 + view.getUint16(offset + 2, false);
    }
  }
  return null;
}

/**
 * Calculates absolute hour difference between photo time and entry log time
 */
export function calculateTimeDiffHours(photoIso?: string, entryIso?: string): number {
  if (!photoIso || !entryIso) return 0;
  const p = new Date(photoIso).getTime();
  const e = new Date(entryIso).getTime();
  if (isNaN(p) || isNaN(e)) return 0;
  return Math.abs(p - e) / (1000 * 60 * 60);
}

/**
 * Compresses an image file before upload or base64 storage to ensure high performance
 */
export async function compressImage(file: File, maxDimension = 1200, quality = 0.75): Promise<{ dataUrl: string; blob: Blob }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context failed'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ dataUrl, blob });
            } else {
              reject(new Error('Blob conversion failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
