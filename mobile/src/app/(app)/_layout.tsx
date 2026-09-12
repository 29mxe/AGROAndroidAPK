import React from "react";
import { Tabs } from "expo-router";
import { Bell, CircleUserRound, Map, Sprout } from "lucide-react-native";
import { colors } from "@/lib/theme";
import { useUnreadCount } from "@/lib/queries";
import { useSession } from "@/lib/auth/use-session";

export default function AppLayout() {
  const { data: session } = useSession();
  const { data: unread } = useUnreadCount(!!session?.user);
  const unreadCount = unread?.count ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.forest,
        tabBarInactiveTintColor: colors.stone,
        tabBarStyle: {
          backgroundColor: colors.parchment,
          borderTopColor: colors.wheat,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontFamily: "GolosText_500Medium",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Поля рядом",
          tabBarButtonTestID: "tab-feed",
          tabBarIcon: ({ color }: { color: string }) => <Sprout size={23} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Карта",
          tabBarButtonTestID: "tab-map",
          tabBarIcon: ({ color }: { color: string }) => <Map size={23} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Уведомления",
          tabBarButtonTestID: "tab-notifications",
          tabBarIcon: ({ color }: { color: string }) => <Bell size={23} color={color} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.clay,
            color: colors.parchment,
            fontFamily: "GolosText_600SemiBold",
            fontSize: 11,
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Профиль",
          tabBarButtonTestID: "tab-profile",
          tabBarIcon: ({ color }: { color: string }) => <CircleUserRound size={23} color={color} />,
        }}
      />
    </Tabs>
  );
}
