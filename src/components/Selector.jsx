export default function Selector({ id, label, value, options, onChange }) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.key} value={option.key} disabled={option.disabled}>
            {option.label}
            {option.disabled ? ` - ${option.status}` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
