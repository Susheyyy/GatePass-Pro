export function FormInput({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  icon: Icon,
  required = false,
  error = '',
  min,
  max,
  name,
  disabled = false,
  style = {}
}) {
  return (
    <div style={{ marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '6px', ...style }}>
      {label && (
        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>
          {label} {required && <span style={{ color: 'var(--accent)' }}>*</span>}
        </label>
      )}
      <div className="input-group">
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          min={min}
          max={max}
          disabled={disabled}
          className="input-field"
          style={{
            paddingLeft: Icon ? '46px' : '16px',
            backgroundColor: disabled ? 'rgba(0, 0, 0, 0.04)' : undefined,
            color: disabled ? 'var(--text-muted)' : undefined,
            cursor: disabled ? 'not-allowed' : undefined
          }}
        />
        {Icon && <Icon className="input-icon" size={20} />}
      </div>
      {error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: '600' }}>
          {error}
        </span>
      )}
    </div>
  );
}

export function FormButton({
  children,
  type = 'button',
  variant = 'primary',
  onClick,
  disabled = false,
  style = {}
}) {
  const getButtonClass = () => {
    switch (variant) {
      case 'success':
        return 'btn-global btn-success';
      case 'danger':
        return 'btn-global btn-danger';
      case 'secondary':
        return 'btn-global btn-secondary';
      default:
        return 'btn-global btn-primary';
    }
  };

  const getCustomStyles = () => {
    return style;
  };

  return (
    <button
      type={type}
      className={getButtonClass()}
      onClick={onClick}
      disabled={disabled}
      style={getCustomStyles()}
    >
      {children}
    </button>
  );
}
