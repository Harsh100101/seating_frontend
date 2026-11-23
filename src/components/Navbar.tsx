import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, MoreHorizontal, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { apiRequest, NOTIFICATIONS_CHANGED_EVENT } from '../api/client';
import { getNavigationItems, type NavigationItem } from '../config/navigation';
import { normalizeAdminRole } from '../utils/adminRole';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  transferRequestId?: string | null;
  readAt?: string | null;
  createdAt: string;
  transferRequest?: { requestNumber?: string; status?: string } | null;
};

type NotificationResponse = {
  notifications: NotificationItem[];
  unreadCount: number;
};

export function isPointerInsideDesktopNavigation(
  root: { contains: (node: Node) => boolean } | null,
  target: EventTarget | null,
): boolean {
  return Boolean(root && target && root.contains(target as Node));
}

export const Navbar: React.FC = () => {
  const { adminUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopMoreOpen, setDesktopMoreOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsRefreshToken, setNotificationsRefreshToken] = useState(0);
  // The responsive desktop navigation renders two alternative More menus.
  // Keep the click-away boundary on their shared nav container rather than
  // reusing one ref on both menu wrappers; React refs otherwise point at the
  // last hidden wrapper and treat the visible menu as an outside click.
  const desktopNavRef = useRef<HTMLElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const loadNotifications = async () => {
      if (!adminUser) return;
      try {
        const response = await apiRequest<NotificationResponse>('/notifications?limit=10');
        if (active) {
          setNotifications(response.notifications || []);
          setUnreadCount(response.unreadCount || 0);
        }
      } catch {
        if (active) {
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    };
    void loadNotifications();
    return () => {
      active = false;
    };
  }, [adminUser?.id, notificationsRefreshToken]);

  useEffect(() => {
    const closeDesktopMore = (event: PointerEvent) => {
      if (!isPointerInsideDesktopNavigation(desktopNavRef.current, event.target)) {
        setDesktopMoreOpen(false);
      }
      if (!isPointerInsideDesktopNavigation(notificationsRef.current, event.target)) {
        setNotificationsOpen(false);
      }
    };
    const closeDesktopMoreOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDesktopMoreOpen(false);
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeDesktopMore);
    document.addEventListener('keydown', closeDesktopMoreOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeDesktopMore);
      document.removeEventListener('keydown', closeDesktopMoreOnEscape);
    };
  }, []);

  useEffect(() => {
    const refreshNotifications = () => setNotificationsRefreshToken((current) => current + 1);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshNotifications);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshNotifications);
  }, [adminUser?.id]);

  useEffect(() => {
    setDesktopMoreOpen(false);
  }, [location.pathname]);

  const markNotificationRead = async (notification: NotificationItem) => {
    if (!notification.readAt) {
      try {
        await apiRequest(`/notifications/${notification.id}/read`, { method: 'PATCH' });
        setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item));
        setUnreadCount((current) => Math.max(0, current - 1));
      } catch {
        // Keep the notification visible when the server cannot acknowledge it.
      }
    }
    if (notification.transferRequestId) {
      navigate('/transfer-requests');
      setNotificationsOpen(false);
    }
  };

  const markAllNotificationsRead = async () => {
    if (!unreadCount) return;
    try {
      await apiRequest('/notifications/read-all', { method: 'POST' });
      setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // Keep the unread count when the server cannot acknowledge the batch.
    }
  };

  const role = normalizeAdminRole(adminUser?.role);
  const navItems = getNavigationItems(role);
  const compactPrimaryItems = navItems.slice(0, 5);
  const compactWidePrimaryItems = role === 'UNIT_ADMIN' ? navItems : navItems.slice(0, 7);
  const compactItems = navItems.slice(5);
  const compactWideItems = role === 'UNIT_ADMIN' ? [] : navItems.slice(7);

  const getRoleBadge = (userRole?: string) => {
    const raw = (userRole || '').toUpperCase().replace(/[\s-]+/g, '_');
    const r = raw === 'SUPERADMIN' ? 'SUPER_ADMIN' : raw === 'TECHADMIN' ? 'TECH_ADMIN' : raw;
    switch (r) {
      case 'TECH_ADMIN':
        return { label: 'TECH_ADMIN', style: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold tracking-wide shadow-xs' };
      case 'SUPER_ADMIN':
        return { label: 'SUPER_ADMIN', style: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'UNIT_ADMIN': {
        const customUnit = adminUser?.name?.toUpperCase().includes('UNIT')
          ? adminUser.name.toUpperCase()
          : 'UNIT ADMIN';
        return { label: customUnit, style: 'bg-blue-100 text-blue-800 border-blue-200' };
      }
      default:
        return { label: userRole || 'ADMIN', style: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const roleBadge = getRoleBadge(role);

  const renderNavItem = (item: NavigationItem, variant: 'full' | 'compact' = 'full') => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    return (
      <Link
        key={item.path}
        to={item.path}
        aria-current={isActive ? 'page' : undefined}
        className={`navbar-nav-link relative flex items-center gap-1.5 rounded-[10px] text-[12px] font-medium transition-colors whitespace-nowrap ${variant === 'full' ? 'px-2 py-2' : 'px-2.5 py-2'}`}
      >
        {isActive && (
          <motion.div
            layoutId={`navbar-tab-indicator-${variant}`}
            className="absolute inset-0 bg-white rounded-[10px] shadow-sm ring-1 ring-black/[0.04]"
            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
          />
        )}
        <span className="relative z-10 flex items-center space-x-1.5">
          <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-orange-600' : 'text-slate-500'}`} />
          <span className={isActive ? 'text-slate-950 font-semibold' : 'text-slate-600 hover:text-slate-900'}>
            {item.label}
          </span>
          {item.badge && (
            <span className="flex items-center space-x-0.5 text-[9px] bg-purple-100 text-purple-700 font-semibold px-1.5 py-0.2 rounded-full leading-none border border-purple-200">
              {item.badgeIcon && <item.badgeIcon className="w-2.5 h-2.5" />}
              <span>{item.badge}</span>
            </span>
          )}
        </span>
      </Link>
    );
  };

  const renderMoreMenu = (items: NavigationItem[]) => {
    if (!items || items.length === 0) {
      return null;
    }
    const hasActiveItem = items.some((item) => location.pathname === item.path);
    return (
      <div className="navbar-more-wrapper relative">
        <button
          type="button"
          onClick={() => setDesktopMoreOpen((current) => !current)}
          className={`navbar-more-trigger relative flex items-center gap-1.5 rounded-[10px] px-2.5 py-2 text-[12px] font-semibold transition-colors ${hasActiveItem
              ? 'bg-white text-slate-950 shadow-xs ring-1 ring-black/[0.04]'
              : 'text-slate-600 hover:bg-white hover:text-slate-950'
            }`}
          aria-haspopup="menu"
          aria-expanded={desktopMoreOpen}
          aria-controls="desktop-more-menu"
        >
          <MoreHorizontal className={`h-3.5 w-3.5 ${hasActiveItem ? 'text-orange-600' : 'text-slate-500'}`} />
          <span>More</span>
        </button>
        {desktopMoreOpen && (
          <div id="desktop-more-menu" className="navbar-more-menu absolute right-0 top-11 z-50 min-w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl" role="menu" aria-label="More navigation">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  role="menuitem"
                  onClick={() => setDesktopMoreOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${isActive ? 'bg-orange-50 text-slate-950 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-orange-600' : 'text-slate-500'}`} />
                  <span className="min-w-0 flex-1">{item.label}</span>
                  {item.badge && <span className="shrink-0 rounded-full border border-purple-200 bg-purple-100 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-purple-700">{item.badge}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <header className="ios-navbar sticky top-0 z-40 select-none">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-6">
          <div className="navbar-content flex justify-between h-[68px] items-center gap-4">
            <div className="navbar-left flex items-center gap-4 min-w-0">
              <Link to="/dashboard" className="flex items-center gap-2.5 group shrink-0" aria-label="Shakti Sankul workspace home">
                <motion.img
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.14 }}
                  src="/shaktiman-logo.png"
                  alt="Shaktiman Logo"
                  className="w-9 h-9 object-contain rounded-[11px] bg-white shadow-sm ring-1 ring-black/5 p-1"
                />
                <div className="flex min-w-0 flex-col">
                  <span className="whitespace-nowrap text-[14px] font-semibold tracking-[-0.01em] text-slate-900 leading-tight">
                    Shakti Sankul
                  </span>
                  <span className="whitespace-nowrap text-[11px] text-slate-500 font-medium leading-tight">
                    Seating Arrangement
                  </span>
                </div>
              </Link>

              <nav ref={desktopNavRef} className="navbar-center hidden xl:flex min-w-0 flex-1 justify-center" aria-label="Primary navigation">
                <div className="navbar-desktop-nav navbar-full-nav items-center gap-0.5 bg-black/[0.045] p-1 rounded-[13px]">
                  {navItems.map((item) => renderNavItem(item))}
                </div>
                <div className="navbar-desktop-nav navbar-compact-nav navbar-compact-nav-wide items-center gap-0.5 bg-black/[0.045] p-1 rounded-[13px]">
                  {compactWidePrimaryItems.map((item) => renderNavItem(item, 'compact'))}
                  {renderMoreMenu(compactWideItems)}
                </div>
                <div className="navbar-desktop-nav navbar-compact-nav navbar-compact-nav-narrow items-center gap-0.5 bg-black/[0.045] p-1 rounded-[13px]">
                  {compactPrimaryItems.map((item) => renderNavItem(item, 'compact'))}
                  {renderMoreMenu(compactItems)}
                </div>
              </nav>
            </div>

            <div className="navbar-right flex items-center gap-2.5 shrink-0">
              <div className="navbar-profile hidden md:flex min-w-0 items-center gap-2.5 text-right">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center text-xs font-semibold shadow-sm">
                  {(adminUser?.name || 'A').slice(0, 1).toUpperCase()}
                </div>
                <div className="navbar-profile-copy flex min-w-0 flex-col items-start">
                  <span className="navbar-profile-name max-w-40 text-xs font-semibold text-slate-900 leading-tight truncate" title={adminUser?.name || 'Administrator'}>
                    {adminUser?.name || 'Administrator'}
                  </span>
                  <span className="max-w-40 truncate text-[10px] text-slate-500 leading-tight" title={roleBadge.label}>{roleBadge.label}</span>
                </div>
              </div>

              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((current) => !current)}
                  className="relative flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-orange-50 hover:text-orange-600"
                  aria-label={unreadCount ? `Notifications (${unreadCount} unread)` : 'Notifications'}
                  aria-expanded={notificationsOpen}
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-rose-600 px-1 text-[9px] font-bold leading-4 text-white" aria-label={`${unreadCount} unread notifications`}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 top-12 z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl" role="dialog" aria-label="Notifications">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">Notifications</h2>
                        <p className="text-[10px] text-slate-500">Only notifications addressed to this account are shown.</p>
                      </div>
                      <button type="button" onClick={() => void markAllNotificationsRead()} className="text-[10px] font-semibold text-orange-600 hover:text-orange-800">
                        Mark all read
                      </button>
                    </div>
                    <div className="mt-2 max-h-80 space-y-1 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="px-2 py-5 text-center text-xs text-slate-500">No notifications</p>
                      ) : notifications.map((notification) => (
                        <button
                          type="button"
                          key={notification.id}
                          onClick={() => void markNotificationRead(notification)}
                          className={`w-full rounded-lg p-2 text-left transition-colors hover:bg-orange-50 ${notification.readAt ? 'bg-white' : 'bg-orange-50/70'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900">{notification.title}</span>
                            {!notification.readAt && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" aria-label="Unread" />}
                          </div>
                          <p className="mt-0.5 text-[11px] leading-4 text-slate-600">{notification.message}</p>
                          {notification.transferRequest?.requestNumber && <p className="mt-1 text-[10px] font-mono text-orange-700">{notification.transferRequest.requestNumber}</p>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={logout}
                className="hidden sm:flex items-center justify-center text-slate-500 hover:text-red-600 w-9 h-9 rounded-full hover:bg-red-50 transition-colors"
                title="Logout session"
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMobileOpen((value) => !value)}
                className="xl:hidden flex items-center justify-center w-11 h-11 rounded-full bg-black/[0.05] text-slate-700"
                aria-label="Open navigation menu"
                aria-expanded={mobileOpen}
                aria-controls="mobile-navigation"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
          {mobileOpen ? (
            <motion.nav
              id="mobile-navigation"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="xl:hidden ios-mobile-menu mb-3 max-h-[calc(100vh-5.5rem)] overflow-y-auto p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center text-xs font-semibold">
                    {(adminUser?.name || 'A').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{adminUser?.name || 'Administrator'}</div>
                    <div className="text-[11px] text-slate-500 truncate">{adminUser?.email}</div>
                  </div>
                </div>
                <button onClick={logout} className="flex min-h-11 shrink-0 items-center gap-2 px-3 py-2 rounded-[12px] text-sm font-medium text-red-600 hover:bg-red-50">
                  <LogOut className="w-4 h-4" /> Log out
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1" aria-label="More navigation">
                {navItems.slice(4).map((item) => {
                  const Icon = item.icon;
                  return <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-orange-50 hover:text-slate-950"><Icon className="h-4 w-4 text-slate-500" />{item.label}</Link>;
                })}
              </div>
            </motion.nav>
          ) : null}
        </div>
      </header>
      <nav className="ios-bottom-nav xl:hidden" aria-label="Primary navigation">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const shortLabel = item.label === 'Hierarchy & Workstations'
            ? 'Seats'
            : item.label === 'Transfer Requests'
              ? 'Transfers'
              : item.label === 'Audit Logs'
                ? 'Audit'
                : item.label === 'Employee Reconciliation'
                  ? 'Reconcile'
                  : item.label;
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={isActive ? 'page' : undefined}
              className={`ios-bottom-nav-item ${isActive ? 'is-active' : ''}`}
            >
              <Icon className="w-[19px] h-[19px]" strokeWidth={isActive ? 2.4 : 1.9} />
              <span>{shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};
