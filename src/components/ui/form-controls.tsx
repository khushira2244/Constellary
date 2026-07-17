import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {hint ? <span className="field__hint">{hint}</span> : null}
      {children}
      {error ? <span className="field__error">{error}</span> : null}
    </label>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`.trim()} {...props} />;
}

export function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`textarea ${className}`.trim()} {...props} />;
}
