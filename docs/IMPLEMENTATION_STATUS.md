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

## PR6: correcciones y APK local

Implementado:

- Pantalla privada de Correcciones de Dios accesible desde Mesa.
- Corrección manual de estado vivo/muerto durante partida.
- Corrección manual de rol asignado durante partida.
- Corrección de orden de asiento durante partida.
- Nota privada de Dios en el log privado.
- Correcciones guardadas como checkpoints fuertes, integradas con autosave y deshacer.
- Nueva partida desde finalización con mismos jugadores usando el setup de la partida.
- Nueva partida desde cero desde el cierre de partida.
- Scripts locales sin EAS:
  - `npm run apk:local` genera APK release local standalone para prueba en celular;
  - `npm run apk:release` ejecuta el mismo build release explícitamente;
  - `npm run apk:debug` queda disponible para desarrollo con variante debug.

## Cobertura automatizada

- Tests de dominio: roles, noche, victoria y votación.
- Tests de storage: migraciones, repositorios, autosave y undo.
- Tests de flujo UI: setup, primera noche, votación, linchamiento y correcciones de Dios.

## Limitaciones conocidas

- El flujo de cambios de voto se implementa como nueva carga de ronda completa para mantener discreción visual; el modo libre fino puede refinarse después.
- Revertir una resolución completa todavía se hace con Deshacer; no hay editor específico de resolución histórica.
- El build APK local usa `npm run apk:local`, requiere JDK + Android SDK instalados en la máquina y firma con debug keystore generada por Expo prebuild.
- `npm audit` reporta un advisory moderado en `uuid` vía `expo`/`xcode`; no se aplicó `npm audit fix --force` porque propone bajar Expo a 46.

## Ajustes posteriores

Implementado:

- Icono de app, adaptive icon, splash screen y wordmark derivados del lomo de cartas.
- Safe area superior/inferior para evitar superposición con barras del celular.
- Header operativo con wordmark compacto.
- Primera noche con identificación y acción inmediata para roles activos.
- Inferencia automática de Civiles al cerrar la primera noche, sin botón intermedio.
- Selecciones únicas por chip, sin botón de confirmación.
- Targets vivos y muertos visibles en chips; muertos e inelegibles quedan deshabilitados con razón compacta al tocar.
- Restricciones UI y dominio:
  - Prostituta no puede inhibirse a sí misma;
  - único Mafioso vivo no puede automatarse;
  - Detective no puede investigarse a sí mismo;
  - no existe autovoto diurno directo ni forzado por Romeo/Julieta.
- Botón de ojo oculto en pantallas donde no cambia el contenido visible.
