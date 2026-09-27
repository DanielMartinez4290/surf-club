import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthNavigator } from './AuthNavigator';
import { AppTabs } from './AppTabs';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { CreateEventScreen } from '../screens/events/CreateEventScreen';
import { EditEventScreen } from '../screens/events/EditEventScreen';
import { EventSignupScreen } from '../screens/events/EventSignupScreen';
import { ChatScreen } from '../screens/messages/ChatScreen';
import { GroupChatScreen } from '../screens/messages/GroupChatScreen';
import { ChatHeaderTitle } from '../screens/messages/ChatHeaderTitle';
import { UserProfileScreen } from '../screens/profile/UserProfileScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { useAuth } from '../context/AuthContext';
import { useRegisterPushToken } from '../hooks/useRegisterPushToken';
import { useDevScreenLinks } from './useDevScreenLinks';
import { colors } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const RootNavigator = () => {
  const { isLoading, user } = useAuth();
  useRegisterPushToken();
  useDevScreenLinks(navigationRef, !!user);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sand }}>
        <ActivityIndicator size="large" color={colors.ocean} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {user ? (
        // 'minimal' shows just the back arrow instead of the previous screen's name (e.g. "Tabs")
        <Stack.Navigator screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
          <Stack.Screen name="Tabs" component={AppTabs} options={{ headerShown: false }} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CreateEvent" component={CreateEventScreen} options={{ headerShown: false }} />
          <Stack.Screen name="EditEvent" component={EditEventScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="EventSignup"
            component={EventSignupScreen}
            options={{ title: '' }}
          />
          <Stack.Screen
            name="UserProfile"
            component={UserProfileScreen}
            options={({ route }) => ({ title: route.params.firstName })}
          />
          <Stack.Screen name="Chat" component={ChatScreen} options={({ route }) => ({ title: route.params.name })} />
          <Stack.Screen
            name="GroupChat"
            component={GroupChatScreen}
            options={({ route }) => ({
              title: route.params.title,
              headerTitle: () => <ChatHeaderTitle title={route.params.title} image={route.params.image} />,
            })}
          />
          <Stack.Screen
            name="AdminDashboard"
            component={AdminDashboardScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};
