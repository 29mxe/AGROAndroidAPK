import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useFonts } from 'expo-font';
import { Alegreya_500Medium, Alegreya_700Bold } from '@expo-google-fonts/alegreya';
import {
  GolosText_400Regular,
  GolosText_500Medium,
  GolosText_600SemiBold,
  GolosText_700Bold,
} from '@expo-google-fonts/golos-text';
import { useSession } from '@/lib/auth/use-session';
import { useMyProfile } from '@/lib/queries';
import { colors } from '@/lib/theme';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';

export const unstable_settings = {
  initialRouteName: '(app)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

const appTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.field,
    card: colors.parchment,
    text: colors.bark,
    primary: colors.forest,
    border: colors.wheat,
  },
};

function RootLayoutNav() {
  const { data: session, isLoading: sessionLoading } = useSession();
  const isAuthed = !!session?.user;
  const { data: profile, isLoading: profileLoading } = useMyProfile(isAuthed);

  // If the profile request errors, still proceed (guards send the user to onboarding,
  // where React Query retries) — never leave the app stuck on the splash screen.
  const ready = !sessionLoading && (!isAuthed || !profileLoading);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) return null;

  const profileComplete = !!profile?.specialization;
  const guardApp: boolean = isAuthed && profileComplete;
  const guardOnboarding: boolean = isAuthed && !profileComplete;

  return (
    <ThemeProvider value={appTheme}>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.field } }}
      >
        <Stack.Protected guard={guardApp}>
          <Stack.Screen name="(app)" />
          <Stack.Screen
            name="create-post"
            options={{ presentation: 'modal', gestureEnabled: false }}
          />
          <Stack.Screen name="post/[id]" />
          <Stack.Screen name="user/[id]" />
          <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
        </Stack.Protected>

        <Stack.Protected guard={guardOnboarding}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>

        <Stack.Protected guard={!isAuthed}>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="verify-otp" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Alegreya_500Medium,
    Alegreya_700Bold,
    GolosText_400Regular,
    GolosText_500Medium,
    GolosText_600SemiBold,
    GolosText_700Bold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <StatusBar style="dark" />
          <AppErrorBoundary>
            <RootLayoutNav />
          </AppErrorBoundary>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
