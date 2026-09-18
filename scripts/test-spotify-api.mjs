/**
 * Testa Client Credentials + Search fora do app.
 * Uso:
 *   SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... node scripts/test-spotify-api.mjs "Oceans Hillsong"
 * Não imprime o secret.
 */
const id = process.env.SPOTIFY_CLIENT_ID;
const secret = process.env.SPOTIFY_CLIENT_SECRET;
const q = process.argv[2] || 'Oceans Hillsong';

if (!id || !secret) {
  console.error('Defina SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET no ambiente.');
  process.exit(1);
}

const basic = Buffer.from(`${id}:${secret}`).toString('base64');
const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
  method: 'POST',
  headers: {
    Authorization: `Basic ${basic}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: 'grant_type=client_credentials',
});

if (!tokenRes.ok) {
  console.error('Token falhou:', tokenRes.status, await tokenRes.text());
  process.exit(1);
}

const { access_token } = await tokenRes.json();
const url = new URL('https://api.spotify.com/v1/search');
url.searchParams.set('q', q);
url.searchParams.set('type', 'track');
url.searchParams.set('limit', '5');
url.searchParams.set('market', 'BR');

const searchRes = await fetch(url, {
  headers: { Authorization: `Bearer ${access_token}` },
});

if (!searchRes.ok) {
  console.error('Search falhou:', searchRes.status, await searchRes.text());
  process.exit(1);
}

const data = await searchRes.json();
const tracks = (data.tracks?.items || []).map((t) => ({
  name: t.name,
  artists: t.artists.map((a) => a.name).join(', '),
  album: t.album?.name,
  url: t.external_urls?.spotify,
}));

console.log(JSON.stringify({ query: q, count: tracks.length, tracks }, null, 2));
