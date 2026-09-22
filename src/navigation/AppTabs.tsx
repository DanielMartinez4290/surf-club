import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { EventsScreen } from '../screens/events/EventsScreen';
import { MessagesScreen } from '../screens/messages/MessagesScreen';
import { colors } from '../theme';
import type { AppTabParamList } from './types';

const Tab = createBottomTabNavigator<AppTabParamList>();

const ICONS: Record<keyof AppTabParamList, keyof typeof Ionicons.glyphMap> = {
  Profile: 'person-outline',
  Events: 'boat-outline',
  Messages: 'chatbubble-outline',
};

export const AppTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.ocean,
      tabBarInactiveTintColor: colors.slate,
      tabBarIcon: ({ color, size }) => (
        <Ionicons name={ICONS[route.name as keyof AppTabParamList]} color={color} size={size} />
      ),
    })}
  >
    <Tab.Screen name="Profile" component={ProfileScreen} />
    <Tab.Screen name="Events" component={EventsScreen} />
    <Tab.Screen name="Messages" component={MessagesScreen} />
  </Tab.Navigator>
);
