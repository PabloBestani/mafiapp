import { SafeAreaProvider } from "react-native-safe-area-context";

import { MafiApp } from "./src/ui/MafiApp";

export default function App() {
  return (
    <SafeAreaProvider>
      <MafiApp />
    </SafeAreaProvider>
  );
}
