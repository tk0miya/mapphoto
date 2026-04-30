interface Props {
  steps: string[];
  currentIndex: number;
}

export function StepIndicator({ steps, currentIndex }: Props) {
  return (
    <ol className="step-indicator">
      {steps.map((label, i) => {
        const cls = i === currentIndex ? "active" : i < currentIndex ? "done" : "";
        return (
          <li key={label} className={cls}>
            <span className="step-number">{i + 1}</span>
            <span className="step-label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
