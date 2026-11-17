/*
 * The demo's video player: what the phones' players do (iPhone
 * AVPlayerViewController, Android VideoPlayer.kt), drawn in the browser — the
 * file full screen over the app, the browser's own controls, a round close
 * button, Escape closes. Plain DOM, as the native players live outside React.
 * Resolves when it closes; rejects when the browser can't play the file.
 */
export function playInBrowser(url: string, closeLabel: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const layer = document.createElement('div');
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'true');
    layer.className = 'fixed inset-0 z-[100] flex items-center justify-center';
    layer.style.background = '#000';

    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.className = 'max-w-full max-h-full w-full h-full object-contain';

    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', closeLabel);
    close.className = 'absolute top-[max(16px,env(safe-area-inset-top))] start-4 w-11 h-11 rounded-full inline-flex items-center justify-center';
    close.style.background = 'rgba(255,255,255,0.22)';
    close.style.color = '#fff';
    close.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

    let done = false;
    const finish = (failed: boolean) => {
      if (done) return;
      done = true;
      video.pause();
      video.removeAttribute('src');
      video.load();
      layer.remove();
      window.removeEventListener('keydown', onKey, true);
      if (failed) reject(Object.assign(new Error('The browser cannot play this video'), { code: 'PLAYBACK' }));
      else resolve();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); finish(false); } };
    close.addEventListener('click', () => finish(false));
    video.addEventListener('error', () => finish(true));
    window.addEventListener('keydown', onKey, true);

    layer.append(video, close);
    document.body.append(layer);
    close.focus({ preventScroll: true });
  });
}
