export default function FormField({ label, required, htmlFor, children, hint }) {
  return (
    <div className="detail-info-cell detail-form-field">
      {label && (
        <label htmlFor={htmlFor} className="detail-info-label">
          {label}
          {required && <span className="text-danger ms-1">*</span>}
        </label>
      )}
      <div className="detail-form-control">{children}</div>
      {hint && <div className="form-text">{hint}</div>}
    </div>
  );
}
