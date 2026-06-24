import React from 'react';

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
  name
}) {
  return (
    <div style={{ marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
          className="input-field"
          style={{
            paddingLeft: Icon ? '46px' : '16px'
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
        return 'btn-global'; 
      default:
        return 'btn-global btn-primary';
    }
  };

  const getCustomStyles = () => {
    let base = {};
    if (variant === 'danger') {
      base = {
        background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
        color: 'white',
        boxShadow: '0 4px 12px rgba(244, 63, 94, 0.2)'
      };
    } else if (variant === 'secondary') {
      base = {
        background: 'white',
        border: '1px solid var(--border)',
        color: 'var(--text-muted)'
      };
    }
    return { ...base, ...style };
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
