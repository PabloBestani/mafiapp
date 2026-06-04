# MafiApp — Sistema de diseño V1

Este documento fija el criterio visual y UX para implementar la UI de MafiApp V1. La fuente de identidad es el lomo físico de las cartas, guardado en `assets/brand/mafiapp-card-back.jpg`.

La app es una herramienta operativa para Dios durante partidas presenciales. Debe sentirse sobria, discreta, rápida y confiable. La estética puede tener tensión de mafia/noir, pero la interfaz no debe volverse teatral ni competir con la información secreta.

---

## 1. Principios de experiencia

1. **Operativa antes que decorativa**  
   La primera pantalla útil debe permitir continuar partida, crear partida o gestionar jugadores. No usar una landing de presentación.

2. **Discreción por defecto**  
   Roles, equipos, objetivos e inhibiciones se ocultan salvo que Dios active el modo ojo. La UI sin ojo muestra estado vivo/muerto y datos públicos.

3. **Flujo guiado y reversible**  
   Cada fase debe tener una acción principal clara, historial visible y deshacer accesible. Confirmaciones fuertes usan modal.

4. **Densidad tranquila**  
   El diseño debe ser compacto y escaneable. Evitar hero sections, tarjetas gigantes y ornamento excesivo durante partida.

5. **Un toque cuando sea seguro**  
   Chips de jugadores y opciones de rol deben registrar acciones directamente si el resultado es reversible. Confirmar solo para resoluciones fuertes.

6. **La app no delata**  
   La pantalla debe evitar saltos visuales sospechosos. Ejemplo: Romeo/Julieta autovotan, pero el paso visual del segundo amante sigue existiendo.

---

## 2. Dirección visual

La identidad toma del lomo:

- fondo negro profundo;
- rojo sangre como acento principal;
- bordes oliva/sage envejecidos;
- beige grisáceo para marca y detalles;
- siluetas negras y composición centrada.

Traducción a UI:

- fondo general oscuro, casi negro;
- superficies elevadas en negro carbón, no gris azulado dominante;
- rojo reservado para fase crítica, muerte, mafia, peligro o acción destructiva;
- verde/sage para confirmación, estados seguros y bordes de marca;
- texto principal cálido, no blanco puro;
- textura visual mínima: bordes finos, sombras suaves, acentos de línea.

Evitar:

- fondos rojos permanentes;
- degradados dominantes;
- estética de casino;
- exceso de sangre, salpicaduras o dramatismo;
- cards dentro de cards;
- una UI monocromática roja.

---

## 3. Paleta V1

Tokens base:

| Token | Hex | Uso |
|---|---:|---|
| `color.bg` | `#080909` | fondo global |
| `color.bgRaised` | `#111315` | superficies principales |
| `color.surface` | `#191B1A` | paneles y cards |
| `color.surfaceAlt` | `#23241F` | barras, tabs, elementos secundarios |
| `color.border` | `#3F4437` | divisores y contornos sobrios |
| `color.borderStrong` | `#6F7259` | contornos de marca o foco no crítico |
| `color.text` | `#F1EDE2` | texto principal |
| `color.textMuted` | `#B8B5A6` | texto secundario |
| `color.textDim` | `#7E7D70` | metadatos |
| `color.brandRed` | `#A40000` | marca y acentos importantes |
| `color.brandRedDark` | `#650000` | fondos rojos contenidos |
| `color.brandRedSoft` | `#D14A3E` | errores/alertas con contraste |
| `color.sage` | `#989878` | acento sobrio, confirmación secundaria |
| `color.olive` | `#505040` | bordes, chips apagados |
| `color.success` | `#7FA66A` | éxito/guardado |
| `color.warning` | `#D0A85C` | advertencia reversible |
| `color.danger` | `#D14A3E` | muerte, eliminar, cancelar fuerte |
| `color.info` | `#8FA8B8` | información neutral |

Regla de proporción:

- 70% negros/carbón;
- 15% neutros cálidos;
- 10% sage/oliva;
- 5% rojo.

El rojo gana significado si aparece poco.

---

## 4. Tipografía

Usar la fuente nativa del sistema para rendimiento y legibilidad.

Escala:

| Token | Tamaño | Line height | Uso |
|---|---:|---:|---|
| `display` | 28 | 34 | Home y título de flujo principal |
| `title` | 22 | 28 | Pantalla o fase |
| `section` | 18 | 24 | Secciones |
| `body` | 16 | 22 | texto común |
| `label` | 14 | 18 | labels, chips, badges |
| `meta` | 12 | 16 | metadatos |

Reglas:

- no usar letter spacing negativo;
- no escalar fuente con viewport;
- evitar textos largos dentro de chips;
- títulos de fase deben ser cortos: `Noche 2`, `Votación`, `Resolver noche`.

---

## 5. Layout y navegación

### Estructura base

Pantalla operativa:

1. Top bar compacta: fase, día/noche, botón ojo, undo, menú.
2. Área de foco: acción principal de la fase.
3. Panel colapsable o tabs: vivos, muertos, log, situación.
4. Bottom action bar: acción primaria y secundaria contextual.

### Rutas sugeridas

- `Home`
- `Players`
- `NewGameSetup`
- `Game`
- `Logs`
- `Corrections`

No separar cada paso de noche en rutas profundas si complica volver o deshacer. Preferir un estado de flujo dentro de `Game`.

### Dimensiones

- margen pantalla: 16 px;
- gap base: 12 px;
- card radius: 8 px máximo;
- chip radius: 999 px solo para chips pequeños;
- touch target mínimo: 44 x 44 px;
- bottom bar fija: 72-88 px.

---

## 6. Componentes base

### PlayerChip

Uso: seleccionar jugador, objetivo, votado o rol identificado.

Estados:

- default;
- selected;
- disabled;
- dead;
- pending;
- secret-highlight, solo con ojo activo.

Debe mostrar nombre siempre. Rol solo con ojo activo o dentro de Correcciones.

Cuando el rol sea visible, el chip puede anteponer ícono de rol para ahorrar espacio.

Cuando un chip está deshabilitado por regla de juego, debe seguir visible y responder al toque con una razón compacta de 1 a 5 palabras. Ejemplos: `Muerto`, `Sin autovoto`, `No puede automatarse`.

Íconos V1:

- Civil: `account-outline`.
- Mafioso: `pistol`.
- Médico: `medical-bag`.
- Detective: `magnify`.
- Abuela con Escopeta: `gun`.
- Romeo/Julieta: `heart`.
- Prostituta: `lipstick`.

### PlayerCard

Uso: listas de jugadores, situación actual, vivos/muertos.

Contenido:

- nombre;
- estado vivo/muerto;
- posición de asiento;
- badges públicos;
- badges secretos solo con ojo.

No convertir cada pantalla en grilla de cards grandes. Durante noche/votación, los chips son preferibles.

### PhaseHeader

Muestra:

- fase;
- día/noche;
- progreso del flujo;
- ojo, solo cuando alterna datos visibles;
- undo;
- acceso a log.

Debe ocupar poco alto y no robar foco.

### ActionSheet / Modal

Uso:

- confirmaciones fuertes;
- correcciones de Dios;
- terminar/cancelar partida;
- seleccionar opciones menos frecuentes.

Los modales destructivos usan rojo, texto concreto y botón cancelar como primera opción visual.

### LogPanel

Debe separar tabs:

- `Privado`;
- `Público`.

El log público debe ser copiables/narrable, sin revelar causas ocultas.

### SegmentedControl

Usos:

- vivos/muertos;
- privado/público;
- día/noche cuando corresponda;
- setup por pasos.

---

## 7. Estados visuales

| Estado | Color | Tratamiento |
|---|---|---|
| Vivo | `text` + borde `sage` tenue | normal |
| Muerto | `textDim`, opacidad baja | no interactivo salvo log |
| Seleccionado | borde `sage`, fondo `surfaceAlt` | claro sin gritar |
| Mafia/amenaza | `brandRed` | solo con ojo o log privado |
| Protegido | `success` | secreto salvo que ojo activo |
| Inhibido | `warning` | secreto salvo log privado/ojo |
| Error reversible | `warning` | toast o inline |
| Acción destructiva | `danger` | confirmación fuerte |

---

## 8. Motion e interacción

Animaciones sencillas:

- fade/slide de 120-180 ms al cambiar paso de flujo;
- press feedback en chips y botones;
- collapse/expand de paneles en 180-220 ms;
- toast de autosave/deshacer en 160 ms;
- modal con fade + scale leve.

No usar:

- animaciones largas;
- loops decorativos durante partida;
- efectos dramáticos al morir alguien;
- transiciones que demoren registrar una acción.

Respetar `prefers-reduced-motion` cuando aplique en plataforma. Si se implementa con React Native Reanimated, todo motion debe tener alternativa instantánea.

---

## 9. Uso del logo/lomo

Asset: `assets/brand/mafiapp-card-back.jpg`.

Usos permitidos:

- splash;
- Home, como imagen pequeña o fondo muy oscurecido;
- empty state de partida;
- acerca de / configuración;
- miniatura para preset visual de cartas físicas.

Assets derivados:

- `assets/app/icon.png`: icono cuadrado sin texto ni marco, basado en los tres hombres del lomo.
- `assets/app/splash.png`: lomo completo para splash.
- `assets/brand/mafiapp-wordmark.png`: logotipo transparente para header o marca compacta.

Reglas:

- no usarlo como fondo de pantalla de noche o votación;
- no poner texto operativo encima salvo overlay oscuro >= 70%;
- no recortar la silueta principal de forma que parezca otro logo;
- no repetirlo como pattern;
- mantener proporción original vertical.

Para splash, preferir fondo `#080909` y el lomo centrado con ancho 52-62% del viewport.

---

## 10. Accesibilidad

Requisitos mínimos:

- contraste AA para texto y controles;
- labels accesibles en botones de icono: ojo, undo, menú, log;
- estados no deben depender solo de color;
- foco visible en web/dev y navegación por teclado cuando aplique;
- targets táctiles de 44 px mínimo;
- textos dinámicos no deben desbordar chips/cards;
- feedback de autosave/deshacer anunciado de forma no invasiva;
- modales atrapan foco y vuelven al disparador.

En modo ojo, evitar revelar todo por accidente: el botón debe tener estado visual claro y un label explícito.

---

## 11. Copy y tono

Tono de UI:

- directo;
- breve;
- funcional;
- sin chistes ni dramatismo.

Ejemplos:

- `Iniciar noche`
- `Resolver noche`
- `Confirmar amanecer`
- `Deshacer voto`
- `Cancelar partida`
- `Mostrar secretos`
- `Ocultar secretos`

Evitar:

- textos explicando cómo usar toda la app dentro de la UI;
- frases largas en botones;
- lenguaje que revele roles en vistas públicas.

---

## 12. Handoff para implementación

Prioridad recomendada:

1. Crear `theme` compartido desde `src/ui/theme/tokens.ts`.
2. Reemplazar estilos sueltos por tokens.
3. Implementar componentes base: `PhaseHeader`, `PlayerChip`, `PlayerCard`, `SegmentedControl`, `BottomActionBar`, `LogPanel`.
4. Armar layout shell de `Game` con modo ojo y undo visibles.
5. Implementar Home y Players con el lomo de cartas como branding discreto.
6. Agregar motion después de que los flujos sean funcionales.

Checklist para PR de UI:

- no hay roles visibles sin ojo;
- no hay cards dentro de cards;
- botones críticos tienen confirmación;
- rojo usado solo para marca/danger;
- textos no se cortan en 360 px de ancho;
- todos los icon buttons tienen label accesible;
- los estados tienen color + texto/icono;
- el lomo aparece solo en contextos no operativos.
