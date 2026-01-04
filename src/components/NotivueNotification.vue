<script setup>
import {
  Notivue,
  NotivueSwipe,
  Notification,
  NotificationProgress,
  push,
  useNotivue
} from 'notivue'
import '../css/NotivueNotification.css';

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