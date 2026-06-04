import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { roleDefinitions, validateDeckConfiguration } from "../data/roles";
import type { NightActions, NightResolution } from "../domain/night";
import { resolveNight } from "../domain/night";
import type { GameState, PlayerId, PlayerProfile, RoleId } from "../domain/types";
import { GameAutosaveService } from "../services/autosave";
import { openMafiappDatabase } from "../storage/expoSqliteDriver";
import { SQLiteGameRepository } from "../storage/sqliteGameRepository";
import { SQLitePlayerRepository } from "../storage/playerRepository";
import {
  AppScroll,
  Badge,
  BottomActionBar,
  BrandMark,
  Button,
  Card,
  LogPanel,
  PhaseHeader,
  Screen,
  PlayerCard,
  PlayerChip,
  SegmentedControl,
  TextBlock
} from "./components";
import {
  addPrivateNote,
  applyConfirmedLynch,
  applyDefense,
  applyLynch,
  applyNightResolution,
  assignRole,
  buildFirstNightSteps,
  buildNightActionSteps,
  canInferCivilians,
  canStartGame,
  castCurrentVote,
  completeDraftWithCivilians,
  correctPlayerRole,
  createDraftFromGame,
  createEmptyDraft,
  createGameFromDraft,
  createVotingSession,
  getVotingOutcome as getSessionOutcome,
  inferCivilianRoles,
  movePlayerSeat,
  moveSeat,
  rerollVotingSession,
  resetVoteChangeCycle,
  setRoleCount,
  togglePlayerAlive,
  setupRoleOrder,
  toggleSelectedPlayer,
  type NewGameDraft,
  type VotingSession
} from "./game/flow";
import { theme } from "./theme/tokens";

type ScreenName = "home" | "players" | "setup" | "game" | "logs" | "corrections";
type SetupStep = "players" | "seating" | "cards" | "deal";
type GameTab = "focus" | "roster" | "logs";

interface StorageServices {
  players: SQLitePlayerRepository;
  autosave: GameAutosaveService;
}

const setupSteps: Array<{ value: SetupStep; label: string }> = [
  { value: "players", label: "Jugadores" },
  { value: "seating", label: "Mesa" },
  { value: "cards", label: "Cartas" },
  { value: "deal", label: "Reparto" }
];

const gameTabs: Array<{ value: GameTab; label: string }> = [
  { value: "focus", label: "Flujo" },
  { value: "roster", label: "Mesa" },
  { value: "logs", label: "Logs" }
];

export function MafiApp() {
  const [screen, setScreen] = useState<ScreenName>("home");
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [game, setGame] = useState<GameState | null>(null);
  const [storage, setStorage] = useState<StorageServices | null>(null);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [editingPlayerId, setEditingPlayerId] = useState<PlayerId | null>(null);
  const [editingName, setEditingName] = useState("");
  const [draft, setDraft] = useState<NewGameDraft>(() => createEmptyDraft());
  const [setupStep, setSetupStep] = useState<SetupStep>("players");
  const [roleSelections, setRoleSelections] = useState<Partial<Record<RoleId, PlayerId[]>>>({});
  const [showSecrets, setShowSecrets] = useState(false);
  const [gameTab, setGameTab] = useState<GameTab>("focus");
  const [firstNightIndex, setFirstNightIndex] = useState(0);
  const [nightActionIndex, setNightActionIndex] = useState(0);
  const [nightActions, setNightActions] = useState<NightActions>({});
  const [nightPreview, setNightPreview] = useState<NightResolution | null>(null);
  const [pendingNightPoisonTarget, setPendingNightPoisonTarget] = useState<PlayerId | null>(null);
  const [votingSession, setVotingSession] = useState<VotingSession | null>(null);
  const [lynchTargetId, setLynchTargetId] = useState<PlayerId | null>(null);
  const [dayPoisonTargetId, setDayPoisonTargetId] = useState<PlayerId | null>(null);
  const [correctionPlayerId, setCorrectionPlayerId] = useState<PlayerId | null>(null);
  const [correctionNote, setCorrectionNote] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const database = await openMafiappDatabase();
        const playerRepository = new SQLitePlayerRepository(database);
        const gameRepository = new SQLiteGameRepository(database);
        const autosave = new GameAutosaveService(gameRepository);
        const [storedPlayers, currentGame, lastSetup] = await Promise.all([
          playerRepository.listPlayers(),
          autosave.resumeCurrentGame(),
          autosave.loadLastGameSetup()
        ]);

        if (cancelled) {
          return;
        }

        setStorage({ players: playerRepository, autosave });
        setPlayers(storedPlayers);
        setGame(currentGame);

        if (lastSetup) {
          setDraft({
            selectedPlayerIds: lastSetup.activePlayerIds,
            seatingOrder: lastSetup.seatingOrder,
            deck: lastSetup.deck
          });
        }
      } catch (error) {
        if (!cancelled) {
          setStorageError(error instanceof Error ? error.message : "No se pudo abrir SQLite.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPlayers = useMemo(
    () => players.filter((player) => draft.selectedPlayerIds.includes(player.id)),
    [draft.selectedPlayerIds, players]
  );

  const privateLogLines = game?.privateLog.map((entry) => entry.message) ?? [];
  const publicLogLines = game?.publicLog ?? [];

  async function addPlayer(kind: PlayerProfile["kind"]) {
    const name = playerName.trim();

    if (!name) {
      return;
    }

    const now = currentTime();
    const player: PlayerProfile = {
      id: createId("player"),
      name,
      kind,
      createdAt: now,
      updatedAt: now
    };

    setPlayers((current) => [...current, player].sort(comparePlayers));
    setPlayerName("");
    await storage?.players.savePlayer(player);
  }

  async function savePlayerName(playerId: PlayerId) {
    const name = editingName.trim();

    if (!name) {
      return;
    }

    setPlayers((current) =>
      current
        .map((player) =>
          player.id === playerId
            ? { ...player, name, updatedAt: currentTime() }
            : player
        )
        .sort(comparePlayers)
    );
    setEditingPlayerId(null);
    setEditingName("");
    await storage?.players.renamePlayer(playerId, name);
  }

  async function deletePlayer(playerId: PlayerId) {
    setPlayers((current) => current.filter((player) => player.id !== playerId));
    setDraft((current) => ({
      ...current,
      selectedPlayerIds: current.selectedPlayerIds.filter((id) => id !== playerId),
      seatingOrder: current.seatingOrder.filter((id) => id !== playerId)
    }));
    await storage?.players.deletePlayer(playerId);
  }

  function startNewGame() {
    setDraft((current) => sanitizeDraft(current, players));
    setSetupStep("players");
    setScreen("setup");
  }

  async function createGame() {
    const nextGame = createGameFromDraft(createId("game"), players, draft, currentTime);
    setGame(nextGame);
    setScreen("game");
    setSetupStep("players");
    await storage?.autosave.saveCurrentGame(nextGame);
  }

  async function commitGame(
    nextGame: GameState,
    previousGame: GameState | null,
    reason: string,
    strongCheckpoint = false
  ) {
    setGame(nextGame);

    if (storage) {
      await storage.autosave.saveCurrentGame(nextGame, previousGame ? {
        previousGame,
        reason,
        strongCheckpoint
      } : undefined);
    }
  }

  async function commitCorrection(
    nextGame: GameState,
    previousGame: GameState,
    reason: string
  ) {
    resetGameFlowUi();
    await commitGame(nextGame, previousGame, reason, true);
  }

  async function undoGame() {
    if (!game || !storage) {
      return;
    }

    const previous = await storage.autosave.undoLastAction(game.id);

    if (previous) {
      setGame(previous);
      resetGameFlowUi();
    }
  }

  async function cancelCurrentGame() {
    if (!game) {
      return;
    }

    const nextGame: GameState = {
      ...game,
      status: "GAME_OVER",
      result: "CANCELADA"
    };

    await commitGame(nextGame, game, "cancel-game", true);
  }

  function resetGameFlowUi() {
    setFirstNightIndex(0);
    setRoleSelections({});
    setNightActionIndex(0);
    setNightActions({});
    setNightPreview(null);
    setPendingNightPoisonTarget(null);
    setVotingSession(null);
    setLynchTargetId(null);
    setDayPoisonTargetId(null);
    setCorrectionPlayerId(null);
    setCorrectionNote("");
  }

  function renderCurrentScreen() {
    if (loading) {
      return <LoadingScreen />;
    }

    if (screen === "players") {
      return renderPlayers();
    }

    if (screen === "setup") {
      return renderSetup();
    }

    if (screen === "game" && game) {
      return renderGame();
    }

    if (screen === "logs" && game) {
      return (
        <Screen>
          <PhaseHeader
            canUndo={false}
            meta="Privado y público"
            onHome={() => setScreen("game")}
            onLogs={() => setScreen("game")}
            onToggleSecrets={() => setShowSecrets((current) => !current)}
            onUndo={() => undefined}
            showSecrets={showSecrets}
            title="Logs"
          />
          <AppScroll>
            <LogPanel privateLog={privateLogLines} publicLog={publicLogLines} />
          </AppScroll>
        </Screen>
      );
    }

    if (screen === "corrections" && game) {
      return renderCorrections(game);
    }

    return renderHome();
  }

  function renderHome() {
    return (
      <Screen>
        <StatusBar barStyle="light-content" />
        <AppScroll>
          <View style={styles.homeHeader}>
            <BrandMark />
            <TextBlock eyebrow="MafiApp V1" title="Dios decide. La app recuerda.">
              Asistente offline para partidas presenciales con cartas físicas.
            </TextBlock>
          </View>

          {storageError ? (
            <Card variant="danger">
              <Text style={styles.sectionTitle}>SQLite no inició</Text>
              <Text style={styles.body}>
                La app sigue usable en memoria, pero no podrá retomar estado al cerrar.
              </Text>
              <Text style={styles.meta}>{storageError}</Text>
            </Card>
          ) : null}

          {game ? (
            <Card>
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <Text style={styles.sectionTitle}>Partida en curso</Text>
                  <Text style={styles.meta}>{phaseLabel(game)}</Text>
                </View>
                <Badge tone={game.result === "SIN_RESULTADO" ? "warning" : "success"}>
                  {game.result}
                </Badge>
              </View>
              <Button icon="play" label="Continuar" onPress={() => setScreen("game")} variant="primary" />
            </Card>
          ) : null}

          <View style={styles.actionGrid}>
            <Button icon="plus" label="Nueva partida" onPress={startNewGame} variant="primary" />
            <Button icon="account-group" label="Jugadores" onPress={() => setScreen("players")} />
          </View>
        </AppScroll>
      </Screen>
    );
  }

  function renderPlayers() {
    return (
      <Screen>
        <AppScroll>
          <TextBlock eyebrow="Local" title="Jugadores">
            Frecuentes e invitados se guardan en este dispositivo.
          </TextBlock>

          <Card>
            <TextInput
              accessibilityLabel="Nombre del jugador"
              onChangeText={setPlayerName}
              placeholder="Nombre"
              placeholderTextColor={theme.colors.textDim}
              style={styles.input}
              value={playerName}
            />
            <View style={styles.actionGrid}>
              <Button icon="account-plus" label="Frecuente" onPress={() => void addPlayer("frequent")} />
              <Button icon="account-clock" label="Invitado" onPress={() => void addPlayer("guest")} />
            </View>
          </Card>

          <View style={styles.stack}>
            {players.length === 0 ? (
              <Card variant="muted">
                <Text style={styles.body}>Todavía no hay jugadores.</Text>
              </Card>
            ) : (
              players.map((player) => (
                <Card key={player.id}>
                  {editingPlayerId === player.id ? (
                    <>
                      <TextInput
                        accessibilityLabel={`Editar nombre de ${player.name}`}
                        onChangeText={setEditingName}
                        placeholder="Nombre"
                        placeholderTextColor={theme.colors.textDim}
                        style={styles.input}
                        value={editingName}
                      />
                      <View style={styles.actionGrid}>
                        <Button label="Cancelar" onPress={() => setEditingPlayerId(null)} />
                        <Button
                          label="Guardar"
                          onPress={() => void savePlayerName(player.id)}
                          variant="primary"
                        />
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.rowBetween}>
                        <View>
                          <Text style={styles.sectionTitle}>{player.name}</Text>
                          <Text style={styles.meta}>
                            {player.kind === "guest" ? "Invitado" : "Frecuente"}
                          </Text>
                        </View>
                        <Badge>{player.kind === "guest" ? "Invitado" : "Frecuente"}</Badge>
                      </View>
                      <View style={styles.actionGrid}>
                        <Button
                          icon="pencil"
                          label="Editar"
                          onPress={() => {
                            setEditingPlayerId(player.id);
                            setEditingName(player.name);
                          }}
                        />
                        <Button
                          icon="delete-outline"
                          label="Eliminar"
                          onPress={() => void deletePlayer(player.id)}
                          variant="danger"
                        />
                      </View>
                    </>
                  )}
                </Card>
              ))
            )}
          </View>
        </AppScroll>
        <BottomActionBar primary={{ label: "Home", icon: "home", onPress: () => setScreen("home") }} />
      </Screen>
    );
  }

  function renderSetup() {
    const validation = validateDeckConfiguration(draft.deck, draft.selectedPlayerIds.length);

    return (
      <Screen>
        <AppScroll>
          <TextBlock eyebrow="Nueva partida" title="Preparación">
            Seleccioná jugadores, ordená la mesa y configurá las cartas físicas.
          </TextBlock>

          <SegmentedControl options={setupSteps} value={setupStep} onChange={setSetupStep} />

          {setupStep === "players" ? renderSetupPlayers() : null}
          {setupStep === "seating" ? renderSetupSeating() : null}
          {setupStep === "cards" ? renderSetupCards(validation) : null}
          {setupStep === "deal" ? renderSetupDeal(validation.valid) : null}
        </AppScroll>
        <BottomActionBar
          primary={{
            icon: setupStep === "deal" ? "cards-playing" : "arrow-right",
            label: setupStep === "deal" ? "Crear partida" : "Siguiente",
            onPress: () => {
              if (setupStep === "players") setSetupStep("seating");
              else if (setupStep === "seating") setSetupStep("cards");
              else if (setupStep === "cards") setSetupStep("deal");
              else void createGame();
            },
            disabled:
              (setupStep === "players" && selectedPlayers.length === 0) ||
              (setupStep === "cards" && !validation.valid) ||
              (setupStep === "deal" && !canStartGame(draft))
          }}
          secondary={{ icon: "home", label: "Home", onPress: () => setScreen("home") }}
        />
      </Screen>
    );
  }

  function renderSetupPlayers() {
    return (
      <Card>
        <Text style={styles.sectionTitle}>Jugadores activos</Text>
        <View style={styles.chipWrap}>
          {players.map((player) => (
            <PlayerChip
              key={player.id}
              player={{ ...profileToState(player), alive: true }}
              selected={draft.selectedPlayerIds.includes(player.id)}
              onPress={() => setDraft((current) => toggleSelectedPlayer(current, player.id))}
            />
          ))}
        </View>
        {players.length === 0 ? (
          <Button icon="account-plus" label="Crear jugadores" onPress={() => setScreen("players")} />
        ) : null}
      </Card>
    );
  }

  function renderSetupSeating() {
    return (
      <Card>
        <Text style={styles.sectionTitle}>Orden horario</Text>
        <Text style={styles.meta}>Comienza por la izquierda de Dios.</Text>
        {draft.seatingOrder.map((playerId, index) => {
          const player = players.find((candidate) => candidate.id === playerId);

          if (!player) return null;

          return (
            <View key={playerId} style={styles.seatRow}>
              <Text style={styles.seatNumber}>{index + 1}</Text>
              <Text style={styles.playerName}>{player.name}</Text>
              <View style={styles.inlineActions}>
                <Button
                  icon="chevron-up"
                  label="Subir"
                  onPress={() =>
                    setDraft((current) => ({
                      ...current,
                      seatingOrder: moveSeat(current.seatingOrder, playerId, -1)
                    }))
                  }
                />
                <Button
                  icon="chevron-down"
                  label="Bajar"
                  onPress={() =>
                    setDraft((current) => ({
                      ...current,
                      seatingOrder: moveSeat(current.seatingOrder, playerId, 1)
                    }))
                  }
                />
              </View>
            </View>
          );
        })}
      </Card>
    );
  }

  function renderSetupCards(validation: ReturnType<typeof validateDeckConfiguration>) {
    return (
      <View style={styles.stack}>
        <Card>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.sectionTitle}>Set de cartas</Text>
              <Text style={styles.meta}>
                Jugadores {draft.selectedPlayerIds.length} · Cartas {validation.totalCards}
              </Text>
            </View>
            <Badge tone={validation.valid ? "success" : "warning"}>
              {validation.valid ? "Listo" : validation.valid === false && validation.missingCards > 0 ? `Faltan ${validation.missingCards}` : validation.valid === false ? `Sobran ${validation.extraCards}` : "Listo"}
            </Badge>
          </View>
          <Button
            icon="account-convert"
            label="Completar con civiles"
            onPress={() => setDraft((current) => completeDraftWithCivilians(current))}
          />
        </Card>

        {setupRoleOrder.map((roleId) => {
          const role = roleDefinitions[roleId];
          const count = draft.deck[roleId] ?? 0;

          return (
            <Card key={roleId}>
              <View style={styles.roleCounter}>
                <View style={styles.flex}>
                  <Text style={styles.sectionTitle}>{role.name}</Text>
                  <Text style={styles.meta}>Máximo {role.maxCopies}</Text>
                </View>
                <Button label="-" onPress={() => setDraft((current) => setRoleCount(current, roleId, count - 1))} />
                <Text style={styles.counter}>{count}</Text>
                <Button label="+" onPress={() => setDraft((current) => setRoleCount(current, roleId, count + 1))} />
              </View>
            </Card>
          );
        })}
      </View>
    );
  }

  function renderSetupDeal(valid: boolean) {
    return (
      <Card>
        <Text style={styles.sectionTitle}>Reparto físico</Text>
        <Text style={styles.body}>
          Repartí las cartas al azar. La app todavía no sabe quién es quién.
        </Text>
        <Text style={styles.meta}>
          Al crear partida, la primera noche va a identificar roles en orden seguro.
        </Text>
        <Badge tone={valid ? "success" : "warning"}>{valid ? "Configuración válida" : "Revisar cartas"}</Badge>
      </Card>
    );
  }

  function renderGame() {
    if (!game) {
      return null;
    }

    return (
      <Screen>
        <PhaseHeader
          canUndo={Boolean(storage)}
          meta={`${game.day ? `Día ${game.day}` : ""}${game.night ? ` · Noche ${game.night}` : ""}`}
          onHome={() => setScreen("home")}
          onLogs={() => setScreen("logs")}
          onToggleSecrets={() => setShowSecrets((current) => !current)}
          onUndo={() => void undoGame()}
          showSecrets={showSecrets}
          title={phaseLabel(game)}
        />
        <AppScroll>
          <SegmentedControl options={gameTabs} value={gameTab} onChange={setGameTab} />
          {gameTab === "focus" ? renderGameFocus(game) : null}
          {gameTab === "roster" ? renderRoster(game) : null}
          {gameTab === "logs" ? <LogPanel privateLog={privateLogLines} publicLog={publicLogLines} /> : null}
        </AppScroll>
        <BottomActionBar
          secondary={{ icon: "cancel", label: "Cancelar partida", onPress: () => confirmCancel() }}
        />
      </Screen>
    );
  }

  function renderGameFocus(currentGame: GameState) {
    if (currentGame.status === "SETUP") {
      return (
        <Card>
          <Text style={styles.sectionTitle}>Cartas repartidas</Text>
          <Text style={styles.body}>Cuando todos hayan visto su carta, comenzá la primera noche.</Text>
          <Button
            icon="weather-night"
            label="Iniciar primera noche"
            onPress={() => {
              const nextGame: GameState = {
                ...currentGame,
                status: "FIRST_NIGHT_IDENTIFICATION_AND_ACTIONS",
                night: 1
              };
              void commitGame(nextGame, currentGame, "start-first-night");
            }}
            variant="primary"
          />
        </Card>
      );
    }

    if (currentGame.status === "FIRST_NIGHT_IDENTIFICATION_AND_ACTIONS") {
      return renderFirstNight(currentGame);
    }

    if (currentGame.status === "NIGHT_ACTIONS") {
      return renderNightActions(currentGame);
    }

    if (currentGame.status === "NIGHT_RESOLUTION_PREVIEW") {
      return renderNightPreview(currentGame);
    }

    if (currentGame.status === "DAY_DISCUSSION") {
      return renderDayDiscussion(currentGame);
    }

    if (currentGame.status === "DAY_VOTING" || currentGame.status === "DAY_VOTE_CHANGES") {
      return renderVoting(currentGame);
    }

    if (currentGame.status === "DAY_DEFENSE") {
      return renderDefense(currentGame);
    }

    if (currentGame.status === "DAY_EXECUTION_CONFIRMED") {
      return renderLynchPreview(currentGame);
    }

    return (
      <Card>
        <Text style={styles.sectionTitle}>Partida terminada</Text>
        <Badge tone={currentGame.result === "CANCELADA" ? "warning" : "success"}>
          {currentGame.result}
        </Badge>
        <Button
          icon="reload"
          label="Nueva con mismos jugadores"
          onPress={() => {
            setDraft(createDraftFromGame(currentGame));
            resetGameFlowUi();
            setSetupStep("players");
            setScreen("setup");
          }}
          variant="primary"
        />
        <Button
          icon="plus"
          label="Nueva desde cero"
          onPress={() => {
            setDraft(createEmptyDraft());
            resetGameFlowUi();
            setSetupStep("players");
            setScreen("setup");
          }}
        />
      </Card>
    );
  }

  function renderFirstNight(currentGame: GameState) {
    const steps = buildFirstNightSteps(currentGame.deck, currentGame.players);
    const step = steps[firstNightIndex];

    if (!step) {
      return (
        <Card>
          <Text style={styles.sectionTitle}>Inferir civiles</Text>
          <Text style={styles.body}>
            Todo jugador sin rol asignado pasa a Civil.
          </Text>
          <Button
            disabled={!canInferCivilians(currentGame)}
            icon="account-check"
            label="Inferir y actuar noche"
            onPress={() => {
              const nextGame = inferCivilianRoles(currentGame, currentTime);
              setFirstNightIndex(0);
              void commitGame(nextGame, currentGame, "infer-civilians", true);
            }}
            variant="primary"
          />
        </Card>
      );
    }

    const role = roleDefinitions[step.roleId];
    const assignedIds = currentGame.players
      .filter((player) => player.roleId === step.roleId)
      .map((player) => player.id);
    const selectedIds = roleSelections[step.roleId] ?? assignedIds;

    return (
      <Card>
        <Text style={styles.sectionTitle}>{role.name}</Text>
        <Text style={styles.meta}>Seleccioná {step.requiredCount}</Text>
        <View style={styles.chipWrap}>
          {currentGame.players.map((player) => {
            const assignedOtherRole = Boolean(player.roleId && player.roleId !== step.roleId);
            const selected = selectedIds.includes(player.id);

            return (
              <PlayerChip
                key={player.id}
                disabled={assignedOtherRole}
                onPress={() => {
                  const nextSelected = selected
                    ? selectedIds.filter((id) => id !== player.id)
                    : selectedIds.length < step.requiredCount
                      ? [...selectedIds, player.id]
                      : selectedIds;
                  setRoleSelections((current) => ({
                    ...current,
                    [step.roleId]: nextSelected
                  }));
                }}
                player={player}
                selected={selected}
                showSecrets={showSecrets}
              />
            );
          })}
        </View>
        <Button
          disabled={selectedIds.length !== step.requiredCount}
          icon="check"
          label="Confirmar rol"
          onPress={() => {
            const nextGame = assignRole(currentGame, step.roleId, selectedIds, currentTime);
            setRoleSelections((current) => {
              const { [step.roleId]: _removed, ...rest } = current;
              return rest;
            });
            void commitGame(nextGame, currentGame, "assign-role");
            setFirstNightIndex((index) => index + 1);
          }}
          variant="primary"
        />
      </Card>
    );
  }

  function renderNightActions(currentGame: GameState) {
    const steps = buildNightActionSteps(currentGame);
    const step = steps[nightActionIndex];

    if (!step) {
      return (
        <Card>
          <Text style={styles.sectionTitle}>Resolver noche</Text>
          <Text style={styles.body}>Las acciones están cargadas. Revisá el preview antes del amanecer.</Text>
          <Button
            icon="weather-sunset-up"
            label="Calcular preview"
            onPress={() => {
              const resolution = resolveNight({ players: currentGame.players, actions: nightActions });
              setNightPreview(resolution);
              setPendingNightPoisonTarget(null);
              void commitGame(
                { ...currentGame, status: "NIGHT_RESOLUTION_PREVIEW" },
                currentGame,
                "night-preview"
              );
            }}
            variant="primary"
          />
        </Card>
      );
    }

    const role = roleDefinitions[step.roleId];
    const targetId = getNightActionTarget(nightActions, step.roleId);

    return (
      <Card>
        <Text style={styles.sectionTitle}>{role.name}</Text>
        <Text style={styles.body}>{nightActionCopy(step.roleId)}</Text>
        <View style={styles.chipWrap}>
          {currentGame.players
            .filter((player) => player.alive)
            .map((player) => (
              <PlayerChip
                key={player.id}
                disabled={step.roleId === "prostituta" && player.roleId === "prostituta"}
                onPress={() => setNightActions((current) => setNightActionTarget(current, step.roleId, player.id))}
                player={player}
                selected={targetId === player.id}
                showSecrets={showSecrets}
              />
            ))}
        </View>
        <Button
          disabled={!targetId}
          icon="arrow-right"
          label="Registrar acción"
          onPress={() => setNightActionIndex((index) => index + 1)}
          variant="primary"
        />
      </Card>
    );
  }

  function renderNightPreview(currentGame: GameState) {
    if (!nightPreview) {
      return (
        <Card>
          <Text style={styles.body}>No hay preview calculado.</Text>
        </Card>
      );
    }

    if (nightPreview.pendingLoverPoison) {
      const loverId = nightPreview.pendingLoverPoison.loverId;

      return (
        <Card>
          <Text style={styles.sectionTitle}>Veneno de Romeo/Julieta</Text>
          <Text style={styles.body}>El amante sobreviviente puede llevarse a alguien.</Text>
          <View style={styles.chipWrap}>
            {currentGame.players
              .filter((player) => player.alive && player.id !== loverId && player.roleId !== "romeo" && player.roleId !== "julieta")
              .map((player) => (
                <PlayerChip
                  key={player.id}
                  onPress={() => setPendingNightPoisonTarget(player.id)}
                  player={player}
                  selected={pendingNightPoisonTarget === player.id}
                  showSecrets={showSecrets}
                />
              ))}
          </View>
          <Button
            disabled={!pendingNightPoisonTarget}
            icon="skull-outline"
            label="Aplicar veneno"
            onPress={() => {
              const resolution = resolveNight({
                players: currentGame.players,
                actions: {
                  ...nightActions,
                  loverPoison: {
                    loverId,
                    targetId: pendingNightPoisonTarget as PlayerId
                  }
                }
              });
              setNightPreview(resolution);
            }}
            variant="primary"
          />
        </Card>
      );
    }

    return (
      <Card>
        <Text style={styles.sectionTitle}>Preview privado</Text>
        <Text style={styles.body}>{nightPreview.privateEvents.join("\n") || "Sin efectos."}</Text>
        <Text style={styles.sectionTitle}>Narración pública</Text>
        <Text style={styles.body}>{nightPreview.publicNarration}</Text>
        <Button
          icon="weather-sunny"
          label="Confirmar amanecer"
          onPress={() => {
            const nextGame = applyNightResolution(currentGame, nightPreview, currentTime);
            setNightActions({});
            setNightActionIndex(0);
            setNightPreview(null);
            setPendingNightPoisonTarget(null);
            void commitGame(nextGame, currentGame, "confirm-night", true);
          }}
          variant="primary"
        />
      </Card>
    );
  }

  function renderDayDiscussion(currentGame: GameState) {
    return (
      <Card>
        <Text style={styles.sectionTitle}>Discusión</Text>
        <Text style={styles.body}>La ciudad debate. Cuando Dios lo decida, inicia la ronda de votos.</Text>
        <Button
          icon="vote"
          label="Iniciar votación"
          onPress={() => {
            const session = createVotingSession(currentGame.players);
            setVotingSession(session);
            const nextGame: GameState = { ...currentGame, status: "DAY_VOTING" };
            void commitGame(nextGame, currentGame, "start-voting");
          }}
          variant="primary"
        />
      </Card>
    );
  }

  function renderVoting(currentGame: GameState) {
    const session = votingSession ?? createVotingSession(currentGame.players);
    const currentVoterId = session.order[session.index];
    const currentVoter = currentGame.players.find((player) => player.id === currentVoterId);
    const currentAutoVote = currentVoterId ? session.votes[currentVoterId] : undefined;

    if (session.index < session.order.length && currentVoter) {
      return (
        <Card>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.sectionTitle}>Vota {currentVoter.name}</Text>
              <Text style={styles.meta}>{session.index + 1} de {session.order.length}</Text>
            </View>
            <Button
              disabled={session.rerolled || session.index > 0}
              icon="shuffle"
              label="Reroll"
              onPress={() => setVotingSession(rerollVotingSession(currentGame.players, session))}
            />
          </View>
          {currentAutoVote ? (
            <>
              <Text style={styles.body}>Voto compartido registrado visualmente.</Text>
              <Button
                icon="arrow-right"
                label="Continuar"
                onPress={() => setVotingSession({ ...session, index: session.index + 1 })}
                variant="primary"
              />
            </>
          ) : (
            <View style={styles.chipWrap}>
              {currentGame.players
                .filter((player) => player.alive)
                .map((player) => (
                  <PlayerChip
                    key={player.id}
                    onPress={() => setVotingSession(castCurrentVote(currentGame.players, session, player.id))}
                    player={player}
                    showSecrets={showSecrets}
                  />
                ))}
            </View>
          )}
        </Card>
      );
    }

    const outcome = getSessionOutcome(session);

    if (outcome.kind === "TIE") {
      return (
        <Card>
          <Text style={styles.sectionTitle}>Empate</Text>
          <Text style={styles.body}>Vuelve la discusión.</Text>
          <Button
            label="Volver a discusión"
            onPress={() => {
              setVotingSession(null);
              void commitGame({ ...currentGame, status: "DAY_DISCUSSION" }, currentGame, "vote-tie");
            }}
            variant="primary"
          />
        </Card>
      );
    }

    if (outcome.kind === "DEFENSE") {
      const defendant = currentGame.players.find((player) => player.id === outcome.defendantId);
      return (
        <Card>
          <Text style={styles.sectionTitle}>Defensa</Text>
          <Text style={styles.body}>{defendant?.name ?? outcome.defendantId} se defiende.</Text>
          <Button
            icon="account-voice"
            label="Registrar defensa"
            onPress={() => {
              setVotingSession(applyDefense(session, outcome.defendantId));
              void commitGame({ ...currentGame, status: "DAY_DEFENSE" }, currentGame, "defense");
            }}
            variant="primary"
          />
        </Card>
      );
    }

    if (outcome.kind === "EXECUTION") {
      const executed = currentGame.players.find((player) => player.id === outcome.executedId);
      return (
        <Card>
          <Text style={styles.sectionTitle}>Linchamiento</Text>
          <Text style={styles.body}>{executed?.name ?? outcome.executedId} será ejecutado.</Text>
          <Text style={styles.meta}>{outcome.reasons.join(", ")}</Text>
          <Button
            icon="gavel"
            label="Revisar linchamiento"
            onPress={() => {
              setLynchTargetId(outcome.executedId);
              void commitGame(
                { ...currentGame, status: "DAY_EXECUTION_CONFIRMED" },
                currentGame,
                "execution-preview"
              );
            }}
            variant="primary"
          />
        </Card>
      );
    }

    return (
      <Card>
        <Text style={styles.body}>Faltan votos.</Text>
      </Card>
    );
  }

  function renderDefense(currentGame: GameState) {
    return (
      <Card>
        <Text style={styles.sectionTitle}>Cambios de voto</Text>
        <Text style={styles.body}>Se vuelve a cargar la ronda para registrar cambios libres.</Text>
        <Button
          icon="vote"
          label="Cargar cambios"
          onPress={() => {
            if (votingSession) {
              setVotingSession(resetVoteChangeCycle({ ...votingSession, index: 0 }));
            }
            void commitGame({ ...currentGame, status: "DAY_VOTE_CHANGES" }, currentGame, "vote-changes");
          }}
          variant="primary"
        />
      </Card>
    );
  }

  function renderLynchPreview(currentGame: GameState) {
    if (!lynchTargetId) {
      return (
        <Card>
          <Text style={styles.body}>No hay jugador para linchar.</Text>
        </Card>
      );
    }

    const target = currentGame.players.find((player) => player.id === lynchTargetId);
    const partnerDies = Boolean(
      target &&
        (target.roleId === "romeo" || target.roleId === "julieta") &&
        currentGame.players.some(
          (player) =>
            player.alive &&
            player.id !== target.id &&
            (player.roleId === "romeo" || player.roleId === "julieta")
        )
    );

    return (
      <Card>
        <Text style={styles.sectionTitle}>Confirmar linchamiento</Text>
        <Text style={styles.body}>{target?.name ?? lynchTargetId} muere por votación.</Text>
        {partnerDies ? (
          <>
            <Text style={styles.body}>El vínculo de Romeo/Julieta permite envenenar.</Text>
            <View style={styles.chipWrap}>
              {currentGame.players
                .filter(
                  (player) =>
                    player.alive &&
                    player.id !== lynchTargetId &&
                    player.roleId !== "romeo" &&
                    player.roleId !== "julieta"
                )
                .map((player) => (
                  <PlayerChip
                    key={player.id}
                    onPress={() => setDayPoisonTargetId(player.id)}
                    player={player}
                    selected={dayPoisonTargetId === player.id}
                    showSecrets={showSecrets}
                  />
                ))}
            </View>
          </>
        ) : null}
        <Button
          disabled={partnerDies && !dayPoisonTargetId}
          icon="check-decagram"
          label="Confirmar linchamiento"
          onPress={() => {
            const lynch = applyLynch(currentGame, lynchTargetId, dayPoisonTargetId, currentTime);
            const nextGame = applyConfirmedLynch(currentGame, lynch, currentTime);
            setVotingSession(null);
            setLynchTargetId(null);
            setDayPoisonTargetId(null);
            void commitGame(nextGame, currentGame, "confirm-lynch", true);
          }}
          variant="primary"
        />
      </Card>
    );
  }

  function renderCorrections(currentGame: GameState) {
    const orderedPlayers = currentGame.players
      .slice()
      .sort((a, b) => a.seatIndex - b.seatIndex);
    const selectedPlayer = orderedPlayers.find((player) => player.id === correctionPlayerId);
    const trimmedNote = correctionNote.trim();

    return (
      <Screen>
        <PhaseHeader
          canUndo={Boolean(storage)}
          meta="Privado"
          onHome={() => setScreen("game")}
          onLogs={() => setScreen("logs")}
          onToggleSecrets={() => setShowSecrets((current) => !current)}
          onUndo={() => void undoGame()}
          showSecrets={showSecrets}
          title="Correcciones"
        />
        <AppScroll>
          <View style={styles.stack}>
            <Card variant="muted">
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <Text style={styles.sectionTitle}>Herramientas privadas</Text>
                  <Text style={styles.meta}>Los cambios quedan trazados en el log privado.</Text>
                </View>
                <Badge tone="warning">Dios</Badge>
              </View>
            </Card>

            <Card>
              <Text style={styles.sectionTitle}>Nota privada</Text>
              <TextInput
                accessibilityLabel="Nota privada de Dios"
                multiline
                onChangeText={setCorrectionNote}
                placeholder="Nota"
                placeholderTextColor={theme.colors.textDim}
                style={[styles.input, styles.noteInput]}
                textAlignVertical="top"
                value={correctionNote}
              />
              <Button
                disabled={!trimmedNote}
                icon="note-edit-outline"
                label="Guardar nota"
                onPress={() => {
                  if (!trimmedNote) {
                    return;
                  }

                  const nextGame = addPrivateNote(currentGame, trimmedNote, currentTime);
                  void commitCorrection(nextGame, currentGame, "manual-note");
                }}
                variant="primary"
              />
            </Card>

            <Card>
              <Text style={styles.sectionTitle}>Estado vivo/muerto</Text>
              <View style={styles.stack}>
                {orderedPlayers.map((player) => (
                  <View key={player.id} style={styles.correctionRow}>
                    <View style={styles.flex}>
                      <Text style={styles.playerName}>{player.name}</Text>
                      <Text style={styles.meta}>Asiento {player.seatIndex + 1}</Text>
                    </View>
                    <Badge tone={player.alive ? "success" : "muted"}>
                      {player.alive ? "Vivo" : "Muerto"}
                    </Badge>
                    <Button
                      icon={player.alive ? "skull-outline" : "heart-pulse"}
                      label={player.alive ? "Marcar muerto" : "Marcar vivo"}
                      onPress={() => {
                        const nextGame = togglePlayerAlive(currentGame, player.id, currentTime);
                        void commitCorrection(nextGame, currentGame, "manual-alive");
                      }}
                      variant={player.alive ? "danger" : "secondary"}
                    />
                  </View>
                ))}
              </View>
            </Card>

            <Card>
              <Text style={styles.sectionTitle}>Corregir rol</Text>
              <View style={styles.chipWrap}>
                {orderedPlayers.map((player) => (
                  <PlayerChip
                    key={player.id}
                    onPress={() => setCorrectionPlayerId(player.id)}
                    player={player}
                    selected={correctionPlayerId === player.id}
                    showSecrets
                  />
                ))}
              </View>

              {selectedPlayer ? (
                <>
                  <View style={styles.roleSummary}>
                    <Text style={styles.meta}>Rol actual</Text>
                    <Badge tone={selectedPlayer.roleId ? "info" : "warning"}>
                      {selectedPlayer.roleId ? roleDefinitions[selectedPlayer.roleId].name : "Sin rol"}
                    </Badge>
                  </View>
                  <View style={styles.chipWrap}>
                    {setupRoleOrder.map((roleId) => (
                      <Button
                        disabled={selectedPlayer.roleId === roleId}
                        key={roleId}
                        label={roleDefinitions[roleId].name}
                        onPress={() => {
                          const nextGame = correctPlayerRole(
                            currentGame,
                            selectedPlayer.id,
                            roleId,
                            currentTime
                          );
                          void commitCorrection(nextGame, currentGame, "manual-role");
                        }}
                      />
                    ))}
                  </View>
                </>
              ) : (
                <Text style={styles.meta}>Elegí un jugador para cambiar su rol.</Text>
              )}
            </Card>

            <Card>
              <Text style={styles.sectionTitle}>Orden de asiento</Text>
              <View style={styles.stack}>
                {orderedPlayers.map((player, index) => (
                  <View key={player.id} style={styles.correctionRow}>
                    <Text style={styles.seatNumber}>{index + 1}</Text>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <View style={styles.inlineActions}>
                      <Button
                        disabled={index === 0}
                        icon="chevron-up"
                        label="Subir"
                        onPress={() => {
                          const nextGame = movePlayerSeat(currentGame, player.id, -1, currentTime);
                          void commitCorrection(nextGame, currentGame, "manual-seat-up");
                        }}
                      />
                      <Button
                        disabled={index === orderedPlayers.length - 1}
                        icon="chevron-down"
                        label="Bajar"
                        onPress={() => {
                          const nextGame = movePlayerSeat(currentGame, player.id, 1, currentTime);
                          void commitCorrection(nextGame, currentGame, "manual-seat-down");
                        }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </Card>

            <LogPanel privateLog={privateLogLines} publicLog={publicLogLines} />
          </View>
        </AppScroll>
        <BottomActionBar
          primary={{ icon: "arrow-left", label: "Volver", onPress: () => setScreen("game") }}
          secondary={{ icon: "cancel", label: "Cancelar partida", onPress: () => confirmCancel() }}
        />
      </Screen>
    );
  }

  function renderRoster(currentGame: GameState) {
    return (
      <View style={styles.stack}>
        <Card variant="muted">
          <View style={styles.rowBetween}>
            <View style={styles.flex}>
              <Text style={styles.sectionTitle}>Correcciones de Dios</Text>
              <Text style={styles.meta}>Ajustes privados para salvar errores de carga.</Text>
            </View>
            <Button
              icon="wrench-outline"
              label="Abrir"
              onPress={() => setScreen("corrections")}
            />
          </View>
        </Card>
        {currentGame.players
          .slice()
          .sort((a, b) => a.seatIndex - b.seatIndex)
          .map((player) => (
            <PlayerCard key={player.id} player={player} showSecrets={showSecrets} />
          ))}
      </View>
    );
  }

  function confirmCancel() {
    Alert.alert("Cancelar partida", "La partida quedará como Cancelada.", [
      { text: "Volver", style: "cancel" },
      { text: "Cancelar partida", style: "destructive", onPress: () => void cancelCurrentGame() }
    ]);
  }

  return renderCurrentScreen();
}

function LoadingScreen() {
  return (
    <Screen>
      <AppScroll>
        <TextBlock title="Cargando partida" eyebrow="Offline">
          Abriendo SQLite y recuperando el último estado.
        </TextBlock>
      </AppScroll>
    </Screen>
  );
}

function sanitizeDraft(draft: NewGameDraft, players: readonly PlayerProfile[]): NewGameDraft {
  const existingIds = new Set(players.map((player) => player.id));
  const selectedPlayerIds = draft.selectedPlayerIds.filter((id) => existingIds.has(id));
  const seatingOrder = [
    ...draft.seatingOrder.filter((id) => selectedPlayerIds.includes(id)),
    ...selectedPlayerIds.filter((id) => !draft.seatingOrder.includes(id))
  ];

  return {
    selectedPlayerIds,
    seatingOrder,
    deck: draft.deck
  };
}

function profileToState(player: PlayerProfile) {
  return {
    id: player.id,
    name: player.name,
    alive: true,
    seatIndex: 0
  };
}

function setNightActionTarget(
  actions: NightActions,
  roleId: RoleId,
  targetId: PlayerId
): NightActions {
  if (roleId === "prostituta") return { ...actions, prostitution: { targetId } };
  if (roleId === "mafioso") return { ...actions, mafiaAttack: { targetId } };
  if (roleId === "medico") return { ...actions, doctorProtect: { targetId } };
  if (roleId === "detective") return { ...actions, detectiveInvestigate: { targetId } };

  return actions;
}

function getNightActionTarget(actions: NightActions, roleId: RoleId): PlayerId | null {
  if (roleId === "prostituta") return actions.prostitution?.targetId ?? null;
  if (roleId === "mafioso") return actions.mafiaAttack?.targetId ?? null;
  if (roleId === "medico") return actions.doctorProtect?.targetId ?? null;
  if (roleId === "detective") return actions.detectiveInvestigate?.targetId ?? null;

  return null;
}

function nightActionCopy(roleId: RoleId): string {
  if (roleId === "prostituta") return "Elegí a quién inhibe esta noche.";
  if (roleId === "mafioso") return "Elegí la víctima del asesinato grupal.";
  if (roleId === "medico") return "Elegí a quién protege el grupo médico.";
  if (roleId === "detective") return "Elegí a quién investiga el grupo detective.";

  return "Sin acción nocturna.";
}

function phaseLabel(game: GameState): string {
  switch (game.status) {
    case "SETUP":
      return "Reparto";
    case "FIRST_NIGHT_IDENTIFICATION_AND_ACTIONS":
      return "Primera noche";
    case "NIGHT_ACTIONS":
      return `Noche ${game.night}`;
    case "NIGHT_RESOLUTION_PREVIEW":
      return "Resolver noche";
    case "DAY_DISCUSSION":
      return `Día ${game.day}`;
    case "DAY_VOTING":
      return "Votación";
    case "DAY_DEFENSE":
      return "Defensa";
    case "DAY_VOTE_CHANGES":
      return "Cambios";
    case "DAY_EXECUTION_CONFIRMED":
      return "Linchamiento";
    case "GAME_OVER":
      return "Finalizada";
    default:
      return "Partida";
  }
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function currentTime(): string {
  return new Date().toISOString();
}

function comparePlayers(a: PlayerProfile, b: PlayerProfile): number {
  return a.name.localeCompare(b.name, "es");
}

const styles = StyleSheet.create({
  homeHeader: {
    gap: theme.spacing.lg
  },
  stack: {
    gap: theme.spacing.md
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "space-between"
  },
  flex: {
    flex: 1,
    minWidth: 0
  },
  sectionTitle: {
    ...theme.typography.section,
    color: theme.colors.text
  },
  body: {
    ...theme.typography.body,
    color: theme.colors.textMuted
  },
  meta: {
    ...theme.typography.meta,
    color: theme.colors.textDim
  },
  input: {
    ...theme.typography.body,
    backgroundColor: theme.colors.bgRaised,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.text,
    minHeight: theme.layout.touchTarget,
    paddingHorizontal: theme.spacing.md
  },
  noteInput: {
    minHeight: 96,
    paddingTop: theme.spacing.sm
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  correctionRow: {
    alignItems: "center",
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    minHeight: 56,
    paddingTop: theme.spacing.sm
  },
  roleSummary: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  seatRow: {
    alignItems: "center",
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    minHeight: 56,
    paddingTop: theme.spacing.sm
  },
  seatNumber: {
    ...theme.typography.label,
    color: theme.colors.sage,
    width: 28
  },
  playerName: {
    ...theme.typography.label,
    color: theme.colors.text,
    flex: 1
  },
  inlineActions: {
    flexDirection: "row",
    gap: theme.spacing.xs
  },
  roleCounter: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  counter: {
    ...theme.typography.title,
    color: theme.colors.text,
    minWidth: 32,
    textAlign: "center"
  }
});
