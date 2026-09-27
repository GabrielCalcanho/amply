import * as FileSystem from 'expo-file-system';
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

/** Decode base64 string to Uint8Array without external deps */
function base64ToUint8Array(base64: string): Uint8Array {
  // Remove data-url prefix if present
  const cleaned = base64.includes(',') ? base64.split(',')[1] : base64;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

  let bufferLength = Math.floor(cleaned.length * 0.75);
  if (cleaned[cleaned.length - 1] === '=') {
    bufferLength--;
    if (cleaned[cleaned.length - 2] === '=') bufferLength--;
  }

  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < cleaned.length; i += 4) {
    const encoded1 = lookup[cleaned.charCodeAt(i)];
    const encoded2 = lookup[cleaned.charCodeAt(i + 1)];
    const encoded3 = lookup[cleaned.charCodeAt(i + 2)];
    const encoded4 = lookup[cleaned.charCodeAt(i + 3)];
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (cleaned[i + 2] !== '=') bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    if (cleaned[i + 3] !== '=') bytes[p++] = ((encoded3 & 3) << 6) | encoded4;
  }
  return bytes;
}

/**
 * Upload profile image to Supabase Storage bucket "avatars".
 * Avoids RN fetch(blob) which often reports MIME text/plain.
 */
export async function uploadProfileImage(opts: {
  userId: string;
  kind: ImageKind;
  uri: string;
  mimeType?: string | null;
}): Promise<{ publicUrl: string } | { error: string }> {
  const { userId, kind, uri, mimeType } = opts;
  const contentType = guessMime(uri, mimeType);
  const ext = extFromMime(contentType);
  const fileName = kind === 'avatar' ? `avatar.${ext}` : `cover.${ext}`;
  const path = `${userId}/${fileName}`;

  try {
    // Expo 50+: EncodingType; older/newer may accept string 'base64'
    const encoding =
      (FileSystem as any).EncodingType?.Base64 ??
      (FileSystem as any).EncodingType?.base64 ??
      'base64';
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding } as any);

    if (!base64 || base64.length < 32) {
      return { error: 'Não foi possível ler a imagem selecionada.' };
    }

    const bytes = base64ToUint8Array(base64);

    if (__DEV__) {
      console.log('[uploadProfileImage]', {
        path,
        contentType,
        bytes: bytes.byteLength,
      });
    }

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
