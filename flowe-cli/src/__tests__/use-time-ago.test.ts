import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTimeAgo } from '@/hooks/use-time-ago';

describe('useTimeAgo', () => {
  beforeEach(() => {
    // Mock Date.now to return a fixed timestamp for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2023, 0, 15, 12, 0, 0)); // Jan 15, 2023, 12:00:00
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "just now" for timestamps within the last minute', () => {
    // Current time (mocked to Jan 15, 2023, 12:00:00)
    const now = Date.now();
    
    // 30 seconds ago
    const thirtySecondsAgo = now - 30 * 1000;
    expect(useTimeAgo(thirtySecondsAgo)).toBe('just now');
    
    // 59 seconds ago
    const fiftyNineSecondsAgo = now - 59 * 1000;
    expect(useTimeAgo(fiftyNineSecondsAgo)).toBe('just now');
    
    // Current timestamp
    expect(useTimeAgo(now)).toBe('just now');
  });

  it('should return minutes for timestamps between 1 minute and 1 hour ago', () => {
    const now = Date.now();
    
    // 1 minute ago
    const oneMinuteAgo = now - 60 * 1000;
    expect(useTimeAgo(oneMinuteAgo)).toBe('1m ago');
    
    // 5 minutes ago
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    expect(useTimeAgo(fiveMinutesAgo)).toBe('5m ago');
    
    // 59 minutes ago
    const fiftyNineMinutesAgo = now - 59 * 60 * 1000;
    expect(useTimeAgo(fiftyNineMinutesAgo)).toBe('59m ago');
  });

  it('should return hours for timestamps between 1 hour and 24 hours ago', () => {
    const now = Date.now();
    
    // 1 hour ago
    const oneHourAgo = now - 60 * 60 * 1000;
    expect(useTimeAgo(oneHourAgo)).toBe('1h ago');
    
    // 5 hours ago
    const fiveHoursAgo = now - 5 * 60 * 60 * 1000;
    expect(useTimeAgo(fiveHoursAgo)).toBe('5h ago');
    
    // 23 hours ago
    const twentyThreeHoursAgo = now - 23 * 60 * 60 * 1000;
    expect(useTimeAgo(twentyThreeHoursAgo)).toBe('23h ago');
  });

  it('should return days for timestamps more than 24 hours ago', () => {
    const now = Date.now();
    
    // 1 day ago
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    expect(useTimeAgo(oneDayAgo)).toBe('1d ago');
    
    // 5 days ago
    const fiveDaysAgo = now - 5 * 24 * 60 * 60 * 1000;
    expect(useTimeAgo(fiveDaysAgo)).toBe('5d ago');
    
    // 30 days ago
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    expect(useTimeAgo(thirtyDaysAgo)).toBe('30d ago');
  });

  it('should accept ISO string format timestamps', () => {
    const now = new Date();
    
    // 2 hours ago
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const isoString = twoHoursAgo.toISOString();
    
    expect(useTimeAgo(isoString)).toBe('2h ago');
  });

  it('should handle future timestamps (should not happen in practice)', () => {
    const now = Date.now();
    
    // 5 minutes in the future
    const fiveMinutesInFuture = now + 5 * 60 * 1000;
    
    // The hook treats future timestamps as "just now" since it doesn't handle future times
    expect(useTimeAgo(fiveMinutesInFuture)).toBe('just now');
  });
}); 