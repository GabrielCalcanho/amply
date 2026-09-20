import React, { useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { DrawerProvider } from '../contexts/DrawerContext';
import { lightColors } from '../constants/theme';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ChurchSetupScreen } from '../screens/auth/ChurchSetupScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SongsScreen } from '../screens/SongsScreen';
import { SongFormScreen } from '../screens/SongFormScreen';
import { SongDetailScreen } from '../screens/SongDetailScreen';
import { MaterialFormScreen } from '../screens/MaterialFormScreen';
import { ChordViewerScreen } from '../screens/ChordViewerScreen';
import { SetlistsScreen } from '../screens/SetlistsScreen';
import { SetlistFormScreen } from '../screens/SetlistFormScreen';
import { SetlistDetailScreen } from '../screens/SetlistDetailScreen';
import { SongPickerScreen } from '../screens/SongPickerScreen';
import { TeamScreen } from '../screens/TeamScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { MemberDetailScreen } from '../screens/MemberDetailScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { MinistryHomeScreen } from '../screens/ministry/MinistryHomeScreen';
import {
  TeamsScreen,
  RolesScreen,
  ClassificationsScreen,
} from '../screens/ministry/SimpleEntityListScreen';
import { OverviewScreen } from '../screens/menu/OverviewScreen';
import { AnnouncementsScreen } from '../screens/menu/AnnouncementsScreen';
import { UnavailabilityScreen } from '../screens/menu/UnavailabilityScreen';
import { ScaleOverviewScreen } from '../screens/menu/ScaleOverviewScreen';
import { BirthdaysMenuScreen } from '../screens/menu/BirthdaysMenuScreen';
import { MetronomeScreen } from '../screens/menu/MetronomeScreen';
import { PlansScreen } from '../screens/menu/PlansScreen';
import { SettingsScreen } from '../screens/menu/SettingsScreen';

const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

/** Navegação principal: Início · Músicas · Setlists · Perfil */
function MainTabs() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const bottomPad =
    Platform.OS === 'ios'
      ? Math.max(insets.bottom, 8)
      : Math.max(insets.bottom, 4);
  const barHeight = 52 + bottomPad;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: barHeight,
          paddingBottom: bottomPad,
          paddingTop: 6,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 0,
          marginBottom: 0,
        },
        tabBarIconStyle: { marginTop: 0 },
        tabBarItemStyle: { paddingVertical: 0 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Início',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Songs"
        component={SongsScreen}
        options={{
          tabBarLabel: 'Músicas',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'musical-notes' : 'musical-notes-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Setlists"
        component={SetlistsScreen}
        options={{
          tabBarLabel: 'Setlists',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'list' : 'list-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function MainNavigator() {
  return (
    <DrawerProvider>
      <MainStack.Navigator screenOptions={{ headerShown: false }}>
        <MainStack.Screen name="Tabs" component={MainTabs} />
        <MainStack.Screen name="SongForm" component={SongFormScreen} />
        <MainStack.Screen name="SongDetail" component={SongDetailScreen} />
        <MainStack.Screen name="MaterialForm" component={MaterialFormScreen} />
        <MainStack.Screen name="ChordViewer" component={ChordViewerScreen} />
        <MainStack.Screen name="SetlistForm" component={SetlistFormScreen} />
        <MainStack.Screen name="SetlistDetail" component={SetlistDetailScreen} />
        <MainStack.Screen name="SongPicker" component={SongPickerScreen} />
        <MainStack.Screen name="Calendar" component={CalendarScreen} />
        <MainStack.Screen name="Notifications" component={NotificationsScreen} />
        <MainStack.Screen name="MemberDetail" component={MemberDetailScreen} />
        <MainStack.Screen name="Team" component={TeamScreen} />
        <MainStack.Screen name="Messages" component={MessagesScreen} />
        <MainStack.Screen name="Ministry" component={MinistryHomeScreen} />
        <MainStack.Screen name="Overview" component={OverviewScreen} />
        <MainStack.Screen name="Announcements" component={AnnouncementsScreen} />
        <MainStack.Screen name="Unavailability" component={UnavailabilityScreen} />
        <MainStack.Screen name="ScaleOverview" component={ScaleOverviewScreen} />
        <MainStack.Screen name="Birthdays" component={BirthdaysMenuScreen} />
        <MainStack.Screen name="Metronome" component={MetronomeScreen} />
        <MainStack.Screen name="Plans" component={PlansScreen} />
        <MainStack.Screen name="Settings" component={SettingsScreen} />
        <MainStack.Screen name="Teams" component={TeamsScreen} />
        <MainStack.Screen name="Roles" component={RolesScreen} />
        <MainStack.Screen name="Classifications" component={ClassificationsScreen} />
      </MainStack.Navigator>
    </DrawerProvider>
  );
}

export function RootNavigator() {
  const { session, church, initializing } = useAuth();
  const { colors } = useTheme();

  if (initializing) {
    return (
      <View
        style={[
          styles.loading,
          { backgroundColor: colors?.background ?? lightColors.background },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors?.primary ?? lightColors.primary}
        />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!session ? (
        <AuthNavigator />
      ) : !church ? (
        <ChurchSetupScreen />
      ) : (
        <MainNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
