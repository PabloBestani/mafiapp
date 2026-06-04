import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import type { PlayerState, RoleId } from "../domain/types";
import { roleDefinitions } from "../data/roles";
import { theme } from "./theme/tokens";

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

interface ScreenProps {
  children: ReactNode;
}

export function Screen({ children }: ScreenProps) {
  return <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>{children}</SafeAreaView>;
}

interface AppScrollProps {
  children: ReactNode;
  bottomPadding?: number;
}

export function AppScroll({ children, bottomPadding = 104 }: AppScrollProps) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
    >
      {children}
    </ScrollView>
  );
}

interface CardProps {
  children: ReactNode;
  variant?: "default" | "muted" | "danger";
}

export function Card({ children, variant = "default" }: CardProps) {
  return <View style={[styles.card, styles[`card_${variant}`]]}>{children}</View>;
}

interface TextBlockProps {
  title?: string;
  eyebrow?: string;
  children?: ReactNode;
}

export function TextBlock({ title, eyebrow, children }: TextBlockProps) {
  return (
    <View style={styles.textBlock}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children ? <Text style={styles.body}>{children}</Text> : null}
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
}

export function Button({
  label,
  onPress,
  icon,
  variant = "secondary",
  disabled = false
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        disabled ? styles.button_disabled : null,
        pressed && !disabled ? styles.button_pressed : null
      ]}
    >
      {icon ? (
        <MaterialCommunityIcons
          color={buttonTextColor(variant, disabled)}
          name={icon}
          size={20}
        />
      ) : null}
      <Text style={[styles.buttonText, { color: buttonTextColor(variant, disabled) }]}>
        {label}
      </Text>
    </Pressable>
  );
}

interface IconButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}

export function IconButton({
  icon,
  label,
  onPress,
  active = false,
  disabled = false
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        active ? styles.iconButton_active : null,
        disabled ? styles.iconButton_disabled : null,
        pressed && !disabled ? styles.button_pressed : null
      ]}
    >
      <MaterialCommunityIcons
        color={disabled ? theme.colors.textDim : active ? theme.colors.text : theme.colors.textMuted}
        name={icon}
        size={22}
      />
    </Pressable>
  );
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected ? styles.segment_selected : null]}
          >
            <Text style={[styles.segmentText, selected ? styles.segmentText_selected : null]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface PlayerChipProps {
  player: Pick<PlayerState, "id" | "name" | "alive" | "roleId">;
  selected?: boolean;
  disabled?: boolean;
  disabledReason?: string | null;
  showSecrets?: boolean;
  onPress?: () => void;
  onDisabledPress?: (reason: string) => void;
}

export function PlayerChip({
  player,
  selected = false,
  disabled = false,
  disabledReason = null,
  showSecrets = false,
  onPress,
  onDisabledPress
}: PlayerChipProps) {
  const roleName = player.roleId ? roleDefinitions[player.roleId].name : "Sin rol";
  const pressable = disabled ? Boolean(disabledReason && onDisabledPress) : Boolean(onPress);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${player.name}${showSecrets ? `, ${roleName}` : ""}`}
      accessibilityState={{ selected, disabled }}
      disabled={!pressable}
      onPress={() => {
        if (disabled) {
          if (disabledReason) {
            onDisabledPress?.(disabledReason);
          }
          return;
        }

        onPress?.();
      }}
      style={({ pressed }) => [
        styles.playerChip,
        selected ? styles.playerChip_selected : null,
        !player.alive ? styles.playerChip_dead : null,
        disabled ? styles.playerChip_disabled : null,
        pressed && !disabled ? styles.button_pressed : null
      ]}
    >
      <Text style={styles.playerChipName} numberOfLines={1}>
        {player.name}
      </Text>
      {showSecrets ? (
        <Text style={styles.playerChipMeta} numberOfLines={1}>
          {roleName}
        </Text>
      ) : null}
    </Pressable>
  );
}

interface PlayerCardProps {
  player: PlayerState;
  showSecrets?: boolean;
}

export function PlayerCard({ player, showSecrets = false }: PlayerCardProps) {
  return (
    <View style={[styles.playerCard, !player.alive ? styles.playerCard_dead : null]}>
      <View style={styles.playerCardMain}>
        <Text style={styles.playerName}>{player.name}</Text>
        <Text style={styles.meta}>Asiento {player.seatIndex + 1}</Text>
      </View>
      <View style={styles.badgeRow}>
        <Badge tone={player.alive ? "success" : "muted"}>
          {player.alive ? "Vivo" : "Muerto"}
        </Badge>
        {showSecrets && player.roleId ? (
          <Badge tone={roleDefinitions[player.roleId].team === "mafia" ? "danger" : "info"}>
            {roleDefinitions[player.roleId].name}
          </Badge>
        ) : null}
      </View>
    </View>
  );
}

interface BadgeProps {
  children: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info" | "muted";
}

export function Badge({ children, tone = "default" }: BadgeProps) {
  return (
    <Text style={[styles.badge, styles[`badge_${tone}`]]} numberOfLines={1}>
      {children}
    </Text>
  );
}

interface PhaseHeaderProps {
  title: string;
  meta: string;
  showSecrets: boolean;
  canUndo: boolean;
  showSecretToggle?: boolean;
  onToggleSecrets: () => void;
  onUndo: () => void;
  onLogs: () => void;
  onHome: () => void;
}

export function PhaseHeader({
  title,
  meta,
  showSecrets,
  canUndo,
  showSecretToggle = true,
  onToggleSecrets,
  onUndo,
  onLogs,
  onHome
}: PhaseHeaderProps) {
  return (
    <View style={styles.phaseHeader}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver a Home" onPress={onHome}>
        <MaterialCommunityIcons color={theme.colors.textMuted} name="chevron-left" size={28} />
      </Pressable>
      <Image resizeMode="contain" source={theme.assets.wordmark} style={styles.headerWordmark} />
      <View style={styles.phaseTitleWrap}>
        <Text style={styles.phaseTitle}>{title}</Text>
        <Text style={styles.phaseMeta}>{meta}</Text>
      </View>
      {showSecretToggle ? (
        <IconButton
          active={showSecrets}
          icon={showSecrets ? "eye-off-outline" : "eye-outline"}
          label={showSecrets ? "Ocultar secretos" : "Mostrar secretos"}
          onPress={onToggleSecrets}
        />
      ) : null}
      <IconButton
        disabled={!canUndo}
        icon="undo-variant"
        label="Deshacer"
        onPress={onUndo}
      />
      <IconButton icon="text-box-outline" label="Abrir logs" onPress={onLogs} />
    </View>
  );
}

interface BottomActionBarProps {
  primary?: ButtonProps;
  secondary?: ButtonProps;
}

export function BottomActionBar({ primary, secondary }: BottomActionBarProps) {
  const insets = useSafeAreaInsets();

  if (!primary && !secondary) {
    return null;
  }

  return (
    <View style={[styles.bottomBar, { paddingBottom: Math.max(theme.spacing.md, insets.bottom) }]}>
      {secondary ? <Button {...secondary} /> : null}
      {primary ? <Button {...primary} variant={primary.variant ?? "primary"} /> : null}
    </View>
  );
}

interface HintToastProps {
  message: string | null;
}

export function HintToast({ message }: HintToastProps) {
  if (!message) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.hintToast}>
      <Text style={styles.hintToastText}>{message}</Text>
    </View>
  );
}

interface LogPanelProps {
  privateLog: string[];
  publicLog: string[];
}

export function LogPanel({ privateLog, publicLog }: LogPanelProps) {
  return (
    <View style={styles.logGrid}>
      <Card>
        <Text style={styles.sectionTitle}>Privado</Text>
        {privateLog.length === 0 ? (
          <Text style={styles.meta}>Sin eventos todavía.</Text>
        ) : (
          privateLog.map((line, index) => (
            <Text key={`${line}-${index}`} style={styles.logLine}>
              {line}
            </Text>
          ))
        )}
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Público</Text>
        {publicLog.length === 0 ? (
          <Text style={styles.meta}>Sin narración pública.</Text>
        ) : (
          publicLog.map((line, index) => (
            <Text key={`${line}-${index}`} style={styles.logLine}>
              {line}
            </Text>
          ))
        )}
      </Card>
    </View>
  );
}

export function BrandMark() {
  return <Image resizeMode="cover" source={theme.assets.cardBack} style={styles.brandMark} />;
}

function buttonTextColor(variant: NonNullable<ButtonProps["variant"]>, disabled: boolean) {
  if (disabled) {
    return theme.colors.textDim;
  }

  return variant === "primary" || variant === "danger" ? theme.colors.text : theme.colors.textMuted;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: theme.colors.bg,
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    gap: theme.spacing.md,
    padding: theme.layout.screenPadding,
    paddingTop: theme.spacing.md
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md
  },
  card_default: {},
  card_muted: {
    backgroundColor: theme.colors.bgRaised
  },
  card_danger: {
    borderColor: theme.colors.danger
  },
  textBlock: {
    gap: theme.spacing.xs
  },
  eyebrow: {
    ...theme.typography.meta,
    color: theme.colors.sage,
    textTransform: "uppercase"
  },
  title: {
    ...theme.typography.display,
    color: theme.colors.text
  },
  body: {
    ...theme.typography.body,
    color: theme.colors.textMuted
  },
  button: {
    alignItems: "center",
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: theme.spacing.xs,
    justifyContent: "center",
    minHeight: theme.layout.touchTarget,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  button_primary: {
    backgroundColor: theme.colors.brandRed
  },
  button_secondary: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.border,
    borderWidth: 1
  },
  button_ghost: {
    backgroundColor: "transparent"
  },
  button_danger: {
    backgroundColor: theme.colors.danger
  },
  button_disabled: {
    opacity: 0.45
  },
  button_pressed: {
    opacity: 0.72
  },
  buttonText: {
    ...theme.typography.label
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    height: theme.layout.touchTarget,
    justifyContent: "center",
    width: theme.layout.touchTarget
  },
  iconButton_active: {
    borderColor: theme.colors.sage
  },
  iconButton_disabled: {
    opacity: 0.4
  },
  segmented: {
    backgroundColor: theme.colors.bgRaised,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    padding: theme.spacing.xxs
  },
  segment: {
    alignItems: "center",
    borderRadius: theme.radius.sm,
    flex: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xs
  },
  segment_selected: {
    backgroundColor: theme.colors.surfaceAlt
  },
  segmentText: {
    ...theme.typography.meta,
    color: theme.colors.textMuted
  },
  segmentText_selected: {
    color: theme.colors.text
  },
  playerChip: {
    backgroundColor: theme.colors.bgRaised,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    minHeight: theme.layout.touchTarget,
    minWidth: 96,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs
  },
  playerChip_selected: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.sage
  },
  playerChip_dead: {
    opacity: 0.45
  },
  playerChip_disabled: {
    opacity: 0.35
  },
  playerChipName: {
    ...theme.typography.label,
    color: theme.colors.text
  },
  playerChipMeta: {
    ...theme.typography.meta,
    color: theme.colors.textDim
  },
  playerCard: {
    alignItems: "center",
    backgroundColor: theme.colors.bgRaised,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
    minHeight: 64,
    padding: theme.spacing.sm
  },
  playerCard_dead: {
    opacity: 0.55
  },
  playerCardMain: {
    flex: 1,
    minWidth: 0
  },
  playerName: {
    ...theme.typography.label,
    color: theme.colors.text
  },
  meta: {
    ...theme.typography.meta,
    color: theme.colors.textDim
  },
  badgeRow: {
    alignItems: "flex-end",
    gap: theme.spacing.xs
  },
  badge: {
    ...theme.typography.meta,
    borderRadius: theme.radius.sm,
    overflow: "hidden",
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xxs
  },
  badge_default: {
    backgroundColor: theme.colors.surfaceAlt,
    color: theme.colors.textMuted
  },
  badge_success: {
    backgroundColor: "#21301F",
    color: theme.colors.success
  },
  badge_warning: {
    backgroundColor: "#332A1A",
    color: theme.colors.warning
  },
  badge_danger: {
    backgroundColor: theme.colors.brandRedDark,
    color: theme.colors.brandRedSoft
  },
  badge_info: {
    backgroundColor: "#1A2830",
    color: theme.colors.info
  },
  badge_muted: {
    backgroundColor: theme.colors.bgRaised,
    color: theme.colors.textDim
  },
  phaseHeader: {
    alignItems: "center",
    backgroundColor: theme.colors.bgRaised,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.xs,
    minHeight: 64,
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.sm
  },
  headerWordmark: {
    height: 34,
    width: 72
  },
  phaseTitleWrap: {
    flex: 1,
    minWidth: 0
  },
  phaseTitle: {
    ...theme.typography.section,
    color: theme.colors.text
  },
  phaseMeta: {
    ...theme.typography.meta,
    color: theme.colors.textDim
  },
  bottomBar: {
    backgroundColor: theme.colors.bgRaised,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    gap: theme.spacing.sm,
    left: 0,
    minHeight: theme.layout.bottomBarMinHeight,
    padding: theme.spacing.md,
    position: "absolute",
    right: 0
  },
  hintToast: {
    alignSelf: "center",
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    bottom: theme.layout.bottomBarMinHeight + theme.spacing.md,
    maxWidth: "86%",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    position: "absolute"
  },
  hintToastText: {
    ...theme.typography.label,
    color: theme.colors.text
  },
  logGrid: {
    gap: theme.spacing.md
  },
  sectionTitle: {
    ...theme.typography.section,
    color: theme.colors.text
  },
  logLine: {
    ...theme.typography.body,
    color: theme.colors.textMuted
  },
  brandMark: {
    alignSelf: "center",
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    height: 172,
    width: 116
  }
});
