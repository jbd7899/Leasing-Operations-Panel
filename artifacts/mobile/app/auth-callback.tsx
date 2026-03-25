import * as WebBrowser from "expo-web-browser";
import { Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

WebBrowser.maybeCompleteAuthSession();

export default function AuthCallbackScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#14A0A0" />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#080E1C",
  },
});
