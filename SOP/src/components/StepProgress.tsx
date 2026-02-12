interface Step {
  id: number;
  name: string;
  shortName: string;
}

interface StepProgressProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

export function StepProgress({ steps, currentStep, onStepClick }: StepProgressProps) {
  return (
    <div className="step-progress">
      <div className="step-progress-track">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = true; // Allow jumping to any step

          return (
            <div key={step.id} className="step-progress-item">
              {/* Connector line (except for first item) */}
              {index > 0 && (
                <div
                  className={`step-connector ${isCompleted ? 'completed' : ''}`}
                />
              )}

              {/* Step circle */}
              <button
                type="button"
                onClick={() => isClickable && onStepClick(index)}
                className={`step-circle ${
                  isCurrent ? 'current' : isCompleted ? 'completed' : 'pending'
                }`}
                title={step.name}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{step.id}</span>
                )}
              </button>

              {/* Step label */}
              <span
                className={`step-label ${isCurrent ? 'current' : ''}`}
              >
                {step.shortName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
