import { useEffect } from 'react';
import { Linking } from 'react-native';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { apiGetEvents } from '../api/events';
import type { RootStackParamList } from './types';

// Dev-only links for driving the app from the terminal (e.g. App Store screenshots):
//   xcrun simctl openurl booted surfclubatx://dev/profile   (also: events, messages, event, admin)
// "event" opens the first outing's details. Never registered in release builds.
export const useDevScreenLinks = (
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>,
  enabled: boolean
) => {
  useEffect(() => {
    if (!__DEV__ || !enabled) return;

    const handle = async ({ url }: { url: string }) => {
      const match = /^surfclubatx:\/\/dev\/(\w+)/.exec(url);
      if (!match || !navigationRef.isReady()) return;
      const target = match[1];

      if (target === 'profile' || target === 'events' || target === 'messages') {
        const tab = (target.charAt(0).toUpperCase() + target.slice(1)) as 'Profile' | 'Events' | 'Messages';
        navigationRef.navigate('Tabs', { screen: tab } as never);
      } else if (target === 'admin') {
        navigationRef.navigate('AdminDashboard');
      } else if (target === 'event') {
        const [first] = await apiGetEvents();
        if (first) navigationRef.navigate('EventSignup', { eventId: first.id });
      }
    };

    const sub = Linking.addEventListener('url', handle);
    return () => sub.remove();
  }, [navigationRef, enabled]);
};
