type Step = { id: string; label: string };

export function StepIndicator({
  steps,
  activeIndex,
  completed,
  onSelect,
}: {
  steps: readonly Step[];
  activeIndex: number;
  completed: Record<string, boolean>;
  onSelect: (index: number) => void;
}) {
  return (
    <nav className="steps" aria-label="Branch creation progress">
      {steps.map((step, index) => {
        const active = index === activeIndex;
        const done = Boolean(completed[step.id]);
        return (
          <button
            className={`step ${active ? "step--active" : ""} ${done ? "step--done" : ""}`}
            key={step.id}
            onClick={() => onSelect(index)}
            type="button"
          >
            <span className="step__marker">{done ? "✓" : index + 1}</span>
            <span>
              <small>Step {index + 1}</small>
              {step.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
