import React from 'react';
import { tapLight } from './haptics';

type Variant = 'primary' | 'secondary' | 'danger' | 'destructive' | 'ghost' | 'ink';
type Size = 'md' | 'lg';

interface Props extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: Variant;
  size?: Size;
  icon?: React.ComponentType<{ className?: string }>;
  full?: boolean;
  className?: string;
}

// A minimum height plus padding, not a fixed height: the 48px floor is the
// touch target, the padding lets a long German label (or 200% text) grow the
// button instead of being clipped by it.
const sizes: Record<Size, string> = {
  md: 'min-h-control py-2 px-5 text-body',
  lg: 'min-h-[56px] py-3 px-6 text-body',
};

const variants: Record<Variant, string> = {
  /** Prominent glass: the teal fill with a sheen — the one thing on a screen or a sheet to tap. */
  primary: 'bg-accent-fill text-accent-fill-ink sheen',
  /** Glass with the accent as its text, beside a prominent one or on its own. */
  secondary: 'glass text-accent',
  /** Glass with the delete red as its text: deleting that still asks the system first. */
  danger: 'glass text-neg',
  /** The one irreversible-looking action ("Delete 4 photos"): red prominent glass. */
  destructive: 'bg-neg text-neg-ink sheen',
  ghost: 'bg-transparent text-accent active:bg-accent-dim',
  /** The ink-black call to action ("Einkauf starten"): sits beside the accent one without competing. */
  ink: 'bg-fg text-bg',
};

export function Button({
  variant = 'primary', size = 'md', icon: Icon, full = false, disabled, children, onClick, className = '', ...rest
}: Props) {
  return (
    <button
      // Before the spread so an explicit type="submit" still wins; without a
      // type, a <button> in a <form> silently submits it.
      type="button"
      {...rest}
      disabled={disabled}
      // Don't steal focus from an open input: tapping Save would otherwise
      // start closing the keyboard before the click even runs.
      onMouseDown={e => e.preventDefault()}
      onClick={e => { if (!disabled) { tapLight(); onClick?.(e); } }}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-full font-bold',
        'press select-none focus-visible:ring-focus',
        sizes[size],
        disabled ? 'bg-surface-2 text-fg-faint cursor-not-allowed active:!transform-none' : variants[variant],
        full ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {Icon && <Icon className="w-5 h-5 shrink-0" />}
      {children}
    </button>
  );
}

interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  /** Required: an unlabelled icon button is invisible to VoiceOver. */
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** `bar`: the round glass button of a screen's bar; `filled`: the same material inside a card. */
  tone?: 'default' | 'accent' | 'danger' | 'filled' | 'bar';
  className?: string;
}

export function IconButton({ label, icon: Icon, tone = 'default', onClick, className = '', ...rest }: IconButtonProps) {
  const tones = {
    default: 'text-fg-mute active:bg-surface-2',
    accent: 'text-accent active:bg-accent-dim',
    danger: 'text-neg active:bg-neg-dim',
    filled: 'glass-flat text-fg',
    bar: 'glass text-fg',
  };
  return (
    <button
      {...rest}
      type="button"
      title={label}
      aria-label={label}
      onClick={e => { tapLight(); onClick?.(e); }}
      className={[
        'h-tap w-tap shrink-0 inline-flex items-center justify-center rounded-full',
        'press focus-visible:ring-focus',
        tones[tone], className,
      ].join(' ')}
    >
      <Icon className="w-[22px] h-[22px]" strokeWidth={2.1} />
    </button>
  );
}
