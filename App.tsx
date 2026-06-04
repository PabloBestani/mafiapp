import { ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";

import { roleCallOrder, roleDefinitions } from "./src/data/roles";
import { evaluateVictory } from "./src/domain/victory";

const previewPlayers = [
  { id: "pablo", name: "Pablo", roleId: "mafioso", alive: true, seatIndex: 0 },
  { id: "sofi", name: "Sofi", roleId: "prostituta", alive: true, seatIndex: 1 },
  { id: "juan", name: "Juan", roleId: "civil", alive: true, seatIndex: 2 }
] as const;

export default function App() {
  const result = evaluateVictory(previewPlayers);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>MafiApp V1</Text>
          <Text style={styles.title}>Copiloto offline para Dios</Text>
          <Text style={styles.subtitle}>
            Base Expo lista. Motor de reglas desacoplado y testeable.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Estado del motor</Text>
          <Text style={styles.body}>Resultado de prueba: {result}</Text>
          <Text style={styles.body}>Roles soportados: {roleCallOrder.length}</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Roles V1</Text>
          {roleCallOrder.map((roleId) => {
            const role = roleDefinitions[roleId];

            return (
              <View key={role.id} style={styles.roleRow}>
                <View>
                  <Text style={styles.roleName}>{role.name}</Text>
                  <Text style={styles.roleMeta}>
                    {role.team} · max {role.maxCopies}
                  </Text>
                </View>
                <Text style={styles.badge}>
                  {role.strictMafia ? "Mafioso" : "No mafioso"}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#111315"
  },
  content: {
    gap: 16,
    padding: 20,
    paddingTop: 64
  },
  header: {
    gap: 8
  },
  eyebrow: {
    color: "#88d498",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  title: {
    color: "#f7f2e8",
    fontSize: 28,
    fontWeight: "800"
  },
  subtitle: {
    color: "#b9c0c7",
    fontSize: 16,
    lineHeight: 22
  },
  panel: {
    backgroundColor: "#1b2025",
    borderColor: "#2e363d",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16
  },
  panelTitle: {
    color: "#f7f2e8",
    fontSize: 18,
    fontWeight: "700"
  },
  body: {
    color: "#cdd3d8",
    fontSize: 15
  },
  roleRow: {
    alignItems: "center",
    borderTopColor: "#2e363d",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56,
    paddingTop: 12
  },
  roleName: {
    color: "#f7f2e8",
    fontSize: 15,
    fontWeight: "700"
  },
  roleMeta: {
    color: "#9ba4ad",
    fontSize: 13,
    marginTop: 2
  },
  badge: {
    backgroundColor: "#26312d",
    borderRadius: 6,
    color: "#88d498",
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5
  }
});
