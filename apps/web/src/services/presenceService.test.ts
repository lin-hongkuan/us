import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserType } from '../types';
import { refreshPresenceAvailability, resolvePartnerPresence } from './presenceService';

vi.mock('./cloudflareClient', () => ({
  clearPresence: vi.fn(),
  heartbeatPresence: vi.fn(),
  isApiAvailable: vi.fn(async () => true),
}));

describe('resolvePartnerPresence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects the opposite user and ignores the current instance', () => {
    const result = resolvePartnerPresence({
      me: [{ user_type: UserType.HER, instance_id: 'me' }],
      'her-second-tab': [{ user_type: UserType.HER, instance_id: 'her-second-tab' }],
      'him-phone': [{ user_type: UserType.HIM, instance_id: 'him-phone' }],
    }, UserType.HER, 'me');

    expect(result).toEqual({ partnerOnline: true, partnerUser: UserType.HIM });
  });

  it('does not count another tab of the same user as the partner', () => {
    const result = resolvePartnerPresence({
      me: [{ user_type: UserType.HER, instance_id: 'me' }],
      'her-second-tab': [{ user_type: UserType.HER, instance_id: 'her-second-tab' }],
    }, UserType.HER, 'me');

    expect(result).toEqual({ partnerOnline: false, partnerUser: null });
  });

  it('ignores stale payloads from the current presence key and invalid users', () => {
    const result = resolvePartnerPresence({
      me: [{ user_type: UserType.HIM }],
      unknown: [{ user_type: 'SOMEONE_ELSE', instance_id: 'unknown' }],
    }, UserType.HER, 'me');

    expect(result).toEqual({ partnerOnline: false, partnerUser: null });
  });

  it('detects her when the current user is him', () => {
    const result = resolvePartnerPresence({
      him: [{ user_type: UserType.HIM, instance_id: 'him' }],
      her: [{ user_type: UserType.HER, instance_id: 'her' }],
    }, UserType.HIM, 'him');

    expect(result).toEqual({ partnerOnline: true, partnerUser: UserType.HER });
  });

  it('reports availability from the api check', async () => {
    await expect(refreshPresenceAvailability()).resolves.toBe(true);
  });
});
