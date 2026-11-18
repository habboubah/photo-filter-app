import { describe, expect, it } from 'vitest';
import { rowAlbums } from './reviewAlbums';

const all = [{ id: 'a', title: 'Familie' }, { id: 'b', title: 'WhatsApp' }, { id: 'c', title: 'Gardasee' }];

describe('the albums under the photo in a review', () => {
  it('shows none until the user chooses some', () => {
    expect(rowAlbums(all, [], [])).toEqual([]);
  });

  it('shows the chosen ones in the order of all albums', () => {
    expect(rowAlbums(all, ['c', 'a'], []).map(x => x.id)).toEqual(['a', 'c']);
  });

  it('always shows the album the photo is filed into, and the ones made in this review first', () => {
    const made = [{ id: 'new:Zoo', title: 'Zoo' }];
    expect(rowAlbums(all, ['a'], made, 'b').map(x => x.id)).toEqual(['new:Zoo', 'a', 'b']);
  });

  it('ignores a chosen album that no longer exists', () => {
    expect(rowAlbums(all, ['gone'], [])).toEqual([]);
  });
});
