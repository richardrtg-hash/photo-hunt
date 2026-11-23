// Shrinks camera photos on the device before saving them.
// DSLR JPEGs are often 8–20 MB; we keep a 1600px copy (~300 KB) and a small thumbnail.

const RAW_EXT = /\.(cr2|cr3|nef|nrw|arw|srf|sr2|raf|orf|rw2|dng|pef|srw|x3f|3fr|erf|kdc|mrw|raw)$/i;
const FULL_MAX = 1600;
const THUMB_MAX = 480;

export class PhotoError extends Error {}

export const isRaw = (file) => RAW_EXT.test(file.name || '');

async function decode(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch { /* fall through to <img> decoding (e.g. HEIC on Safari) */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function scaleTo(source, max, quality) {
  const w = source.width || source.naturalWidth;
  const h = source.height || source.naturalHeight;
  const scale = Math.min(1, max / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, cw, ch);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve({ blob: b, w: cw, h: ch }) : reject(new PhotoError('Could not save photo'))), 'image/jpeg', quality),
  );
}

export async function processImage(file) {
  if (isRaw(file)) {
    throw new PhotoError(`"${file.name}" is a RAW camera file. Please use the JPEG version of this photo.`);
  }
  if (file.type && !file.type.startsWith('image/')) {
    throw new PhotoError(`"${file.name}" is not a photo.`);
  }
  let source;
  try {
    source = await decode(file);
  } catch {
    throw new PhotoError(`Couldn't open "${file.name}". Try a JPEG or PNG photo.`);
  }
  const full = await scaleTo(source, FULL_MAX, 0.85);
  const thumb = await scaleTo(source, THUMB_MAX, 0.78);
  source.close?.();
  const base = (file.name || 'photo').replace(/\.[^.]+$/, '');
  return { full: full.blob, thumb: thumb.blob, width: full.w, height: full.h, name: base };
}

export const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

export const dataUrlToBlob = (dataUrl) => fetch(dataUrl).then((r) => r.blob());
