const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';
const STEAM_API_BASE = 'https://api.steampowered.com';

export function buildSteamLoginUrl(returnUrl: string, realm: string): string {
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnUrl,
    'openid.realm': realm,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });
  return `${STEAM_OPENID_URL}?${params.toString()}`;
}

export async function verifyOpenIdResponse(params: Record<string, string>): Promise<boolean> {
  const verifyParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    verifyParams.set(key, value);
  }
  verifyParams.set('openid.mode', 'check_authentication');

  const response = await fetch(STEAM_OPENID_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: verifyParams.toString(),
  });

  const text = await response.text();
  return text.includes('is_valid:true');
}

export function extractSteamId(claimedId: string): string | null {
  const match = claimedId.match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/);
  return match ? match[1] : null;
}

interface SteamPlayer {
  steamid: string;
  personaname: string;
  avatarfull: string;
}

export async function getPlayerSummary(steamId: string): Promise<SteamPlayer | null> {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) throw new Error('STEAM_API_KEY not set');

  const url = `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`;
  const response = await fetch(url);
  const data = await response.json() as { response: { players: SteamPlayer[] } };

  return data.response.players[0] || null;
}
