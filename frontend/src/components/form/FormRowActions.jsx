export default function FormRowActions({ onAdd, addLabel = '行を追加' }) {
  return (
    <div className="form-list-actions mt-2">
      <button type="button" className="btn btn-outline-primary btn-sm" onClick={onAdd}>
        <i className="bi bi-plus-lg" aria-hidden="true" />
        {addLabel}
      </button>
    </div>
  );
}

export function FormRemoveButton({ onClick, label = '削除' }) {
  return (
    <button type="button" className="btn btn-outline-danger btn-sm" onClick={onClick} title={label}>
      <i className="bi bi-trash" aria-hidden="true" />
    </button>
  );
}
