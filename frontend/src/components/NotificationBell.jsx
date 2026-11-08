import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { canViewProjectFeatures } from '../auth';
import { useAuth } from '../context/AuthContext';

const POLL_MS = 20000;

const TYPE_ICONS = {
  BP_HELP_REQUESTED: { icon: 'bi-megaphone-fill', tone: 'amber' },
  BP_HELP_REFERRAL_SUBMITTED: { icon: 'bi-person-plus-fill', tone: 'indigo' },
  BP_HELP_REFERRAL_APPROVED: { icon: 'bi-check2-circle', tone: 'green' },
  BP_HELP_REFERRAL_REJECTED: { icon: 'bi-x-circle-fill', tone: 'red' },
  BP_HELP_REFERRAL_TO_CLIENT: { icon: 'bi-send-fill', tone: 'blue' },
  BP_HELP_REFERRAL_INTERVIEW: { icon: 'bi-calendar-check-fill', tone: 'cyan' },
  BP_HELP_REFERRAL_HIRED: { icon: 'bi-award-fill', tone: 'green' },
  BP_HELP_REFERRAL_CLOSED: { icon: 'bi-archive-fill', tone: 'slate' },
  PROJECT_FILLED_CLOSE_REMIND: { icon: 'bi-flag-fill', tone: 'amber' },
};

function typeVisual(type) {
  return TYPE_ICONS[type] ?? { icon: 'bi-bell-fill', tone: 'slate' };
}

function formatTime(value) {
  if (!value) return '';
  return value.replace('T', ' ').slice(0, 16);
}

/** 「5分前」のような相対表記。1週間以上前は日付で表示する */
function formatRelativeTime(value) {
  if (!value) return '';
  const created = new Date(value);
  if (Number.isNaN(created.getTime())) return formatTime(value);
  const diffSec = Math.floor((Date.now() - created.getTime()) / 1000);
  if (diffSec < 0) return formatTime(value);
  if (diffSec < 60) return 'たった今';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分前`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}時間前`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}日前`;
  return `${created.getMonth() + 1}/${created.getDate()}`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const canView = canViewProjectFeatures(user);

  const refreshCount = useCallback(async () => {
    if (!canView) {
      setUnreadCount(0);
      return;
    }
    try {
      const result = await api.getNotificationUnreadCount();
      setUnreadCount(result?.unreadCount ?? 0);
    } catch {
      /* ignore polling errors */
    }
  }, [canView]);

  const loadList = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const list = await api.getNotifications({ limit: 20 });
      setItems(list ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    refreshCount();
    const id = window.setInterval(refreshCount, POLL_MS);
    return () => window.clearInterval(id);
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return undefined;
    loadList();
    function handleClick(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    function handleKey(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, loadList]);

  if (!canView) return null;

  async function handleOpenToggle() {
    setOpen((prev) => !prev);
  }

  async function handleItemClick(item) {
    try {
      if (item.unread) {
        await api.markNotificationRead(item.id);
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      /* continue navigation */
    }
    setOpen(false);
    if (item.linkPath) {
      navigate(item.linkPath);
    }
  }

  async function handleMarkAll() {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      await loadList();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="app-notification-bell" ref={panelRef}>
      <button
        type="button"
        className={`btn app-header-notification-btn app-btn${open ? ' active' : ''}`}
        title="通知"
        aria-label={`通知${unreadCount > 0 ? `（未読${unreadCount}件）` : ''}`}
        aria-expanded={open}
        onClick={handleOpenToggle}
      >
        <i className="bi bi-bell" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="app-notification-bell-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="app-notification-panel" role="dialog" aria-label="通知一覧">
          <div className="app-notification-panel-header">
            <div className="app-notification-panel-title">
              通知
              {unreadCount > 0 && (
                <span className="app-notification-panel-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="app-notification-mark-all"
                onClick={handleMarkAll}
              >
                <i className="bi bi-check2-all" aria-hidden="true" />
                すべて既読
              </button>
            )}
          </div>
          <div className="app-notification-panel-body">
            {loading ? (
              <div className="app-notification-empty">
                <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                <span>読み込み中…</span>
              </div>
            ) : items.length === 0 ? (
              <div className="app-notification-empty">
                <i className="bi bi-bell-slash" aria-hidden="true" />
                <span>通知はありません</span>
              </div>
            ) : (
              <ul className="app-notification-list">
                {items.map((item) => {
                  const visual = typeVisual(item.type);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`app-notification-item${item.unread ? ' is-unread' : ''}`}
                        onClick={() => handleItemClick(item)}
                      >
                        <span className={`app-notification-item-icon tone-${visual.tone}`}>
                          <i className={`bi ${visual.icon}`} aria-hidden="true" />
                        </span>
                        <span className="app-notification-item-main">
                          <span className="app-notification-item-title">{item.title}</span>
                          {item.body && <span className="app-notification-item-body">{item.body}</span>}
                          <span className="app-notification-item-meta">
                            <time dateTime={item.createdAt} title={formatTime(item.createdAt)}>
                              {formatRelativeTime(item.createdAt)}
                            </time>
                            {item.actorDisplayName && (
                              <>
                                <span className="app-notification-item-sep" aria-hidden="true">·</span>
                                <span>{item.actorDisplayName}</span>
                              </>
                            )}
                          </span>
                        </span>
                        {item.unread && <span className="app-notification-item-dot" aria-label="未読" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <button
            type="button"
            className="app-notification-panel-footer"
            onClick={() => {
              setOpen(false);
              navigate('/bp-help-requests');
            }}
          >
            <span>BP求援一覧を開く</span>
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
