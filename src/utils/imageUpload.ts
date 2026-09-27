import { supabase } from '../services/supabase';

export type ImageKind = 'avatar' | 'cover';

function guessMime(uri: string, pickerMime?: string | null): string {
  if (pickerMime && pickerMime.startsWith('image/')) return pickerMime;
  const clean = (uri || '').split('?')[0].toLowerCase();
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.gif')) return 'image/gif';
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/jpeg';
}

function extFromMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'jpg';
}

function base64ToUint8Array(base64: string): Uint8Array {
  const cleaned = base64.includes(',') ? base64.split(',')[1]! : base64;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

  let bufferLength = Math.floor(cleaned.length * 0.75);
  if (cleaned.endsWith('==')) bufferLength -= 2;
  else if (cleaned.endsWith('=')) bufferLength -= 1;

  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < cleaned.length; i += 4) {
    const e1 = lookup[cleaned.charCodeAt(i)] ?? 0;
    const e2 = lookup[cleaned.charCodeAt(i + 1)] ?? 0;
    const e3 = lookup[cleaned.charCodeAt(i + 2)] ?? 0;
    const e4 = lookup[cleaned.charCodeAt(i + 3)] ?? 0;
    bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (cleaned[i + 2] !== '=') bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (cleaned[i + 3] !== '=') bytes[p++] = ((e3 & 3) << 6) | e4;
  }
  return bytes;
}

/**
 * Read image bytes without deprecated Expo FileSystem APIs.
 * Priority:
 * 1) base64 from ImagePicker (best)
 * 2) fetch(uri).arrayBuffer() for local file:// content://
 */
async function readImageBytes(
  uri: string,
  base64?: string | null
): Promise<Uint8Array> {
  if (base64 && base64.length > 32) {
    return base64ToUint8Array(base64);
  }

  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error(`Falha ao ler a imagem (HTTP ${res.status}).`);
  }
  const buffer = await res.arrayBuffer();
  if (!buffer || buffer.byteLength < 32) {
    throw new Error('Arquivo de imagem vazio ou inválido.');
  }
  return new Uint8Array(buffer);
}

/**
 * Upload avatar/cover to Supabase Storage bucket "avatars".
 * Does NOT use expo-file-system (deprecated string APIs on Expo 57+).
 */
export async function uploadProfileImage(opts: {
  userId: string;
  kind: ImageKind;
  uri: string;
  mimeType?: string | null;
  /** Optional base64 from ImagePicker (preferred) */
  base64?: string | null;
}): Promise<{ publicUrl: string } | { error: string }> {
  const { userId, kind, uri, mimeType, base64 } = opts;
  const contentType = guessMime(uri, mimeType);
  const ext = extFromMime(contentType);
  const fileName = kind === 'avatar' ? `avatar.${ext}` : `cover.${ext}`;
  const path = `${userId}/${fileName}`;

  try {
    const bytes = await readImageBytes(uri, base64);

    if (__DEV__) {
      console.log('[uploadProfileImage]', {
        path,
        contentType,
        bytes: bytes.byteLength,
        hasBase64: !!base64,
      });
    }

    // Never send text/plain — always explicit image/* content type
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, bytes, {
      upsert: true,
      contentType,
      cacheControl: '3600',
    });

    if (upErr) {
      return {
        error: `${upErr.message}\n(MIME: ${contentType}, path: ${path}, bytes: ${bytes.byteLength})`,
      };
    }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    return { publicUrl: `${pub.publicUrl}?t=${Date.now()}` };
  } catch (e) {
    return { error: (e as Error).message || 'Falha no upload' };
  }
}
