import React, { useRef, useState } from 'react';
import { api } from '../utils/api.js';

export default function AvatarPickerModal({ avatars = [], onClose, onUpdated }) {
  const uploadRef = useRef(null);
  const cameraRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSelect = async (avatarId) => {
    try {
      setSubmitting(true);
      const response = await api.selectAvatar(avatarId);
      onUpdated?.(response.avatar);
      onClose?.();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setSubmitting(true);
      const response = await api.uploadAvatar(file);
      onUpdated?.(response.avatar);
      onClose?.();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
      event.target.value = '';
    }
  };

  return (
    <div className="avatar-modal-mask animate-fade-in">
      <div className="avatar-modal-card animate-scale-in">
        <div className="avatar-modal-head">
          <strong>更换头像</strong>
          <button type="button" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="avatar-modal-actions">
          <button type="button" onClick={() => uploadRef.current?.click()} disabled={submitting}>
            从相册选择
          </button>
          <button type="button" onClick={() => cameraRef.current?.click()} disabled={submitting}>
            使用相机
          </button>
        </div>

        <div className="avatar-modal-grid">
          {avatars.map((avatar) => (
            <button
              key={avatar.id}
              type="button"
              className="avatar-option"
              onClick={() => handleSelect(avatar.id)}
              disabled={submitting}
            >
              <img src={avatar.url} alt={avatar.id} />
            </button>
          ))}
        </div>

        <input ref={uploadRef} hidden type="file" accept="image/*" onChange={handleUpload} />
        <input ref={cameraRef} hidden type="file" accept="image/*" capture="environment" onChange={handleUpload} />
      </div>

      <style>{`
        .avatar-modal-mask {
          position: absolute;
          inset: 0;
          z-index: 85;
          background: rgba(6, 10, 9, 0.82);
          backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }
        .avatar-modal-card {
          width: 100%;
          max-width: 360px;
          border-radius: 24px;
          background: var(--word-shell-bg);
          border: 1px solid var(--settings-border);
          padding: 18px;
        }
        .avatar-modal-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--text-primary);
        }
        .avatar-modal-head button {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          border: 1px solid var(--settings-border);
          background: var(--settings-chip-bg);
          color: var(--text-primary);
        }
        .avatar-modal-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }
        .avatar-modal-actions button {
          min-height: 42px;
          border-radius: 14px;
          border: 1px solid var(--settings-border);
          background: var(--settings-chip-bg);
          color: var(--text-primary);
          font-weight: 700;
        }
        .avatar-modal-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
          margin-top: 16px;
        }
        .avatar-option {
          aspect-ratio: 1 / 1;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--settings-border);
          background: var(--settings-chip-bg);
        }
        .avatar-option img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
      `}</style>
    </div>
  );
}
