export default function SearchFieldLabel({ htmlFor, icon, children }) {
  return (
    <label htmlFor={htmlFor} className="form-label search-form-label">
      {icon ? <i className={`bi ${icon} search-form-label-icon`} aria-hidden="true" /> : null}
      {children}
    </label>
  );
}
