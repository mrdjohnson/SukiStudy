import { describe, expect, it } from 'vitest'
import { GUEST_TOKEN, shouldPromoteToWaniKani } from '../../src/contexts/userSession'

describe('shouldPromoteToWaniKani', () => {
  it('promotes a non-guest account that has a real token', () => {
    expect(shouldPromoteToWaniKani({ is_guest: false }, 'real-token')).toBe(true)
  })

  it('never promotes a guest, even with a stale real token', () => {
    expect(shouldPromoteToWaniKani({ is_guest: true }, 'real-token')).toBe(false)
  })

  it('does not promote when the stored token is the guest sentinel', () => {
    expect(shouldPromoteToWaniKani({ is_guest: false }, GUEST_TOKEN)).toBe(false)
  })

  it('does not promote without a stored token', () => {
    expect(shouldPromoteToWaniKani({ is_guest: false }, undefined)).toBe(false)
    expect(shouldPromoteToWaniKani({ is_guest: false }, '')).toBe(false)
  })

  it('does not promote when there is no stored user', () => {
    expect(shouldPromoteToWaniKani(null, 'real-token')).toBe(false)
    expect(shouldPromoteToWaniKani(undefined, 'real-token')).toBe(false)
  })
})
