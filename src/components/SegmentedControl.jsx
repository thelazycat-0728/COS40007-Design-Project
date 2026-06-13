export default function SegmentedControl({ id, label, value, options, onChange }) {
  return (
    <div className="segmented-field" role="group" aria-labelledby={`${id}-label`}>
      <span id={`${id}-label`}>{label}</span>
      <div className="segmented-control">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            className={option.key === value ? 'active' : ''}
            aria-pressed={option.key === value}
            onClick={() => onChange(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
