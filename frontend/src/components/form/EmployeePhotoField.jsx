import { useRef, useState } from 'react';
import { processEmployeePhotoFile } from '../../utils';

export default function EmployeePhotoField({ photoUrl, onChange }) {
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError('');
    setLoading(true);
    try {
      onChange(await processEmployeePhotoFile(file));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleRemove() {
    setError('');
    onChange('');
  }

  function closeModal() {
    setOpen(false);
    setError('');
  }

  return (
    <>
      <div className="detail-photo-field">
        <button
          type="button"
          className="detail-photo-trigger"
          onClick={() => setOpen(true)}
          aria-label="社員写真を設定"
        >
          <div className="detail-photo-box">
            {photoUrl ? (
              <img src={photoUrl} alt="社員写真" className="detail-photo-img" />
            ) : (
              <div className="detail-photo-placeholder">
                <i className="bi bi-person-bounding-box" />
                <span>社員写真</span>
              </div>
            )}
          </div>
          <span className="detail-photo-trigger-label small text-primary">
            {photoUrl ? '写真を変更' : '写真を追加'}
          </span>
        </button>
      </div>

      {open && (
        <>
          <div
            className="modal fade show d-block employee-photo-modal-root"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="employeePhotoModalTitle"
          >
            <div className="modal-dialog modal-dialog-centered employee-photo-modal">
              <div className="modal-content">
                <div className="modal-header py-2">
                  <h2 className="modal-title fs-6" id="employeePhotoModalTitle">
                    社員写真
                  </h2>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="閉じる"
                    onClick={closeModal}
                  />
                </div>
                <div className="modal-body text-center">
                  <div className="detail-photo-box detail-photo-box-modal mx-auto">
                    {photoUrl ? (
                      <img src={photoUrl} alt="社員写真プレビュー" className="detail-photo-img" />
                    ) : (
                      <div className="detail-photo-placeholder">
                        <i className="bi bi-person-bounding-box" />
                        <span>未設定</span>
                      </div>
                    )}
                  </div>
                  {error && <p className="small text-danger mt-2 mb-0">{error}</p>}
                </div>
                <div className="modal-footer py-2 flex-column gap-2">
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="visually-hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    className="btn btn-primary app-btn w-100"
                    disabled={loading}
                    onClick={() => inputRef.current?.click()}
                  >
                    <i className="bi bi-folder2-open" aria-hidden="true" />
                    {loading ? '読み込み中…' : '画像ファイルを選択'}
                  </button>
                  {photoUrl && (
                    <button
                      type="button"
                      className="btn btn-outline-danger app-btn w-100"
                      disabled={loading}
                      onClick={handleRemove}
                    >
                      写真を削除
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline-secondary app-btn w-100"
                    onClick={closeModal}
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={closeModal} />
        </>
      )}
    </>
  );
}
