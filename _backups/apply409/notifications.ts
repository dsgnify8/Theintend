import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { useAuth } from './auth';

// How notifications show while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowAlert: true,
  } as any),
});

export async function registerForPush(userId: string) {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    let status = (await Notifications.getPermissionsAsync()).status;
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return;

    const projectId = (Constants.expoConfig as any)?.extra?.eas?.projectId;
    const res = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const token = res?.data;
    if (!token) return;

    await supabase.from('push_tokens').upsert(
      { user_id: userId, token, platform: Platform.OS },
      { onConflict: 'token' },
    );
  } catch {
    /* ignore: notifications are best effort */
  }
}

// Registers the device whenever someone is signed in. Call once in the root layout.
export function usePushRegistration() {
  const { session } = useAuth();
  useEffect(() => {
    const uid = session?.user?.id;
    if (uid) registerForPush(uid);
  }, [session?.user?.id]);
}

// On-device scheduled reminders (no server needed).
export async function scheduleLocalReminder(id: string, title: string, body: string, date: Date) {
  try {
    if (!date || date.getTime() <= Date.now()) return;
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body, sound: 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  } catch {}
}

export async function cancelLocalReminder(id: string) {
  try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
}

// Sends a push to another user via our server function.
export async function sendPushToEmail(email: string, title: string, body: string, data?: Record<string, any>) {
  try {
    await supabase.functions.invoke('send-push', { body: { email, title, body, data: data ?? {} } });
  } catch {}
}

export async function sendPushTo(userId: string, title: string, body: string, data?: Record<string, any>) {
  try {
    await supabase.functions.invoke('send-push', { body: { userId, title, body, data: data ?? {} } });
  } catch {}
}
