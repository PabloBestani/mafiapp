# MafiApp — Estado de implementación

Última actualización: 2026-06-04.

## Base técnica

- App Expo + React Native + TypeScript.
- Motor de dominio desacoplado de UI.
- Persistencia local con SQLite vía `expo-sqlite`.
- Migraciones idempotentes y verificadas contra SQLite real en tests.
- Repositorios para jugadores, partida actual, último setup y snapshots de undo.

## PR4: preparación de partida

Implementado:

- Home operativo con continuación de partida en curso.
- Gestión local de jugadores frecuentes e invitados.
- Crear, editar y eliminar jugadores.
- Nueva partida por pasos:
  - selección de jugadores activos;
  - orden horario de mesa con subir/bajar;
  - configuración manual de cartas V1;
  - validación de cantidad cartas/jugadores;
  - completar con civiles;
  - confirmación de reparto físico.
- Autosave de partida creada y último setup reusable.

## PR5: flujo de partida

Implementado:

- Vista principal de partida con fase, día/noche, modo ojo, undo y logs.
- Primera noche con identificación de roles en orden V1.
- Inferencia automática de civiles.
- Noche regular con acciones de Prostituta, Mafiosos, Médicos y Detectives.
- Preview privado de resolución nocturna y narración pública.
- Confirmación fuerte de amanecer con evaluación de victoria.
- Día con discusión, votación, reroll único antes de votar, defensa y cambios.
- Romeo/Julieta:
  - voto compartido;
  - muerte por vínculo;
  - selección de veneno en noche o día cuando corresponde.
- Confirmación de linchamiento y evaluación de victoria.
- Logs privado/público visibles desde la app.
- Cancelación de partida con resultado `CANCELADA`.

## Cobertura automatizada

- Tests de dominio: roles, noche, victoria y votación.
- Tests de storage: migraciones, repositorios, autosave y undo.
- Tests de flujo UI: setup, primera noche, votación y linchamiento.

## Limitaciones conocidas

- El flujo de cambios de voto se implementa como nueva carga de ronda completa para mantener discreción visual; el modo libre fino puede refinarse después.
- La edición de orden de asiento durante partida todavía no tiene pantalla propia.
- Las correcciones de Dios avanzadas quedan para la siguiente iteración.
- El build APK local usa `npm run apk:local` y requiere Android SDK/JDK instalados.
