import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { Wheat } from 'lucide-react-native';
import { colors } from '@/lib/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Не найдено' }} />
      <View testID="not-found-screen" className="flex-1 items-center justify-center bg-field p-6">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-wheat">
          <Wheat size={28} color={colors.moss} />
        </View>
        <Text className="mt-4 font-gsemibold text-xl text-bark">Такой страницы нет</Text>
        <Link href="/" testID="go-home-link" className="mt-4 py-3">
          <Text className="font-gsemibold text-base text-moss">Вернуться в ленту</Text>
        </Link>
      </View>
    </>
  );
}
