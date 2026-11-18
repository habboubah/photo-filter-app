import { describe, expect, it } from 'vitest';
import { greetingAt } from './greeting';

describe('home’s greeting', () => {
  it('follows the time of day', () => {
    expect(greetingAt(5)).toBe('morning');
    expect(greetingAt(10)).toBe('morning');
    expect(greetingAt(11)).toBe('day');
    expect(greetingAt(17)).toBe('day');
    expect(greetingAt(18)).toBe('evening');
    expect(greetingAt(23)).toBe('evening');
    expect(greetingAt(0)).toBe('evening');
    expect(greetingAt(4)).toBe('evening');
  });
});
