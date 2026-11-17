import { Component, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import App from './App.tsx';
import { applyDynamicType } from './dynamicType.ts';
import { DEFAULT_LANGUAGE, isLanguage, loadLanguage, setPlatform, stringsFor } from './translations.ts';
import { initialLanguage } from './store.ts';
import { isAndroid } from './platform.ts';
import './index.css';

// Before the first render: the root font size is what the whole rem-based
// scale resolves against.
applyDynamicType();

/**
 * Last-resort crash screen. The photos are never at risk (the app only reads
 * them until the user confirms a system dialog), so a reload is all it offers.
 */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    const saved = (() => { try { return localStorage.getItem('bildklar-lang'); } catch { return null; } })();
    const t = stringsFor(isLanguage(saved) ? saved : DEFAULT_LANGUAGE);
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-surface rounded-lg p-6 text-center space-y-4">
          <img src="/icon.png" alt="" className="w-[72px] h-[72px] rounded-md mx-auto" />
          <h1 className="title-face text-heading font-bold text-fg">{t.crashTitle}</h1>
          <p className="text-label text-fg-mute">{t.crashBody}</p>
          <button type="button" onClick={() => window.location.reload()}
            className="w-full min-h-control bg-accent-fill text-accent-fill-ink rounded-full font-extrabold">
            {t.crashReload}
          </button>
        </div>
      </div>
    );
  }
}

if (isAndroid()) {
  document.documentElement.dataset.platform = 'android';
  setPlatform('android');
}

// The starting language's strings first (Arabic is its own chunk), then the app.
void loadLanguage(initialLanguage()).catch(() => {}).finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
      </ErrorBoundary>
    </StrictMode>,
  );
});
