import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { buildSteamLoginUrl, verifyOpenIdResponse, extractSteamId, getPlayerSummary } from '../services/steam';
import { upsertUser } from '../services/db';
import { signToken } from '../utils/jwt';

export async function authRoutes(app: FastifyInstance) {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

  app.get('/auth/steam', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, string>;
    const redirectUri = query.redirect_uri || '';

    // Pass redirect_uri through the Steam roundtrip via our callback URL
    const callbackUrl = new URL(`${BACKEND_URL}/auth/steam/callback`);
    if (redirectUri) {
      callbackUrl.searchParams.set('redirect_uri', redirectUri);
    }

    const loginUrl = buildSteamLoginUrl(callbackUrl.toString(), BACKEND_URL);
    return reply.redirect(loginUrl);
  });

  app.get('/auth/steam/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, string>;

    // Verify the OpenID response with Steam
    const isValid = await verifyOpenIdResponse(query);
    if (!isValid) {
      return reply.status(401).send({ error: 'Steam authentication failed' });
    }

    // Extract Steam ID from claimed_id
    const claimedId = query['openid.claimed_id'];
    const steamId = extractSteamId(claimedId);
    if (!steamId) {
      return reply.status(400).send({ error: 'Could not extract Steam ID' });
    }

    // Fetch Steam profile
    const player = await getPlayerSummary(steamId);
    if (!player) {
      return reply.status(404).send({ error: 'Steam profile not found' });
    }

    // Upsert user in database
    const user = await upsertUser(steamId, player.personaname, player.avatarfull);

    // Generate JWT
    const token = signToken({ userId: user.id, steamId: user.steam_id });

    const userPayload = {
      id: user.id,
      steam_id: user.steam_id,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
    };

    // If redirect_uri was passed (mobile app flow), redirect back to the app with token
    const redirectUri = query.redirect_uri;
    if (redirectUri) {
      const appUrl = new URL(redirectUri);
      appUrl.searchParams.set('token', token);
      appUrl.searchParams.set('user', JSON.stringify(userPayload));
      return reply.redirect(appUrl.toString());
    }

    // Browser flow: return JSON
    return { token, user: userPayload };
  });

  app.post('/auth/logout', async () => {
    // V1: client-side token discard. Server-side blacklist needs Redis (Sprint 5).
    return { success: true };
  });
}
