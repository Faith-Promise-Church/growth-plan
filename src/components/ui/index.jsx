/* eslint-disable react-refresh/only-export-components */
// Shared components: Button, Card, PageHeader, Stepper, ScaleInput, FrequencyInput,
// DimensionTile, Meter, Dialog, EmptyState, Skeleton. Toast lives in Toast.jsx.

import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DIMENSIONS, dimensionIcon } from '../../content/dimensions.js';
import { FREQUENCY_OPTIONS } from '../../content/assessment.js';
import { formatScore } from '../../lib/scoring.js';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', to, href, loading = false, disabled = false, block = false, className, children, onClick, type = 'button', ...rest },
  ref,
) {
  const [busy, setBusy] = useState(false);
  const classes = cx('btn', `btn--${variant}`, size === 'sm' && 'btn--sm', block && 'btn--block', className);
  const isBusy = loading || busy;

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }

  // A press while the last one is still running is ignored, so a double tap saves once.
  async function handleClick(event) {
    if (isBusy || disabled) {
      event.preventDefault();
      return;
    }
    if (!onClick) return;
    const result = onClick(event);
    if (result && typeof result.then === 'function') {
      setBusy(true);
      try {
        await result;
      } finally {
        setBusy(false);
      }
    }
  }

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled}
      aria-busy={isBusy || undefined}
      aria-disabled={isBusy || undefined}
      onClick={handleClick}
      {...rest}
    >
      {isBusy ? <span className="btn__spinner" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
});

// ---------------------------------------------------------------------------
// Card, PageHeader, EmptyState, Skeleton
// ---------------------------------------------------------------------------

export function Card({ as = 'section', className, children, accent, ...rest }) {
  const Tag = as;
  const style = accent ? { '--accent': `var(--${accent})`, '--accent-ink': `var(--${accent}-ink)` } : undefined;
  return (
    <Tag className={cx('card', accent && 'card--accent', className)} style={style} {...rest}>
      {children}
    </Tag>
  );
}

export function PageHeader({ title, lead, back, actions, children }) {
  return (
    <header className="page-header">
      {back ? (
        <Link className="page-header__back" to={back.to}>
          <span aria-hidden="true">←</span> {back.label}
        </Link>
      ) : null}
      <div className="page-header__row">
        <h1 className="page-header__title">{title}</h1>
        {actions ? <div className="page-header__actions">{actions}</div> : null}
      </div>
      {lead ? <p className="page-header__lead">{lead}</p> : null}
      {children}
    </header>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="empty-state">
      <h2 className="empty-state__title">{title}</h2>
      {children ? <div className="empty-state__body">{children}</div> : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ lines = 3, height, className }) {
  if (height) return <div className={cx('skeleton', className)} style={{ height }} aria-hidden="true" />;
  return (
    <div className={cx('skeleton-group', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton" style={{ width: `${100 - (i % 3) * 18}%` }} />
      ))}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading' }) {
  return (
    <div className="loading-block" role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      <Skeleton height={28} className="skeleton--title" />
      <Skeleton lines={4} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stepper: "3 of 7"
// ---------------------------------------------------------------------------

export function Stepper({ current, total, label }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="stepper">
      <div className="stepper__text">
        <span>{`${current} of ${total}`}</span>
        {label ? <span className="stepper__label">{label}</span> : null}
      </div>
      <div
        className="stepper__bar"
        role="progressbar"
        aria-label={label ?? 'Progress'}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-valuetext={`Step ${current} of ${total}`}
      >
        <div className="stepper__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScaleInput: 1 to 10 as a radio group of tap targets with end labels
// ---------------------------------------------------------------------------

export function ScaleInput({ name, legend, value, onChange, lowLabel, highLabel, dimension, number }) {
  const id = useId();
  const style = dimension ? { '--sel': `var(--${dimension}-ink)` } : undefined;
  return (
    <fieldset className="scale" style={style}>
      <legend className="scale__legend">
        {number ? <span className="scale__number">{number}</span> : null}
        <span>{legend}</span>
      </legend>
      <div className="scale__options">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <label key={n} className="scale__option">
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              aria-describedby={n === 1 ? `${id}-low` : n === 10 ? `${id}-high` : undefined}
            />
            <span className="scale__box">{n}</span>
          </label>
        ))}
      </div>
      <div className="scale__ends" aria-hidden="false">
        <span id={`${id}-low`}>{`1 = ${lowLabel}`}</span>
        <span id={`${id}-high`}>{`10 = ${highLabel}`}</span>
      </div>
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// FrequencyInput: the five-point "how steady" scale
// ---------------------------------------------------------------------------

export function FrequencyInput({ name, legend, value, onChange, dimension, compact = false }) {
  const style = dimension ? { '--sel': `var(--${dimension}-ink)` } : undefined;
  return (
    <fieldset className={cx('freq', compact && 'freq--compact')} style={style}>
      <legend className="freq__legend">{legend}</legend>
      <div className="freq__options">
        {FREQUENCY_OPTIONS.map((opt) => (
          <label key={opt.value} className="freq__option">
            <input type="radio" name={name} value={opt.value} checked={value === opt.value} onChange={() => onChange(opt.value)} />
            <span className="freq__box">{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// DimensionTile and Meter
// ---------------------------------------------------------------------------

export function DimensionTile({ dimension, size = 40 }) {
  return (
    <span className="dim-tile" style={{ width: size, height: size }} aria-hidden="true">
      <img src={dimensionIcon(dimension, 'standard')} alt="" width={size} height={size} />
    </span>
  );
}

export function Meter({ value, label, dimension, muted = false }) {
  const v = value == null ? null : Number(value);
  const pct = v == null ? 0 : Math.max(0, Math.min(100, (v / 10) * 100));
  return (
    <div className={cx('meter', muted && 'meter--muted')}>
      <div className="meter__top">
        <span className="meter__label">{label}</span>
        <span className="meter__value">{v == null ? 'Not measured' : formatScore(v)}</span>
      </div>
      <div className="meter__track" aria-hidden="true">
        <div className="meter__fill" style={{ width: `${pct}%`, background: dimension ? `var(--${dimension})` : 'var(--brand)' }} />
      </div>
    </div>
  );
}

export function DimensionName({ dimension }) {
  return <>{DIMENSIONS[dimension]?.name ?? dimension}</>;
}

// ---------------------------------------------------------------------------
// Dialog: the native <dialog> element, which traps focus and closes on Escape.
// ---------------------------------------------------------------------------

export function Dialog({ open, title, children, onClose, actions, describedBy }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      if (typeof el.showModal === 'function') el.showModal();
      else el.setAttribute('open', '');
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      onCancel={(e) => {
        e.preventDefault();
        onClose?.();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose?.();
      }}
    >
      <div className="dialog__body">
        <h2 id={titleId} className="dialog__title">
          {title}
        </h2>
        <div className="dialog__content">{children}</div>
        {actions ? <div className="dialog__actions">{actions}</div> : null}
      </div>
    </dialog>
  );
}

export function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = (opts) =>
    new Promise((resolve) => {
      setState({ ...opts, resolve });
    });
  const close = (answer) => {
    state?.resolve(answer);
    setState(null);
  };
  const element = (
    <Dialog
      open={Boolean(state)}
      title={state?.title ?? ''}
      onClose={() => close(false)}
      actions={
        <>
          <Button variant="secondary" onClick={() => close(false)}>
            {state?.cancelLabel ?? 'Cancel'}
          </Button>
          <Button variant={state?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
            {state?.confirmLabel ?? 'Continue'}
          </Button>
        </>
      }
    >
      {state?.body ? <p>{state.body}</p> : null}
    </Dialog>
  );
  return [confirm, element];
}

// ---------------------------------------------------------------------------
// Form field
// ---------------------------------------------------------------------------

export function Field({ label, hint, error, children, id: givenId }) {
  const autoId = useId();
  const id = givenId ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cx('field', error && 'field--error')}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      ) : null}
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error ? (
        <p id={errorId} className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Banner({ tone = 'info', children, action }) {
  return (
    <div className={cx('banner', `banner--${tone}`)} role={tone === 'error' ? 'alert' : 'status'}>
      <div className="banner__text">{children}</div>
      {action ? <div className="banner__action">{action}</div> : null}
    </div>
  );
}

export function ExternalLink({ href, children, className }) {
  if (!href) return null;
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
