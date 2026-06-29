import type { User } from '../core/types'

/**
 * Sentinel token stored for guest sessions. A guest never has a real WaniKani
 * personal access token, so this lets us distinguish guests from WaniKani users
 * without hitting the API.
 */
export const GUEST_TOKEN = 'guest_token'

/**
 * Decide whether a stored account should be treated as a logged-in WaniKani
 * (non-guest) session.
 *
 * The persisted `is_guest` flag on the user record is the source of truth: a
 * guest stays a guest even if a stale/real-looking token is left in storage
 * (e.g. from a previous WaniKani session or the login form). We only promote an
 * account when it is not already a guest *and* a real token is present.
 */
export const shouldPromoteToWaniKani = (
  dbUser: Pick<User, 'is_guest'> | null | undefined,
  storedToken: string | null | undefined,
): storedToken is string =>
  !!dbUser && !dbUser.is_guest && !!storedToken && storedToken !== GUEST_TOKEN
