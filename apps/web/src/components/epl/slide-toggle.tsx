"use client";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
};

export function SlideToggle({ checked, onChange, label, description }: Props) {
  return (
    <button
      type="button"
      className={`st-toggle-card${checked ? " is-on" : ""}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <div className="st-toggle-left">
        <div>
          <strong>{label}</strong>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      <span className={`st-switch${checked ? " is-on" : ""}`} aria-hidden="true">
        <span />
      </span>
    </button>
  );
}
