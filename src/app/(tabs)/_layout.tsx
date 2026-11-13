import { useThemeMode } from '@/lib/theme-mode';
import { f, hairline } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  const { colors: c } = useThemeMode();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.mint700,
        tabBarInactiveTintColor: c.soft,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: c.paper,
          borderTopColor: c.line,
          borderTopWidth: hairline,
          paddingTop: 8,
          borderTopLeftRadius: 27,
          borderTopRightRadius: 27,
          shadowColor: c.mint200,
          shadowOpacity: 0.3
        },
        tabBarLabelStyle: {
          fontFamily: f.semibold,
          fontSize: 10,
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={focused ? c.mint700 : c.soft}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="jelajahi"
        options={{
          title: 'Jelajahi',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'compass' : 'compass-outline'}
              size={22}
              color={focused ? c.mint700 : c.soft}
            />
          ),
        }}
      />
      {/* <Tabs.Screen
        name="ulasan"
        options={{
          title: 'Ulasan',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              size={22}
              color={focused ? c.mint700 : c.soft}
            />
          ),
        }}
      /> */}
      <Tabs.Screen
        name="akun"
        options={{
          title: 'Tiketku',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'ticket' : 'ticket-outline'}
              size={22}
              color={focused ? c.mint700 : c.soft}
            />
          ),
        }}
      />
    </Tabs>
  );
}
