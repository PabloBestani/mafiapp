# MafiApp

**MafiApp** es una app mobile offline para asistir a **Dios**, el guía/narrador de partidas presenciales de Mafia con roles complejos.

La primera versión está pensada para un solo celular, usado únicamente por Dios. Los jugadores siguen usando cartas físicas y no necesitan instalar nada. La app no reemplaza la experiencia social del juego: reduce la carga mental de Dios, guía la noche, registra acciones, resuelve interacciones y ayuda a mantener consistencia.

---

## 1. Visión

MafiApp nace para resolver un problema concreto: cuando una partida presencial de Mafia incorpora muchos roles, acciones nocturnas, inmunidades, inhibiciones, protecciones, vínculos, condiciones de victoria y efectos simultáneos, la tarea de Dios se vuelve difícil de sostener mentalmente.

La app debe funcionar como un **copiloto operativo**:

> Dios decide, la app recuerda y calcula.

La prioridad de la V1 no es digitalizar todo el juego, sino hacer que una partida presencial con cartas físicas sea más fluida, consistente y menos propensa a errores.

---

## 2. Principios de diseño

1. **Cartas físicas primero**  
   Los jugadores reciben cartas físicas. La app acompaña al Dios, no sustituye el ritual presencial.

2. **Un solo dispositivo**  
   La V1 es para el celular de Dios. No hay app para jugadores.

3. **Offline-first**  
   La app debe funcionar completamente offline. No debe depender de backend, internet, login ni sincronización.

4. **Fluidez por encima de burocracia**  
   El flujo debe minimizar botones innecesarios. Cuando sea seguro, tocar un chip debe bastar para avanzar o registrar una acción.

5. **Reglas trazables**  
   La app debe explicar internamente cómo llegó a una resolución, especialmente durante la noche.

6. **Discreción visual**  
   La pantalla contiene información secreta. Debe evitar exponer roles o estados secretos salvo que Dios active el modo de revelado.

7. **Corrección posible, pero no protagonista**  
   Dios puede corregir errores, deshacer acciones y revertir resoluciones, pero estas herramientas deben estar integradas con cuidado.

8. **Motor de reglas desacoplado de la UI**  
   La lógica de negocio debe vivir separada de las pantallas para permitir pruebas, iteración y expansión futura de roles.

---

## 3. Alcance de la V1

La V1 incluye:

- Gestión local de jugadores.
- Selección de jugadores activos para una partida.
- Orden de asiento circular horario.
- Configuración manual del set de cartas.
- Reparto físico de cartas.
- Identificación de roles durante la primera noche.
- Inferencia automática de civiles.
- Guía de noche.
- Registro de acciones nocturnas.
- Resolución de interacciones base.
- Estado vivo/muerto.
- Votación diurna asistida.
- Defensa y cambios de voto.
- Condición automática de victoria de Mafia, Pueblo o Empate.
- Log privado para Dios.
- Log público como texto sugerido para narrar a jugadores.
- Autosave local.
- Deshacer última acción.
- Correcciones de Dios para casos excepcionales.
- Nueva partida con mismos jugadores y última configuración usada.

---

## 4. Fuera de alcance de la V1

No forman parte de la primera versión:

- App para jugadores.
- Login.
- Backend.
- Sincronización cloud.
- QR en cartas.
- Roles digitales para jugadores.
- Pantalla pública en TV/tablet.
- Estadísticas históricas.
- Historial avanzado de partidas pasadas.
- Penalizaciones formales por muertos que hablan.
- Penalización por Romeo/Julieta que no vota teatralmente como corresponde.
- Roles no soportados por el motor V1.
- Helper avanzado de interacciones complejas por carta.

Estos puntos pueden incorporarse en iteraciones futuras.

---

## 5. Roles soportados en V1

La primera iteración modela únicamente estos roles:

- **Dios**: guía/narrador; no es jugador.
- **Civil**: Pueblo, sin acción nocturna.
- **Mafioso**: Mafia estricta; cuenta para condición de victoria mafia.
- **Médico**: Pueblo; protege por la noche.
- **Detective**: Pueblo; investiga si alguien es Mafioso estricto.
- **Abuela con Escopeta**: Pueblo; rol pasivo especial.
- **Romeo y Julieta**: Pueblo; vínculo de voto y muerte.
- **Prostituta**: Equipo Mafia, pero no Mafioso estricto; inhibe roles nocturnos.

Los neutrales y roles especiales futuros quedan fuera de V1, aunque la arquitectura debe prever que puedan agregarse.

---

## 6. Concepto de equipos y victoria

La V1 distingue entre **equipo** y **conteo de victoria**.

Ejemplo clave:

- La Prostituta pertenece al equipo Mafia.
- La Prostituta no cuenta como **Mafioso estricto**.
- La Prostituta sí cuenta como **no mafioso vivo** para la paridad de victoria de Mafia.
- Para que el Pueblo gane, deben morir todos los Mafiosos estrictos.
- Si todos los Mafiosos estrictos mueren, el Pueblo gana aunque la Prostituta siga viva.

Condiciones base:

- **Mafia gana** si los Mafiosos estrictos vivos alcanzan paridad o superioridad respecto de los no mafiosos vivos. En este conteo, "no mafiosos vivos" incluye a todos los jugadores vivos que no sean Mafiosos estrictos, incluida la Prostituta.
- **Pueblo gana** si no queda ningún Mafioso estricto vivo.
- **Empate** es un resultado válido, aunque poco frecuente, si una resolución elimina simultáneamente las condiciones de victoria normales o deja a todos los bandos sin ganador claro.

La victoria solo se evalúa en dos momentos:

1. Al confirmar la resolución nocturna completa.
2. Al confirmar el linchamiento diurno.

No se evalúa a mitad de una cadena de efectos.

---

## 7. Flujo general de partida

### 7.1. Preparación

1. Dios crea una nueva partida.
2. Selecciona jugadores activos desde la lista local.
3. Puede crear, editar, eliminar o agregar invitados.
4. Ordena la ronda en sentido horario, empezando por el jugador sentado a la izquierda de Dios.
5. Configura manualmente el set de cartas.
6. La app valida que la cantidad de cartas coincida con la cantidad de jugadores.
7. Dios reparte cartas físicas al azar.
8. Se inicia la primera noche.

### 7.2. Primera noche

La app guía a Dios en un orden fijo de llamados. En esta primera noche se identifican roles y, cuando corresponde, esos roles también actúan.

Orden V1:

1. Abuela con Escopeta: identificación.
2. Romeo y Julieta: identificación.
3. Prostituta: identificación y acción nocturna.
4. Mafiosos: identificación y asesinato.
5. Médicos: identificación y protección.
6. Detectives: identificación e investigación.
7. Inferir civiles automáticamente.
8. Resolver noche.

Los civiles no se llaman. Todo jugador activo sin rol asignado al final de la primera noche es asignado automáticamente como Civil.

### 7.3. Noches posteriores

La app ya conoce los roles. Cada noche guía acciones en orden fijo, registra objetivos, calcula estados y luego presenta una vista de resolución antes de confirmar el amanecer.

### 7.4. Día

Durante el día:

1. Se muestra el resultado público de la noche.
2. Se abre discusión libre.
3. Se inicia votación.
4. La app elige automáticamente jugador inicial y sentido de votación.
5. Dios registra cada voto individual.
6. La app detecta empate, mayoría, defensa, cambio de votos y ejecución.
7. Se confirma el linchamiento.
8. Se evalúa condición de victoria.

---

## 8. Votación diurna

La votación se realiza en ronda.

- El jugador inicial se elige automáticamente.
- El sentido de votación se elige automáticamente: horario o antihorario.
- Dios puede rerollear el orden máximo una vez antes de iniciar la votación.
- El orden resultante y el reroll quedan registrados en log privado.
- Dios carga cada voto individualmente.
- No existen abstenciones en V1.
- Pueden existir votos anulados en futuras reglas.
- Ejecución inmediata ocurre si alguien recibe el 70% o más de los votos emitidos, redondeado hacia arriba.

Si hay empate, vuelve la discusión.

Si hay un más votado sin mayoría abrumadora, ese jugador se defiende. Luego se permite un ciclo libre de cambios de voto. La app recalcula el resultado.

Si un jugador ya se defendió una vez durante ese mismo día y vuelve a ser el más votado, muere directamente.

El ciclo de discusión, defensa y cambios puede repetirse indefinidamente hasta que alguien muera. Siempre debe morir alguien por día.

---

## 9. Romeo y Julieta en votación

Romeo y Julieta comparten voto forzosamente.

Si uno vota primero, el otro queda obligado a votar lo mismo. Cuando llega el turno del segundo, la app registra automáticamente el mismo voto, pero debe conservar el paso visual para que Dios no delate públicamente que ese jugador fue saltado.

Si uno cambia voto, el otro cambia automáticamente.

La penalización por no cumplir teatralmente el voto compartido queda fuera de V1 y se tratará junto con futuras reglas sociales.

---

## 10. Logs

MafiApp maneja dos registros diferentes.

### 10.1. Log privado

Visible solo para Dios. Registra:

- Asignaciones de roles.
- Acciones nocturnas.
- Objetivos.
- Inhibiciones.
- Protecciones.
- Intentos de asesinato.
- Investigaciones.
- Resoluciones.
- Cambios de asiento.
- Orden de votación.
- Rerolls.
- Deshacer.
- Correcciones.
- Evaluaciones de victoria.

### 10.2. Log público

Sirve como texto sugerido para narrar a los jugadores. Solo comunica resultados públicos finales.

Ejemplo correcto:

```txt
La ciudad despierta.
Murió Pablo.
```

No debe revelar intentos fallidos, protecciones, inhibiciones, causas de muerte secretas ni información clasificada.

Ejemplo incorrecto:

```txt
La Mafia intentó matar a Sofi, pero fue salvada. Además Pablo murió por apuntar a la Abuela.
```

---

## 11. UI discreta

La app debe mostrar la información de forma clara pero prudente.

- Modo oscuro recomendado por defecto.
- Los roles no se muestran en la vista principal salvo que Dios active un botón de ojo.
- Sin ojo: se muestran estado vivo/muerto y estados públicos.
- Con ojo: se agregan roles y estados secretos.
- La vista principal debe ser visual, usando cards, badges e iconos.
- Los detalles pueden verse mediante tap o tooltip.
- La situación actual debe poder consultarse sin interrumpir el flujo principal de noche o día.

No se requiere PIN o bloqueo secreto en V1.

---

## 12. Roadmap sugerido

### V1

Asistente offline para Dios con roles base, noche, votación y victoria.

### V1.1

- Helper de interacciones complejas por carta.
- Mejoras de UX en situación actual.
- Penalizaciones sociales opcionales.
- Refinamiento del módulo de votación.

### V2

- Pantalla pública para TV/tablet.
- Más roles: Bufón, Kamikaze, Carnicero, Abogado, Alien, Chuck Norris, Mimo, Bruja/Nigromante.
- Configuraciones guardadas.
- Presets por cantidad de jugadores.

### V3

- App companion para jugadores.
- QR o código de partida.
- Roles digitales opcionales.
- Sincronización local o remota.

---

## 13. Documentación adicional

La documentación principal de la V1 está en:

```txt
docs/SPEC_V1.md
docs/ROLES_V1.md
```

- `docs/SPEC_V1.md`: especificación funcional y técnica general de la V1.
- `docs/ROLES_V1.md`: especificación detallada de roles, estados, tipos de muerte, orden de resolución nocturna e interacciones entre cartas.
