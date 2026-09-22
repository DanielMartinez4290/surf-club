import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { apiRegisterPushToken } from '../api/user';
import { useAuth } from '../context/AuthContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Requests permission and registers this device's Expo push token with the
// backend once the user is signed in. No-ops silently if permission is denied.
export const useRegisterPushToken = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;

      try {
        const token = await Notifications.getExpoPushTokenAsync();
        await apiRegisterPushToken(token.data);
      } catch {
        // Push tokens aren't available in every environment (e.g. simulators) — ignore.
      }
    })();
  }, [user]);
};
