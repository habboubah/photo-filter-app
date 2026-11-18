/*
 * The demo's video player: what the phones' players do (iPhone
 * AVPlayerViewController inside a window, Android VideoPlayer.kt), drawn in
 * the browser. It opens as a WINDOW over the dimmed app — about the size of a
 * large photo, not full screen — with the browser's own controls (play /
 * pause, seek, volume, full screen, speed, picture in picture), a round close
 * button and *Größer* / *Kleiner*, which lets the window fill the screen and
 * back. A tap beside the window or Escape closes it. Plain DOM, as the native
 * players live outside React. Resolves when it closes; rejects when the
 * browser can't play the file.
 */
export interface PlayerLabels { close: string; bigger?: string; smaller?: string }

const EXPAND = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
const SHRINK = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>';
const CLOSE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

function roundButton(label: string, svg: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.setAttribute('aria-label', label);
  b.title = label;
  b.className = 'absolute top-2 w-11 h-11 rounded-full inline-flex items-center justify-center';
  b.style.background = 'rgba(20,20,20,0.55)';
  b.style.color = '#fff';
  b.innerHTML = svg;
  return b;
}

export function playInBrowser(url: string, labels: PlayerLabels | string): Promise<void> {
  const l: PlayerLabels = typeof labels === 'string' ? { close: labels } : labels;
  return new Promise((resolve, reject) => {
    const layer = document.createElement('div');
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'true');
    layer.className = 'fixed inset-0 z-[100] flex items-center justify-center';
    layer.style.padding = 'max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom))';
    layer.style.background = 'rgba(0,0,0,0.62)';

    // The window: the video at its own shape, as wide as a large photo, never taller than most of the screen.
    const box = document.createElement('div');
    box.className = 'relative overflow-hidden';
    box.style.background = '#000';
    box.style.transition = 'width .25s ease, height .25s ease, border-radius .25s ease';

    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.className = 'block w-full h-full object-contain';

    const close = roundButton(l.close, CLOSE);
    close.classList.add('start-2');
    const size = roundButton(l.bigger ?? 'Bigger', EXPAND);
    size.classList.add('end-2');

    let big = false;
    const fit = () => {
      if (big) {
        layer.style.padding = '0';
        Object.assign(box.style, { width: '100vw', height: '100dvh', maxWidth: '', maxHeight: '', borderRadius: '0' });
      } else {
        layer.style.padding = 'max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom))';
        const ratio = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9;
        const maxW = Math.min(window.innerWidth - 32, 640);
        const maxH = window.innerHeight * 0.7;
        const w = Math.min(maxW, maxH * ratio);
        Object.assign(box.style, { width: `${w}px`, height: `${w / ratio}px`, borderRadius: '20px' });
      }
      size.setAttribute('aria-label', big ? (l.smaller ?? 'Smaller') : (l.bigger ?? 'Bigger'));
      size.title = size.getAttribute('aria-label') ?? '';
      size.innerHTML = big ? SHRINK : EXPAND;
    };
    fit();

    let done = false;
    const finish = (failed: boolean) => {
      if (done) return;
      done = true;
      video.pause();
      video.removeAttribute('src');
      video.load();
      layer.remove();
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', fit);
      if (failed) reject(Object.assign(new Error('The browser cannot play this video'), { code: 'PLAYBACK' }));
      else resolve();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); finish(false); } };
    close.addEventListener('click', () => finish(false));
    size.addEventListener('click', () => { big = !big; fit(); });
    layer.addEventListener('click', e => { if (e.target === layer) finish(false); });
    video.addEventListener('loadedmetadata', fit);
    video.addEventListener('error', () => finish(true));
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', fit);

    box.append(video, close, size);
    layer.append(box);
    document.body.append(layer);
    close.focus({ preventScroll: true });
  });
}
