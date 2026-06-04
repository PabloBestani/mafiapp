# MafiApp — Especificación funcional/técnica V1

Este documento define la especificación funcional y técnica inicial de **MafiApp V1**.

Debe servir como guía para implementar la primera versión de la app y como contrato conceptual para futuras iteraciones del motor de reglas.

---

## 1. Stack técnico recomendado

La implementación sugerida para V1 es:

```txt
React Native + Expo
TypeScript
SQLite local
Arquitectura offline-first
Motor de reglas desacoplado de la UI
```

### 1.1. Requisitos técnicos

- Debe poder generarse un APK instalable de forma simple.
- No debe requerir backend.
- No debe requerir login.
- No debe requerir conexión a internet.
- Debe guardar automáticamente la partida en curso.
- Debe poder retomar una partida aunque la app se cierre accidentalmente.

### 1.2. Arquitectura sugerida

Separar al menos estas capas:

```txt
/ui
  Pantallas, componentes, navegación, interacción táctil.

/domain
  Entidades de negocio, reglas, estados, eventos, resolución de partida.

/storage
  Persistencia local SQLite, repositorios, migraciones.

/services
  Orquestadores de flujo, autosave, undo, logs.

/data
  Definición estática de roles soportados, orden de llamados, metadatos.
```

La UI no debe contener la lógica central de resolución del juego. La UI llama al motor; el motor devuelve estado, eventos y resultados.

---

## 2. Conceptos principales

### 2.1. Dios

Dios es el guía/narrador y único usuario de la app en V1.

Dios:

- Crea partidas.
- Selecciona jugadores.
- Ordena la mesa.
- Configura cartas.
- Reparte cartas físicas.
- Registra identidades durante la primera noche.
- Registra acciones nocturnas.
- Registra votos.
- Confirma resoluciones.
- Puede deshacer/corregir.

Dios no es un jugador dentro del motor.

### 2.2. Jugador

Un jugador tiene:

- id local.
- nombre.
- tipo: frecuente o invitado.
- estado en partida: vivo/muerto.
- posición de asiento actual si está vivo.
- rol asignado durante la partida.
- estados públicos activos.
- estados secretos activos.

### 2.3. Rol

Un rol tiene:

- id.
- nombre.
- equipo.
- si cuenta como Mafioso estricto.
- si tiene acción nocturna.
- si se identifica en primera noche.
- si actúa en grupo o individualmente.
- orden de llamado.
- reglas de selección de objetivo.
- reglas de resolución.

### 2.4. Equipo y conteo de victoria

No confundir equipo con conteo de victoria.

Ejemplo:

```txt
Prostituta:
  equipo = Mafia
  mafiosoEstricto = false
  cuentaComoNoMafiosoVivo = true
```

```txt
Mafioso:
  equipo = Mafia
  mafiosoEstricto = true
  cuentaComoNoMafiosoVivo = false
```

La victoria mafia depende de Mafiosos estrictos vivos contra no mafiosos vivos. En este conteo, todo jugador vivo que no sea Mafioso estricto cuenta como no mafioso vivo, incluida la Prostituta aunque pertenezca al equipo Mafia.

---

## 3. Roles V1

Los únicos roles implementados en V1 son:

| Rol | Equipo | Mafioso estricto | Acción |
|---|---:|---:|---|
| Civil | Pueblo | No | Ninguna |
| Mafioso | Mafia | Sí | Asesinato nocturno grupal |
| Médico | Pueblo | No | Protección nocturna grupal |
| Detective | Pueblo | No | Investigación nocturna grupal |
| Abuela con Escopeta | Pueblo | No | Pasiva nocturna |
| Romeo | Pueblo | No | Vínculo de voto, muerte y envenenamiento |
| Julieta | Pueblo | No | Vínculo de voto, muerte y envenenamiento |
| Prostituta | Mafia | No | Inhibición nocturna |

Límites máximos de cartas V1:

| Rol | Máximo |
|---|---:|
| Civil | 7 |
| Mafioso | 5 |
| Médico | 3 |
| Detective | 3 |
| Abuela con Escopeta | 1 |
| Romeo | 1 |
| Julieta | 1 |
| Prostituta | 1 |

Romeo y Julieta son dos cartas distintas. En V1 hacen exactamente lo mismo en términos de motor: comparten voto, muerte por vínculo y envenenamiento.

La lógica fina de interacciones está definida en `docs/ROLES_V1.md`. El diseño del motor debe prever interacciones complejas futuras, pero `docs/ROLES_V1.md` es la fuente de verdad para roles V1.

---

## 4. Estados de partida

Estados internos sugeridos:

```ts
type GameStatus =
  | "SETUP"
  | "FIRST_NIGHT_IDENTIFICATION_AND_ACTIONS"
  | "NIGHT_ACTIONS"
  | "NIGHT_RESOLUTION_PREVIEW"
  | "NIGHT_RESOLUTION_CONFIRMED"
  | "DAY_DISCUSSION"
  | "DAY_VOTING"
  | "DAY_DEFENSE"
  | "DAY_VOTE_CHANGES"
  | "DAY_EXECUTION_CONFIRMED"
  | "GAME_OVER";
```

Aunque algunas fases sean visualmente simples, deben existir como estados internos para facilitar:

- autosave;
- undo;
- validaciones;
- bloqueo de acciones fuera de momento;
- logs;
- reanudación exacta de partida.

---

## 5. Persistencia local

### 5.1. Autosave

La app debe guardar automáticamente:

- jugadores locales;
- configuración usada en la última partida;
- partida en curso;
- estado actual de fase;
- roles asignados;
- vivos/muertos;
- orden de asiento;
- logs;
- acciones registradas;
- votos y defensas;
- historial necesario para undo.

### 5.2. Reapertura de app

Si la app se cierra en medio de una partida, al abrir debe mostrar:

```txt
Hay una partida en curso.
Último punto guardado: Noche 2 — acción de Mafiosos.

[Continuar] [Terminar partida]
```

Debe retomar exactamente desde el último estado guardado, incluso si estaba a mitad de noche o votación.

### 5.3. Terminar partida prematuramente

Dios puede terminar una partida antes de que haya ganador por:

- error de carga;
- partida abandonada;
- interrupción externa;
- decisión del grupo.

La partida pasa a estado terminado con resultado `CANCELADA`. No se registra como victoria manual, derrota manual ni empate manual.

No se requiere historial avanzado de partidas terminadas en V1.

---

## 6. Undo y correcciones

### 6.1. Deshacer rápido

Debe existir un botón visible de **Deshacer** para revertir la última acción operativa.

Casos típicos:

- chip tocado por error;
- voto cargado mal;
- jugador equivocado seleccionado;
- acción nocturna registrada incorrectamente.

### 6.2. Confirmaciones fuertes

Son confirmaciones fuertes:

- confirmar resolución nocturna;
- confirmar linchamiento;
- terminar partida;
- inferencia automática de civiles al final de primera noche.

Si Dios intenta deshacer atravesando una confirmación fuerte, la app debe mostrar un modal de advertencia:

```txt
Estás por deshacer una resolución confirmada.
Esto puede modificar el estado de la partida y los logs.

[Cancelar] [Deshacer de todos modos]
```

Si Dios confirma, el deshacer común puede atravesar la confirmación fuerte.

### 6.3. Correcciones de Dios

Además del deshacer rápido, debe existir una sección menos visible:

```txt
Correcciones de Dios
```

Posibles acciones:

- cambiar estado vivo/muerto;
- corregir rol asignado;
- revertir resolución;
- editar orden de asiento en momento permitido;
- agregar nota privada;
- terminar partida prematuramente.

Estas herramientas no deben ser protagonistas de la UX normal.

---

## 7. Gestión de jugadores

### 7.1. Pantalla de jugadores

Debe mostrar jugadores como cards diseñadas.

Acciones:

- seleccionar para próxima partida;
- crear jugador;
- editar nombre;
- eliminar jugador;
- agregar invitado.

### 7.2. Invitados

Los invitados sirven para partidas puntuales. No necesariamente deben guardarse como jugadores frecuentes.

### 7.3. Selección de jugadores activos

Al crear partida, Dios selecciona quiénes juegan. La selección puede partir de jugadores frecuentes y agregar invitados.

---

## 8. Orden de asiento

### 8.1. Regla base

El orden de asiento se carga como una lista en **sentido horario**, comenzando desde el jugador sentado a la izquierda de Dios.

No se soporta carga antihoraria.

### 8.2. Edición antes de partida

Antes de empezar, Dios puede reordenar jugadores con drag & drop o mecanismo equivalente.

### 8.3. Edición durante partida

El orden puede modificarse durante la partida si los jugadores cambian de lugar.

Permitido:

- durante setup;
- durante discusión diurna antes de iniciar votación;
- después de resolver amanecer y antes de comenzar discusión;
- después de resolver linchamiento y antes de iniciar noche.

No permitido:

- durante noche activa;
- durante resolución nocturna;
- durante votación activa;
- durante defensa;
- durante cambio de votos.

Cuando se actualiza el orden, la app registra en log privado:

```txt
Día 2: Dios actualizó el orden de asiento.
Nuevo orden: Pablo, Sofi, Juan...
```

### 8.4. Vivos y muertos

La ronda operativa se calcula solo con jugadores vivos. Los muertos quedan aparte y no participan del orden circular activo.

Si en una versión futura existe resurrección, deberá definirse dónde se reinserta el jugador.

---

## 9. Configuración de cartas

### 9.1. Selección manual

Dios elige manualmente cuántas cartas de cada rol entran.

No hay presets persistentes ni recomendación automática en V1.

La app debe precargar la configuración usada en la última partida, si existe.

### 9.2. Validación

La app permite modificar libremente el set mientras Dios lo arma, aunque temporalmente sobren o falten cartas.

No permite avanzar hasta que:

```txt
cantidad de cartas = cantidad de jugadores activos
```

Debe informar:

- cuántas cartas faltan;
- cuántas cartas sobran;
- cantidad actual de jugadores;
- cantidad actual de cartas.

### 9.3. Completar con civiles

Si faltan cartas, debe existir un botón:

```txt
Completar con civiles
```

Esto agrega automáticamente la cantidad necesaria de Civiles.

### 9.4. Roles disponibles

Solo aparecen roles soportados por el motor V1.

---

## 10. Reparto físico e identificación durante primera noche

### 10.1. Reparto

Dios reparte cartas físicas aleatoriamente. La app todavía no sabe quién es quién.

### 10.2. Identificación progresiva

La primera noche identifica roles en orden fijo. Cada pantalla muestra chips de jugadores elegibles.

No debe requerirse botón “Guardar” para cada selección si la acción es simple. Tocar el chip registra la selección o la agrega al grupo correspondiente.

Si se elige un único jugador, tocar el chip confirma la acción. Si se eligen varios, los chips permiten seleccionar/deseleccionar y la confirmación aparece recién al completar la cantidad esperada.

Debe existir deshacer.

### 10.3. Orden fijo de primera noche

1. Abuela con Escopeta: identificación.
2. Romeo y Julieta: identificación.
3. Prostituta: identificación y acción nocturna.
4. Mafiosos: identificación y asesinato.
5. Médicos: identificación y protección.
6. Detectives: identificación e investigación.
7. Inferir civiles automáticamente.
8. Resolver noche.

### 10.4. Roles repetidos

Roles repetidos se llaman juntos en V1.

Ejemplos:

- Todos los Mafiosos despiertan juntos.
- Todos los Médicos despiertan juntos.
- Todos los Detectives despiertan juntos.

### 10.5. Civiles

Los Civiles no se llaman. Al final de la identificación, todo jugador activo sin rol asignado pasa automáticamente a ser Civil.

La inferencia de Civiles es automática y no requiere una confirmación visible de Dios.

---

## 11. Noche regular

En noches posteriores, la app ya conoce los roles y guía acciones nocturnas.

Debe:

- mostrar rol/grupo llamado;
- permitir seleccionar objetivo;
- registrar acción;
- aplicar inhibiciones, protecciones, asesinatos, investigaciones y reacciones según motor;
- permitir deshacer;
- permitir ver situación actual sin interrumpir el flujo;
- mostrar preview de resolución;
- pedir confirmación antes de aplicar resultados definitivos.

---

## 12. Reglas base de roles V1

Este bloque recoge definiciones funcionales ya confirmadas. La especificación exhaustiva de interacciones irá en un documento posterior.

### 12.1. Detective

El Detective investiga si un jugador es **Mafioso estricto**.

Respuesta UI sugerida:

```txt
Mafioso
No Mafioso
```

Solo el rol Mafioso devuelve “Mafioso”.

El Detective no puede investigarse a sí mismo.

Ejemplos:

- Mafioso → Mafioso.
- Prostituta → No Mafioso.
- Civil → No Mafioso.
- Médico → No Mafioso.
- Detective → No Mafioso.
- Abuela → No Mafioso.

Si el Detective es inhibido por la Prostituta, recibe la respuesta opuesta a la verdad.

Si hay más de un Detective vivo y solo uno es inhibido, la investigación grupal sigue siendo exitosa y no se invierte la respuesta.

### 12.2. Médico

El Médico protege por la noche.

- Puede protegerse a sí mismo.
- Puede repetir objetivo noches consecutivas.
- Puede proteger a alguien asesinado por la Abuela.
- Si hay más de un Médico vivo y solo uno es inhibido, la protección grupal sigue funcionando.
- Si queda un solo Médico vivo y es inhibido, la protección se cancela.

### 12.3. Prostituta

La Prostituta inhibe a un jugador durante esa noche.

- Pertenece al equipo Mafia.
- No es Mafioso estricto.
- No puede inhibirse a sí misma.
- Puede inhibir a cualquier otro jugador, de cualquier equipo.
- Puede repetir objetivo noche a noche.
- Solo inhibe rol nocturno.
- El inhibido no sabe que fue inhibido.
- El inhibido actúa normalmente desde su perspectiva, pero su acción puede quedar anulada o alterada por el motor.

Si inhibe a un integrante de un grupo con más miembros activos, la acción grupal puede seguir funcionando.

Ejemplos:

- Inhibe al único Médico vivo → se cancela protección.
- Inhibe a uno de dos Médicos vivos → protección funciona.
- Inhibe al único Mafioso vivo → se cancela asesinato.
- Inhibe a uno de varios Mafiosos vivos → asesinato funciona.
- Inhibe a uno de varios Detectives vivos → investigación funciona.

### 12.4. Mafiosos

Los Mafiosos actúan como grupo.

- Eligen una víctima nocturna.
- Pueden matar a otro Mafioso si el grupo lo decide.
- Pueden automatar a uno de ellos si hay más de un Mafioso vivo.
- Si queda un solo Mafioso vivo, sigue matando normalmente.
- El último Mafioso vivo no puede matarse a sí mismo; debe matar a otro jugador vivo.
- Si todos los Mafiosos estrictos mueren, gana el Pueblo aunque la Prostituta siga viva.

### 12.5. Romeo y Julieta

En V1 se implementa su vínculo de voto, muerte y envenenamiento. Romeo y Julieta son dos cartas distintas, con las mismas reglas de vínculo.

- Comparten voto forzosamente.
- Si uno vota primero, el otro queda obligado al mismo voto.
- Si uno cambia voto, el otro cambia automáticamente.
- Si uno muere, el otro muere inmediatamente.

Antes de morir, el segundo amante puede envenenar a otro jugador vivo según las reglas detalladas en `docs/ROLES_V1.md`.

### 12.6. Abuela con Escopeta

La Abuela es un rol pasivo nocturno. Su lógica detallada se especificará en el documento de roles, pero el motor debe estar preparado para reacciones pasivas disparadas por ser apuntada.

Definiciones ya conocidas:

- Puede matar a quien la apunta durante la noche.
- Puede ser inhibida por la Prostituta.
- Si está inhibida, actúa como Civil común esa noche.
- La Prostituta es inmune a la Abuela.
- Si varios jugadores la apuntan a la vez, se resuelve por cercanía según orden de vivos.
- Si hay empate de distancia, se elige al azar.

---

## 13. Estados públicos y secretos

### 13.1. Vista sin ojo

Debe mostrar:

- jugador vivo/muerto;
- estados públicos relevantes;
- iconos o badges visuales;
- tooltip o detalle al tocar.

Ejemplos de estados públicos futuros:

- no puede votar;
- no puede hablar;
- defendido hoy;
- muerto durante noche X;
- linchado durante día X.

### 13.2. Vista con ojo

Debe mostrar todo lo anterior más:

- rol;
- equipo;
- estados secretos activos;
- información nocturna relevante.

Ejemplos de estados secretos nocturnos:

- inhibido;
- objetivo de asesinato pendiente;
- protegido/salvado;
- blindado futuro;
- marcado por una acción futura.

La vista con ojo no debe reemplazar al log. Solo muestra situación actual.

### 13.3. Acceso durante flujo

Durante noche o votación, la app debe priorizar el flujo activo, pero permitir abrir un panel o detalle de situación actual sin perder contexto.

El botón de ojo solo debe aparecer en pantallas donde alternarlo cambia el contenido visible. No debe mostrarse en pantallas ya privadas o en vistas donde no modifica la información renderizada.

---

## 14. Log privado y público

### 14.1. Log privado

Registra todo lo necesario para trazabilidad.

Eventos sugeridos:

```ts
type PrivateLogEvent =
  | "ROLE_ASSIGNED"
  | "NIGHT_ACTION_REGISTERED"
  | "NIGHT_EFFECT_APPLIED"
  | "PLAYER_DIED"
  | "PLAYER_SAVED"
  | "PLAYER_INHIBITED"
  | "INVESTIGATION_RESULT"
  | "SEATING_ORDER_CHANGED"
  | "VOTING_ORDER_GENERATED"
  | "VOTING_ORDER_REROLLED"
  | "VOTE_CAST"
  | "VOTE_CHANGED"
  | "PLAYER_DEFENDED"
  | "LYNCH_CONFIRMED"
  | "UNDO"
  | "MANUAL_CORRECTION"
  | "WIN_CONDITION_EVALUATED";
```

### 14.2. Log público

Funciona como guion mínimo para Dios. Solo contiene información públicamente comunicable.

Debe ocultar:

- intentos de asesinato fallidos;
- salvaciones;
- inhibiciones;
- investigaciones;
- identidad de roles;
- causas secretas;
- interacciones ocultas.

Ejemplo:

```txt
La ciudad despierta.
Murió Pablo.
```

Si hubo dos intentos de asesinato y uno fue salvado, el log público solo comunica la muerte efectiva, no los intentos.

---

## 15. Votación

### 15.1. Inicio

Al iniciar votación:

- la app elige jugador inicial al azar;
- la app elige sentido al azar: horario o antihorario;
- Dios puede rerollear máximo una vez antes del primer voto;
- el orden y el reroll se registran en log privado.
- ningún jugador puede votarse a sí mismo.

### 15.2. Carga de votos

Dios carga cada voto individualmente.

En pantalla:

- se muestra quién vota;
- se muestran chips de jugadores vivos votables;
- Dios toca el chip del votado;
- la app avanza al siguiente votante.

### 15.3. Romeo y Julieta

Cuando le toca votar al segundo integrante de la pareja, la app muestra el paso para no delatar públicamente que el voto ya quedó enlazado, pero registra automáticamente el voto compartido.

La app debe impedir cualquier voto que produzca autovoto directo o por vínculo.

### 15.4. Resultado

La app calcula:

- empate;
- más votado;
- mayoría abrumadora;
- si el jugador ya se defendió hoy;
- ejecución.

### 15.5. Ejecución inmediata

Un jugador muere sin defensa si recibe el 70% o más de los votos emitidos, redondeado hacia arriba.

No existen abstenciones en V1.

Los votos anulados futuros no cuentan como votos emitidos válidos.

### 15.6. Defensa y cambios

Si hay un más votado sin ejecución inmediata:

1. Pasa a defensa.
2. Se registra que ese jugador ya se defendió este día.
3. Dios permite cambios de voto en modo libre.
4. La app recalcula.
5. Si el mismo jugador vuelve a ser más votado, muere.
6. Si aparece otro más votado, se defiende ese jugador.
7. Si hay empate, vuelve discusión.

El ciclo se repite indefinidamente hasta que alguien muera.

### 15.7. Razones de ejecución

Si aplican varias razones, la app puede mostrar varias.

Ejemplo:

```txt
Juan será ejecutado.
Motivos:
- mayoría abrumadora;
- ya se defendió este día.
```

Si por simplicidad de implementación se prioriza una, debe priorizarse “mayoría abrumadora”.

---

## 16. Condiciones de victoria

### 16.1. Momentos de evaluación

La victoria se evalúa únicamente:

1. al confirmar resolución nocturna completa;
2. al confirmar linchamiento diurno.

### 16.2. Mafia

Mafia gana si:

```txt
mafiososEstricosVivos >= noMafiososVivos
```

`noMafiososVivos` incluye a todos los jugadores vivos que no sean Mafiosos estrictos. La Prostituta cuenta como `noMafiososVivos` aunque sea del equipo Mafia.

### 16.3. Pueblo

Pueblo gana si:

```txt
mafiososEstricosVivos === 0
```

### 16.4. Empate

Empate es un resultado válido.

Puede ocurrir en resoluciones raras donde las muertes encadenadas dejan sin ganador claro o eliminan simultáneamente a los actores de victoria.

El motor debe permitir:

```ts
type GameResult = "PUEBLO" | "MAFIA" | "EMPATE" | "SIN_RESULTADO" | "CANCELADA";
```

### 16.5. Preparación para neutrales

Aunque no hay neutrales en V1, la arquitectura debe poder incorporar condiciones de victoria especiales por rol en versiones futuras.

---

## 17. Nueva partida

Al finalizar una partida, la app debe ofrecer:

```txt
Nueva partida con mismos jugadores
Nueva partida desde cero
```

Nueva partida con mismos jugadores debe precargar:

- jugadores activos anteriores;
- último orden de asiento editable;
- última configuración de cartas editable.

Debe permitir:

- agregar jugadores;
- quitar jugadores;
- editar orden;
- modificar set de cartas.

---

## 18. Pantallas sugeridas V1

### 18.1. Home

- Nueva partida.
- Continuar partida en curso si existe.
- Jugadores.
- Configuración básica si hiciera falta.

### 18.2. Jugadores

Cards de jugadores con acciones.

### 18.3. Nueva partida

Pasos:

1. Seleccionar jugadores.
2. Ordenar ronda.
3. Elegir cartas.
4. Confirmar partida.
5. Repartir cartas físicas.
6. Iniciar primera noche.

### 18.4. Vista principal de partida

Muestra:

- fase actual;
- día/noche actual;
- vivos/muertos;
- estados públicos;
- botón ojo;
- acceso a log;
- acceso a situación actual;
- acción principal según fase.

### 18.5. Flujo de noche

Pantallas por rol/grupo llamado.

### 18.6. Preview de resolución nocturna

Debe mostrar:

- resumen privado calculado;
- resultado público sugerido;
- acciones afectadas por inhibición/protección;
- botón confirmar;
- opción de corregir o deshacer.

### 18.7. Día y votación

- Discusión.
- Iniciar votación.
- Carga de votos.
- Resultado.
- Defensa.
- Cambios.
- Linchamiento.
- Evaluación de victoria.

---

## 19. Criterios de aceptación MVP

La V1 se considera funcional si permite:

1. Crear jugadores locales.
2. Crear una partida sin internet.
3. Seleccionar jugadores activos.
4. Ordenar la ronda horaria.
5. Configurar cartas V1.
6. Validar cantidad cartas/jugadores.
7. Repartir cartas físicas y avanzar a primera noche.
8. Identificar roles durante la primera noche.
9. Inferir civiles automáticamente.
10. Registrar acciones nocturnas base.
11. Resolver noche con preview.
12. Confirmar resultado público.
13. Registrar votos individuales.
14. Aplicar Romeo/Julieta en votación.
15. Gestionar defensa y cambios de voto.
16. Confirmar linchamiento.
17. Evaluar victoria Mafia/Pueblo/Empate.
18. Guardar automáticamente estado.
19. Retomar partida al reabrir app.
20. Deshacer acciones.
21. Terminar partida prematuramente.

---

## 20. Documentos futuros recomendados

Para continuar el proyecto, conviene crear:

```txt
docs/ROLES_V1.md
```

Detalle exhaustivo de interacciones entre:

- Abuela con Escopeta;
- Prostituta;
- Mafiosos;
- Médicos;
- Detectives;
- Romeo y Julieta;
- Civil.

También:

```txt
docs/UX_NOTES.md
docs/ROADMAP.md
docs/SOCIAL_RULES.md
```

Especialmente para:

- muertos que hablan;
- penalización por gestos o revelaciones;
- Romeo/Julieta que no cumplen teatralmente el voto;
- pantalla pública;
- helper de interacciones complejas.
