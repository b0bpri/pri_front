<script setup>
import {
  Notivue,
  NotivueSwipe,
  Notification,
  NotificationProgress,
  push,
  useNotivue
} from 'notivue'

//Defines global configuration of notifications
const config = useNotivue()
config.update({
  position: 'top-right',
  limit: 4,
  enqueue: false,
  avoidDuplicates: false,
  notifications: {
    global: {
      duration: 3000
    }
  },
})



</script>

<template>
  <Notivue v-slot="item">
    <NotivueSwipe :item="item">
      <Notification :item="item" class="notification">
        <NotificationProgress :item="item"/>
      </Notification>
    </NotivueSwipe>
  </Notivue>

  <!-- RouterView, etc. -->
</template>

<script>
import {push} from "notivue";

export async function pushPromiseNotification(promise, promise_text, notification_text_success, notification_text_error) {
  const notification = push.promise(promise_text)
  try {
    await promise
    notification.success(notification_text_success)
  } catch (error) {
    notification.error(notification_text_error)
  }

}

export function pushNotification(notification_text, notification_type) {
  const valid_notification_types = {
    success: 'success',
    error: 'error',
    info: 'info',
    warning: 'warning'
  }
  const type = valid_notification_types[notification_type] || 'invalid'
  if (type === 'invalid') {
    throw new Error('Invalid notification type')
  }
  else{
    push[type](notification_text)
  }
}
</script>

<style scoped>
@import 'notivue/notifications.css';
@import 'notivue/animations.css';
.notification {
  --notivue-padding: 12px 16px;
  --notivue-spacing: 10px;
  --notivue-width: 350px;
  --notivue-border-radius: 8px;
  --notivue-font-size: 14px;
  --notivue-line-height: 1.4;
  --notivue-duration: 5000ms;
  margin-top: 60px;  /* This will push the notifications down */
  margin-left: 20px; /* This will push the notifications to the right */
}

.notification-content {
  padding: 8px 0;
}

.notification-message {
  color: #333;
  font-weight: 500;
}

.notification[data-type="success"] {
  background-color: #f0fdf4;
  border-left: 4px solid #10b981;
}

.notification[data-type="error"] {
  background-color: #fef2f2;
  border-left: 4px solid #ef4444;
}

.notification[data-type="warning"] {
  background-color: #fffbeb;
  border-left: 4px solid #f59e0b;
}

.notification[data-type="info"] {
  background-color: #eff6ff;
  border-left: 4px solid #3b82f6;
}
</style>