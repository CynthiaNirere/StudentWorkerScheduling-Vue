import { ref, computed } from 'vue';

// Shared state — same instance across all pages
const notifications = ref([
  {
    id: 1,
    type: 'Shift Cover Request',
    message: 'Alex Martinez needs someone for Tuesday 3PM–7PM',
    timestamp: '2 hours ago',
    action: 'Take it',
    priority: 'high',
    icon: 'mdi-calendar-check',
    shiftData: { day: 'TUE', time: '3PM–7PM' }
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
const takenShifts = ref([]); // shifts added to calendar via "Take it"

export function useNotifications() {
  const urgentNotifications = computed(() =>
    notifications.value.filter(n => n.priority === 'high')
  );

  const dismissNotification = (id) => {
    notifications.value = notifications.value.filter(n => n.id !== id);
    unreadCount.value = Math.max(0, unreadCount.value - 1);
  };

  const handleNotificationAction = (id) => {
    const notif = notifications.value.find(n => n.id === id);
    if (notif?.shiftData) {
      takenShifts.value.push(notif.shiftData);
    }
    dismissNotification(id);
  };

  return {
    notifications,
    unreadCount,
    urgentNotifications,
    takenShifts,
    dismissNotification,
    handleNotificationAction
  };
}
