import React, { useEffect, useId, useRef } from 'react';

interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'className' | 'value'> {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Hide the visible label (it still names the input for VoiceOver). */
  hideLabel?: boolean;
  trailing?: React.ReactNode;
  /** The input itself, for focusing it from outside. */
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

/** A labelled text input. Focus on mount uses preventScroll — the DOM
 *  `autofocus` attribute inside a sheet scrolls the page behind it. */
export function Field({ label, value, onChange, hideLabel, trailing, autoFocus, inputRef, ...rest }: FieldProps) {
  const id = useId();
  const own = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? own;
  useEffect(() => {
    if (autoFocus) ref.current?.focus({ preventScroll: true });
  }, [autoFocus]);
  return (
    <div>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'block eyebrow text-fg-mute mb-1.5 px-1'}>{label}</label>
      <div className="flex items-center gap-2 bg-surface-2 rounded-sm px-4 min-h-control focus-within:ring-2 focus-within:ring-accent">
        <input
          ref={ref}
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent py-3 text-body text-fg placeholder:text-fg-faint outline-none"
          {...rest}
        />
        {trailing}
      </div>
    </div>
  );
}
