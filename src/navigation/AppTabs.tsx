import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { EventsScreen } from '../screens/events/EventsScreen';
import { MessagesScreen } from '../screens/messages/MessagesScreen';
import { colors } from '../theme';
import type { AppTabParamList } from './types';

const Tab = createBottomTabNavigator<AppTabParamList>();

// Outline icon when idle, filled when selected, so the current tab is obvious.
const ICONS: Record<keyof AppTabParamList, { idle: keyof typeof Ionicons.glyphMap; active: keyof typeof Ionicons.glyphMap }> = {
  Profile: { idle: 'person-outline', active: 'person' },
  Events: { idle: 'boat-outline', active: 'boat' },
  Messages: { idle: 'chatbubble-outline', active: 'chatbubble' },
};

export const AppTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.lake,
      tabBarInactiveTintColor: colors.slate,
      tabBarIcon: ({ color, size, focused }) => {
        const icons = ICONS[route.name as keyof AppTabParamList];
        return (
          <View style={[styles.iconPill, focused && styles.iconPillActive]}>
            <Ionicons name={focused ? icons.active : icons.idle} color={color} size={size} />
          </View>
        );
      },
      tabBarLabel: ({ color, focused, children }) => (
        <Text style={[styles.label, { color }, focused && styles.labelActive]}>{children}</Text>
      ),
    })}
  >
    <Tab.Screen name="Profile" component={ProfileScreen} />
    <Tab.Screen name="Events" component={EventsScreen} />
    <Tab.Screen name="Messages" component={MessagesScreen} />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  iconPill: { width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconPillActive: { backgroundColor: colors.lakeTint },
  label: { fontSize: 11, marginTop: 2 },
  labelActive: { fontWeight: '700' },
});
