import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import Utils from '../config/utils.js';
import EmployeeService from '../services/employeeServices.js';

export function useNotifications() {
  const router = useRouter();
  const notifications = ref([]);
  const loading = ref(false);
  const notifPrefs = ref({ shiftReminders: true, swapRequests: true, timeOffRequests: true, scheduleChanges: true });
  let refreshInterval = null;

  const unreadCount = computed(() =>
    notifications.value.filter(n => !n.read).length
  );

  const urgentNotifications = computed(() =>
    notifications.value.filter(n => n.urgent && !n.read)
  );

  const takenShifts = ref([]);

  const loadNotifications = async () => {
    const user = Utils.getStore('user');
    if (!user) return;

    const userId = user.user_id || user.userId;
    const items = [];

    try {
      const notifRes = await EmployeeService.getMyNotifications(userId);
      const notifs = Array.isArray(notifRes.data) ? notifRes.data : [];

      notifs.forEach(n => {
        items.push({
          id: `notif-${n.notification_id || n.id}`,
          rawId: n.notification_id || n.id,
          type: 'notification',
          category: n.type || 'System',
          title: n.title,
          message: n.description || n.title,
          icon: iconForType(n.type),
          color: '#4361EE',
          timestamp: formatTimestamp(n.createdAt || n.created_at),
          read: !!n.isRead || !!n.is_read,
          urgent: n.type === 'urgent',
          route: null,
          action: 'View',
        });
      });
    } catch (err) {
      console.warn('Could not load notifications:', err.message);
    }

    try {
      const swapRes = await EmployeeService.getMySwapRequests();
      const swaps = Array.isArray(swapRes.data) ? swapRes.data : [];
      const userId2 = Utils.getStore('user')?.user_id || Utils.getStore('user')?.userId;

      swaps
        .filter(s => s.status === 'pending' || s.status === 'accepted')
        .forEach(swap => {
          const isRequester = (swap.swapUser?.requestingUser?.id === userId2);
          items.push({
            id: `swap-${swap.swap_id || swap.id}`,
            rawId: swap.swap_id || swap.id,
            type: 'swap',
            category: 'Shift Swap',
            title: isRequester ? 'Your Swap Request' : 'Swap Request for You',
            message: isRequester
              ? `Your swap request is ${swap.status}`
              : `${swap.requestingUserName || 'Someone'} wants to swap a shift`,
            icon: 'mdi-swap-horizontal',
            color: '#f57c00',
            timestamp: formatTimestamp(swap.created_at || swap.createdAt),
            read: swap.status !== 'pending',
            urgent: false,
            route: 'employeeTimeRequests',
            action: 'View Swap',
          });
        });
    } catch (err) {
      console.warn('Could not load swap notifications:', err.message);
    }

    try {
      const toRes = await EmployeeService.getMyTimeOffRequests();
      const timeOffs = Array.isArray(toRes.data) ? toRes.data : [];
      const userId3 = Utils.getStore('user')?.user_id || Utils.getStore('user')?.userId;

      timeOffs
        .filter(t => {
          const tUserId = t.user_id || t.userId;
          return tUserId === userId3 && (t.status === 'pending' || t.status === 'approved' || t.status === 'denied');
        })
        .slice(0, 5) // show last 5
        .forEach(req => {
          if (req.status === 'pending') return; // only show resolved ones as notifications
          const start = new Date(Number(req.start_date || req.startDate)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          items.push({
            id: `timeoff-${req.request_id || req.id}`,
            rawId: req.request_id || req.id,
            type: 'timeoff',
            category: 'Time Off',
            title: `Time Off ${req.status === 'approved' ? 'Approved' : 'Denied'}`,
            message: `Your time off request starting ${start} was ${req.status}`,
            icon: req.status === 'approved' ? 'mdi-calendar-check' : 'mdi-calendar-remove',
            color: req.status === 'approved' ? '#2e7d32' : '#d32f2f',
            timestamp: formatTimestamp(req.approved_at || req.approvedAt || req.created_at),
            read: false,
            urgent: false,
            route: 'employeeTimeRequests',
            action: 'View Request',
          });
        });
    } catch (err) {
      console.warn('Could not load time off notifications:', err.message);
    }

    // Filter by notification preferences
    const prefs = notifPrefs.value;
    const filtered = items.filter(item => {
      if (item.type === 'swap' && !prefs.swapRequests) return false;
      if (item.type === 'timeoff' && !prefs.timeOffRequests) return false;
      if (item.type === 'notification') {
        const cat = (item.category || '').toLowerCase();
        if (cat.includes('swap') && !prefs.swapRequests) return false;
        if ((cat.includes('time') || cat.includes('off')) && !prefs.timeOffRequests) return false;
        if (cat.includes('schedule') && !prefs.scheduleChanges) return false;
        if (cat.includes('shift') && !cat.includes('swap') && !prefs.shiftReminders) return false;
      }
      return true;
    });

    notifications.value = filtered;
  };

  const dismissNotification = async (id) => {
    const notif = notifications.value.find(n => n.id === id);
    if (!notif) return;

    if (notif.type === 'notification' && notif.rawId) {
      try {
        await EmployeeService.markNotificationRead(notif.rawId);
      } catch (err) {
        console.warn('Could not mark notification read:', err.message);
      }
    }
    notifications.value = notifications.value.filter(n => n.id !== id);
  };

  const handleNotificationAction = (id) => {
    const notif = notifications.value.find(n => n.id === id);
    if (!notif) return;

    // Mark as read
    dismissNotification(id);

    // Redirect to appropriate page
    if (notif.route) {
      router.push({ name: notif.route });
    } else if (notif.type === 'swap') {
      router.push({ name: 'employeeTimeRequests' });
    } else if (notif.type === 'timeoff') {
      router.push({ name: 'employeeTimeRequests' });
    }
  };

  const iconForType = (type) => {
    if (!type) return 'mdi-bell';
    const t = type.toLowerCase();
    if (t.includes('swap')) return 'mdi-swap-horizontal';
    if (t.includes('schedule')) return 'mdi-calendar-check';
    if (t.includes('time') || t.includes('off')) return 'mdi-calendar-remove';
    if (t.includes('task')) return 'mdi-checkbox-marked-circle-outline';
    if (t.includes('urgent')) return 'mdi-alert-circle';
    return 'mdi-bell';
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const date = new Date(Number(ts));
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const reloadNotifPrefs = () => {
    const saved = localStorage.getItem('notificationPreferences');
    if (saved) {
      try { notifPrefs.value = { ...notifPrefs.value, ...JSON.parse(saved) }; } catch {}
    }
    loadNotifications();
  };

  onMounted(async () => {
    const saved = localStorage.getItem('notificationPreferences');
    if (saved) {
      try { notifPrefs.value = { ...notifPrefs.value, ...JSON.parse(saved) }; } catch {}
    }
    await loadNotifications();
    refreshInterval = setInterval(loadNotifications, 30000);
    window.addEventListener('notifications-updated', loadNotifications);
    window.addEventListener('notif-prefs-updated', reloadNotifPrefs);
  });

  onUnmounted(() => {
    if (refreshInterval) clearInterval(refreshInterval);
    window.removeEventListener('notifications-updated', loadNotifications);
    window.removeEventListener('notif-prefs-updated', reloadNotifPrefs);
  });

  return {
    notifications,
    unreadCount,
    urgentNotifications,
    takenShifts,
    loading,
    loadNotifications,
    dismissNotification,
    handleNotificationAction,
  };
}