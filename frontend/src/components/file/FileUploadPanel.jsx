import { FILE_CATEGORIES } from '../../utils/fileCategories';

export default function FileUploadDropzone({
  selectedFiles,
  dragActive,
  uploading,
  fileInputRef,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileChange,
  onRemoveFile,
  onClearFiles,
  onBrowse,
  getFileIconInfo,
  formatFileSize,
}) {
  return (
    <div
      className={`file-dropzone${dragActive ? ' is-dragover' : ''}${selectedFiles.length ? ' has-file' : ''}`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => onBrowse?.()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          fileInputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="ファイルを選択またはドロップ"
    >
      <input
        ref={fileInputRef}
        id="fileUploadInput"
        type="file"
        multiple
        className="file-dropzone-input"
        onChange={onFileChange}
        disabled={uploading}
        tabIndex={-1}
      />
      {selectedFiles.length ? (
        <div className="file-dropzone-batch">
          <div className="file-dropzone-batch-head">
            <div className="file-dropzone-batch-head-main">
              <span className="file-dropzone-batch-badge" aria-hidden="true">
                {selectedFiles.length}
              </span>
              <div>
                <strong className="file-dropzone-batch-head-title">{selectedFiles.length} 件選択中</strong>
                <p className="file-dropzone-batch-head-hint mb-0">
                  クリックまたはドロップで追加
                </p>
              </div>
            </div>
            <button
              type="button"
              className="file-dropzone-batch-clear-all"
              onClick={(event) => {
                event.stopPropagation();
                onClearFiles();
              }}
              disabled={uploading}
            >
              <i className="bi bi-trash3" aria-hidden="true" />
              すべて解除
            </button>
          </div>
          <ul className="file-dropzone-batch-list">
            {selectedFiles.map((file, index) => {
              const iconInfo = getFileIconInfo(file.name);
              return (
                <li key={`${file.name}-${file.size}-${index}`} className="file-dropzone-batch-item">
                  <div className={`file-dropzone-batch-icon file-type-icon file-type-icon--${iconInfo.tone}`} aria-hidden="true">
                    <i className={`bi ${iconInfo.icon}`} />
                  </div>
                  <div className="file-dropzone-batch-meta">
                    <span className="file-dropzone-batch-name" title={file.name}>
                      {file.name}
                    </span>
                    <span className="file-dropzone-batch-size">{formatFileSize(file.size)}</span>
                  </div>
                  <button
                    type="button"
                    className="file-dropzone-batch-remove"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveFile(index);
                    }}
                    disabled={uploading}
                    aria-label={`${file.name} を除外`}
                  >
                    <i className="bi bi-x-lg" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="file-dropzone-placeholder">
          <div className="file-dropzone-icon-wrap" aria-hidden="true">
            <i className="bi bi-cloud-arrow-up" />
          </div>
          <p className="file-dropzone-title mb-1">ファイルをドロップ</p>
          <p className="file-dropzone-hint mb-2">またはクリックして選択</p>
          <span className="file-dropzone-browse">ファイルを選ぶ</span>
          <p className="file-dropzone-limit mb-0">1ファイル最大 50MB · 複数選択可</p>
        </div>
      )}
    </div>
  );
}

export function FileUploadSettings({
  uploadCategory,
  onCategoryChange,
  uploadTargetMonth,
  onTargetMonthChange,
  description,
  onDescriptionChange,
  isTimesheetUpload,
  syncAttendance,
  uploading,
  selectedCount,
}) {
  return (
    <div className="file-upload-settings">
      <div className="file-upload-settings-head">
        <span className="file-upload-settings-icon" aria-hidden="true">
          <i className="bi bi-sliders" />
        </span>
        <div>
          <h3 className="file-upload-settings-title">アップロード設定</h3>
          <p className="file-upload-settings-lead mb-0">分類と対象年月を選んでからファイルを追加</p>
        </div>
      </div>

      <div className="file-upload-settings-fields">
        <div className="file-upload-field-block">
          <label htmlFor="fileCategorySelect" className="file-upload-field-label">
            分類
          </label>
          <div className="file-upload-field-control-wrap">
            <i className="bi bi-tag file-upload-field-icon" aria-hidden="true" />
            <select
              id="fileCategorySelect"
              className="form-select file-upload-field-control"
              value={uploadCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              disabled={uploading}
            >
              {FILE_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="file-upload-field-block">
          <label htmlFor="fileTargetMonthInput" className="file-upload-field-label">
            対象年月
            {isTimesheetUpload && syncAttendance ? (
              <span className="file-upload-required-badge">必須</span>
            ) : (
              <span className="file-upload-optional-badge">任意</span>
            )}
          </label>
          <div className="file-upload-field-control-wrap">
            <i className="bi bi-calendar3 file-upload-field-icon" aria-hidden="true" />
            <input
              id="fileTargetMonthInput"
              type="month"
              className="form-control file-upload-field-control"
              value={uploadTargetMonth}
              onChange={(e) => onTargetMonthChange(e.target.value)}
              disabled={uploading}
              required={isTimesheetUpload && syncAttendance}
            />
          </div>
        </div>

        <div className="file-upload-field-block">
          <label htmlFor="fileDescriptionInput" className="file-upload-field-label">
            説明
            <span className="file-upload-optional-badge">任意</span>
          </label>
          <div className="file-upload-field-control-wrap">
            <i className="bi bi-card-text file-upload-field-icon" aria-hidden="true" />
            <input
              id="fileDescriptionInput"
              type="text"
              className="form-control file-upload-field-control"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="メモや用途など"
              maxLength={500}
              disabled={uploading}
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary app-btn file-upload-card-submit"
        disabled={uploading || !selectedCount}
        aria-disabled={uploading || !selectedCount}
      >
        {uploading ? (
          <>
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
            送信中…
          </>
        ) : (
          <>
            <i className="bi bi-cloud-upload" aria-hidden="true" />
            {selectedCount > 1 ? `${selectedCount} 件をアップロード` : 'アップロード'}
          </>
        )}
      </button>
    </div>
  );
}
