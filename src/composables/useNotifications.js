import { ref, computed } from 'vue';

// Shared state — same instance across all pages
const notifications = ref([
  {
    id: 1,
    type: 'Shift Cover Request',
    message: 'Alex Martinez needs someone for Tuesday 3PM-7PM',
    timestamp: '2 hours ago',
    action: 'Take it',
    priority: 'high',
    icon: 'mdi-calendar-check'
  },
  {
    id: 2,
    type: 'Urgent: Safety Alert',
    message: 'Manager: Please wear safety gear today - critical equipment malfunction risk',
    timestamp: '30 minutes ago',
    priority: 'high',
    icon: 'mdi-alert-circle'
  },
  {
    id: 3,
    type: 'Schedule Update',
    message: 'Your schedule for next week has been sent for approval',
    timestamp: '1 hour ago',
    priority: 'normal',
    icon: 'mdi-calendar-check'
  }
]);

const unreadCount = ref(3);

export function useNotifications() {
  const urgentNotifications = computed(() =>
    notifications.value.filter(n => n.priority === 'high')
  );

  const dismissNotification = (id) => {
    notifications.value = notifications.value.filter(n => n.id !== id);
    unreadCount.value = Math.max(0, unreadCount.value - 1);
  };

  const handleNotificationAction = (id) => {
    dismissNotification(id);
  };

  return {
    notifications,
    unreadCount,
    urgentNotifications,
    dismissNotification,
    handleNotificationAction
  };
}
