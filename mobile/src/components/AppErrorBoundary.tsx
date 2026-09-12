import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { colors } from "@/lib/theme";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("AgroConnect render error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={{ flex: 1, backgroundColor: colors.field, padding: 24, justifyContent: "center" }}>
        <Text style={{ fontSize: 28, fontWeight: "700", color: colors.forest }}>AgroConnect</Text>
        <Text style={{ marginTop: 12, fontSize: 18, fontWeight: "600", color: colors.bark }}>
          Не удалось открыть этот экран
        </Text>
        <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: colors.stone }}>
          Приложение осталось открытым. Ниже показана диагностическая ошибка тестовой версии.
        </Text>
        <ScrollView
          style={{ maxHeight: 180, marginTop: 16, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 12 }}
        >
          <Text selectable style={{ fontSize: 12, color: colors.bark }}>
            {String(this.state.error?.message || this.state.error)}
          </Text>
        </ScrollView>
        <Pressable
          onPress={() => this.setState({ error: null })}
          style={{ marginTop: 18, backgroundColor: colors.forest, borderRadius: 16, paddingVertical: 13, alignItems: "center" }}
        >
          <Text style={{ color: colors.parchment, fontSize: 15, fontWeight: "600" }}>Попробовать снова</Text>
        </Pressable>
      </View>
    );
  }
}
