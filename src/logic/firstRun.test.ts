import { describe, expect, it } from 'vitest';
import { ALL, hasSeen, nextGesture, nextTip, parseSeen, serializeSeen, withSeen, withoutSeen } from './firstRun';

describe('what of the first run was seen', () => {
  it('reads a stored list and survives rubbish', () => {
    expect([...parseSeen('["safety","reveal"]')].sort()).toEqual(['reveal', 'safety']);
    expect(parseSeen(null).size).toBe(0);
    expect(parseSeen('{"a":1}').size).toBe(0);
    expect(parseSeen('not json').size).toBe(0);
    expect(parseSeen('[1,"x",null]')).toEqual(new Set(['x']));
  });

  it('writes the set in a stable order', () => {
    expect(serializeSeen(new Set(['b', 'a']))).toBe('["a","b"]');
    expect(parseSeen(serializeSeen(new Set(['x', 'y'])))).toEqual(new Set(['x', 'y']));
  });

  it('adds ids and keeps the same set when nothing is new', () => {
    const seen = new Set(['a']);
    expect(withSeen(seen, ['a'])).toBe(seen);
    expect(withSeen(seen, ['a', 'b'])).toEqual(new Set(['a', 'b']));
    expect(seen).toEqual(new Set(['a']));
  });

  it('treats the star as everything', () => {
    const all = new Set([ALL]);
    expect(hasSeen(all, 'anything')).toBe(true);
    expect(hasSeen(new Set(['a']), 'b')).toBe(false);
  });

  it('forgets ids to replay them, the star with them', () => {
    expect(withoutSeen(new Set([ALL, 'a']), ['a'])).toEqual(new Set());
    expect(withoutSeen(new Set(['a', 'b']), ['a'])).toEqual(new Set(['b']));
    const untouched = new Set(['b']);
    expect(withoutSeen(untouched, ['a'])).toBe(untouched);
    expect(withoutSeen(new Set(['a', 'b']), null)).toEqual(new Set());
  });

  it('teaches the gestures in order: right, left, up', () => {
    expect(nextGesture(new Set())).toBe('swipeRight');
    expect(nextGesture(new Set(['swipeRight']))).toBe('swipeLeft');
    expect(nextGesture(new Set(['swipeRight', 'swipeUp']))).toBe('swipeLeft');
    expect(nextGesture(new Set(['swipeRight', 'swipeLeft', 'swipeUp']))).toBeNull();
    expect(nextGesture(new Set([ALL]))).toBeNull();
  });
});

describe('the one tip to show', () => {
  const tips = [
    { id: 'bin', screen: 'home-clean' },
    { id: 'buttons', screen: 'review', when: 'gestures' },
    { id: 'undo', screen: 'review', when: 'decided' },
    { id: 'months', screen: 'months' },
  ];

  it('is the first unseen tip of the screen', () => {
    expect(nextTip(tips, new Set(), 'home-clean')?.id).toBe('bin');
    expect(nextTip(tips, new Set(['bin']), 'home-clean')).toBeNull();
    expect(nextTip(tips, new Set(), 'settings')).toBeNull();
  });

  it('waits for its moment', () => {
    expect(nextTip(tips, new Set(), 'review')).toBeNull();
    expect(nextTip(tips, new Set(), 'review', new Set(['decided']))?.id).toBe('undo');
    expect(nextTip(tips, new Set(), 'review', new Set(['gestures', 'decided']))?.id).toBe('buttons');
    expect(nextTip(tips, new Set(['buttons']), 'review', new Set(['gestures', 'decided']))?.id).toBe('undo');
  });

  it('shows nothing once everything is hidden', () => {
    expect(nextTip(tips, new Set([ALL]), 'home-clean')).toBeNull();
  });
});
