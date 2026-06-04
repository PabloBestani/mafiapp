# MafiApp — Especificación de roles V1

Este documento detalla la lógica completa de los roles implementados en **MafiApp V1**.

Complementa a `docs/SPEC_V1.md`, que define el flujo general de la aplicación y las restricciones técnicas. Acá se describen los estados, tipos de muerte, orden de resolución nocturna y reglas particulares de cada rol.

---

## 1. Categorías de muerte

El motor de reglas distingue varias formas de morir. Estas categorías determinan si una muerte puede prevenirse o no, y qué efectos prevalecen.

### 1.1. Asesinato común

Es la muerte producida por un ataque nocturno estándar, como el asesinato de la Mafia o el disparo de la Abuela.

Características:

- **Salvable por Médico:** si el objetivo recibe protección médica esa misma noche, sobrevive a todos los asesinatos comunes que lo afecten.
- **Bloqueable por blindaje nocturno:** si el rol posee blindaje nocturno, es inmune a asesinatos comunes mientras el blindaje esté activo.
- **Resolución conjunta:** múltiples asesinatos comunes sobre un mismo objetivo no se acumulan. Una única protección válida alcanza para evitar todos esos asesinatos comunes.

### 1.2. Envenenamiento

Es una muerte especial que **atraviesa blindajes** y **no puede ser salvada por el Médico**.

En V1, el único origen de envenenamiento es el contraataque de **Romeo y Julieta** cuando uno de ellos muere: el segundo amante, antes de morir de pena, puede envenenar a otro jugador vivo.

El envenenamiento se resuelve después de aplicar asesinatos comunes, protecciones y blindajes.

### 1.3. Suicidio o muerte por vínculo

Es una muerte automática causada por un vínculo entre roles.

En V1 aplica a Romeo y Julieta: si uno muere, el otro muere inmediatamente de pena.

Esta muerte:

- no puede ser evitada por el Médico;
- no puede ser evitada por blindaje nocturno;
- no cuenta como asesinato común;
- puede disparar efectos posteriores, como el envenenamiento del segundo amante.

### 1.4. Explosión (categoría futura)

Algunas cartas futuras, como Kamikaze o Chuck Norris, podrán causar muertes por **explosión**.

Aunque no se implementa en V1, se reserva la categoría para muertes que, típicamente, atraviesen blindajes y no sean salvables por Médico.

---

## 2. Estados y efectos

### 2.1. Inhibido

Un jugador **inhibido** pierde su habilidad nocturna durante esa noche.

Desde su perspectiva, el jugador sigue despertándose o actuando normalmente. Dios puede permitir que señale o simule su acción para no revelar la inhibición, pero el motor no aplica el efecto de esa acción.

Reglas:

- El inhibido **no sabe** que fue inhibido.
- El inhibido **no cuenta como presente** para efectos de la Abuela. Aunque apunte teatralmente a la Abuela, no se considera que haya visitado su casa.
- Si un único actor de un rol grupal queda inhibido, la acción grupal se cancela.
- Si hay varios actores vivos de un rol grupal y solo uno queda inhibido, la acción grupal se ejecuta con los demás.
- Si la Abuela es inhibida, pierde su escopeta y su blindaje durante esa noche.

### 2.2. Protegido

Un jugador **protegido** por el Médico es inmune a **todos los asesinatos comunes** que lo afecten esa noche.

La protección:

- evita asesinatos comunes de Mafia;
- evita disparos de Abuela;
- no evita envenenamientos;
- no evita muertes por vínculo;
- no evita explosiones futuras, salvo que una regla futura diga lo contrario.

La protección no se consume: si un jugador protegido recibe varios asesinatos comunes en la misma noche, sobrevive a todos.

### 2.3. Blindado nocturno

Un rol con **blindaje nocturno** es inmune a asesinatos comunes mientras su blindaje esté activo.

En V1, la **Abuela con Escopeta** es el único rol con blindaje nocturno.

Reglas:

- El blindaje funciona solo contra asesinatos comunes.
- El blindaje no protege contra envenenamiento, vínculo ni explosión.
- Si la Abuela queda inhibida, pierde el blindaje esa noche.

---

## 3. Orden de resolución nocturna

El motor aplica las acciones nocturnas en un orden fijo para resolver interacciones complejas.

Pipeline V1:

1. **Inhibición:** se llama a la Prostituta si existe y está viva. La app registra a quién inhibe y marca al objetivo como inhibido para esa noche.
   - Si el objetivo es la Abuela, se desactivan su escopeta y su blindaje.
   - Si el objetivo es el único actor vivo de un rol grupal, esa acción se cancela.
   - Si el rol tiene varios actores vivos, la acción grupal sigue con los demás.
2. **Asesinato de la Mafia:** se despiertan los Mafiosos vivos habilitados. Si existe al menos un Mafioso estricto vivo y habilitado, el grupo elige una víctima viva. Esta muerte es **asesinato común**.
   - Los Mafiosos pueden matar a un integrante del propio grupo si hay más de un Mafioso vivo.
   - Si queda un único Mafioso vivo, no puede matarse a sí mismo.
   - Si queda un único Mafioso vivo y está inhibido, no hay asesinato esa noche.
3. **Protección del Médico:** se despiertan los Médicos vivos habilitados. Si existe al menos un Médico habilitado, el grupo elige a quién proteger.
   - Pueden protegerse a sí mismos.
   - Pueden repetir objetivo noche tras noche.
   - Si protegen a la Abuela no inhibida, la protección contra ella no se aplica y la Abuela dispara contra un Médico, según las reglas de Abuela.
4. **Investigación del Detective:** se despiertan los Detectives vivos habilitados. Si existe al menos un Detective habilitado, investigan a un jugador vivo.
   - La app muestra “Mafioso” solo si el objetivo es Mafioso estricto.
   - En todos los demás casos muestra “No Mafioso”.
   - Si la investigación efectiva queda cancelada por inhibición, Dios debe informar la respuesta opuesta a la verdad.
   - La respuesta se obtiene durante la noche aunque el Detective muera después.
5. **Reacciones de la Abuela:** el motor revisa quién apuntó a la Abuela. Si la Abuela está viva y no inhibida:
   - cualquier jugador o grupo que la señale queda expuesto a su escopeta;
   - la Prostituta es inmune a la escopeta y puede inhibirla sin morir;
   - la acción contra la Abuela normalmente no surte efecto porque la Abuela “gana en velocidad”;
   - la excepción es el Detective, que recibe su respuesta antes de morir;
   - si un grupo la señala, muere un solo integrante: el jugador vivo/habilitado más cercano a la Abuela según el orden circular de vivos; si hay empate de distancia, se elige al azar;
   - la muerte causada por la escopeta es asesinato común y puede ser salvada por el Médico.
6. **Aplicar asesinatos comunes:** el motor aplica todos los asesinatos comunes registrados y no cancelados.
   - Si la víctima tiene blindaje activo, el asesinato se cancela.
   - Si la víctima está protegida, sobrevive.
   - En los demás casos, la víctima muere.
7. **Resolver vínculo Romeo/Julieta:** si uno de los amantes muere durante esta ventana de resolución, se activa el vínculo.
   - El amante sobreviviente muere de pena.
   - Antes de morir, puede envenenar a un jugador vivo.
   - Si ambos amantes mueren simultáneamente en la misma ventana de resolución, ninguno envenena.
   - Si la primera muerte ocurre de noche y el segundo amante estaba inhibido esa noche, muere sin envenenar.
8. **Aplicar envenenamientos:** los objetivos marcados por Romeo/Julieta mueren por envenenamiento.
   - El veneno atraviesa blindajes.
   - El veneno no puede ser salvado por Médico.
   - El veneno no puede apuntar al amante ya muerto ni al propio amante.
9. **Confirmar muertes y amanecer:** la app presenta preview de muertos, vivos y explicación privada. Dios confirma la resolución y la app genera el dictamen público.
10. **Evaluar victoria:** después de confirmar, el motor evalúa condiciones de victoria según Mafiosos estrictos vivos y no mafiosos vivos.

---

## 4. Roles V1

### 4.1. Civil

- **Equipo:** Pueblo.
- **Mafioso estricto:** No.
- **Acción nocturna:** ninguna.
- **Identificación:** no se despierta nunca.

Los jugadores activos sin otro rol asignado al final de la primera noche pasan automáticamente a ser Civiles.

### 4.2. Mafioso

- **Equipo:** Mafia.
- **Mafioso estricto:** Sí.
- **Acción nocturna:** asesinato común grupal.
- **Identificación:** primera noche y noches posteriores.

Reglas:

- Todos los Mafiosos vivos despiertan juntos.
- Deben elegir una víctima viva si existe al menos un Mafioso habilitado.
- Pueden matar a un Mafioso si hay más de un Mafioso vivo.
- Si queda un único Mafioso vivo, sigue matando normalmente, pero no puede matarse a sí mismo.
- Si el único Mafioso vivo está inhibido, no hay asesinato esa noche.
- La muerte causada por Mafia es asesinato común.
- El asesinato de Mafia puede ser salvado por Médico.
- Si la víctima es la Abuela y ella no está inhibida, la Abuela no muere por ese ataque y, en cambio, dispara contra un Mafioso según la regla de cercanía.

Condición de victoria:

- La Mafia gana si los Mafiosos estrictos vivos alcanzan paridad o superioridad respecto de los no mafiosos vivos.
- Si todos los Mafiosos estrictos mueren, gana el Pueblo aunque la Prostituta siga viva.

### 4.3. Médico

- **Equipo:** Pueblo.
- **Mafioso estricto:** No.
- **Acción nocturna:** protección grupal.
- **Identificación:** primera noche y noches posteriores.

Reglas:

- Uno o más Médicos vivos eligen a un jugador vivo para proteger.
- Pueden protegerse a sí mismos.
- Pueden repetir objetivo noche tras noche.
- Si más de un Médico está vivo y uno queda inhibido, la protección grupal sigue funcionando.
- Si queda un único Médico vivo y está inhibido, la protección se cancela.
- La protección salva al objetivo de todos los asesinatos comunes de esa noche.
- La protección no salva de envenenamiento ni muerte por vínculo.
- Si los Médicos protegen a la Abuela no inhibida, la protección sobre la Abuela no se aplica y un Médico muere por la escopeta.
- El disparo de la Abuela contra el Médico es asesinato común y puede ser salvado si otro Médico protege al Médico que recibe el disparo.

### 4.4. Detective

- **Equipo:** Pueblo.
- **Mafioso estricto:** No.
- **Acción nocturna:** investigación grupal.
- **Identificación:** primera noche y noches posteriores.

Reglas:

- Uno o más Detectives vivos eligen a un jugador vivo para investigar.
- La respuesta es “Mafioso” solo si el objetivo es Mafioso estricto.
- Para todos los demás roles, incluyendo Prostituta, Civil, Médico, Detective, Abuela, Romeo y Julieta, la respuesta es “No Mafioso”.
- Si la investigación efectiva queda cancelada porque todos los Detectives vivos fueron inhibidos, Dios informa el opuesto de la verdad.
- Si hay varios Detectives vivos y solo uno está inhibido, la investigación grupal se ejecuta normalmente y la respuesta es correcta.
- Si el Detective investiga a la Abuela no inhibida, recibe la respuesta antes de morir por la escopeta.
- Un Detective puede investigar a un jugador que muere esa misma noche; la respuesta se entrega igualmente.

### 4.5. Abuela con Escopeta

- **Equipo:** Pueblo.
- **Mafioso estricto:** No.
- **Acción:** pasiva nocturna.
- **Identificación:** se despierta en la primera noche; luego no se despierta más salvo corrección manual.

Reglas:

- Posee blindaje nocturno mientras no esté inhibida.
- Mientras su blindaje está activo, es inmune a asesinatos comunes.
- Si cualquier jugador o grupo la señala durante la noche, la Abuela dispara.
- La muerte causada por la escopeta es asesinato común.
- La Abuela “gana en velocidad”: la acción contra ella normalmente no se completa.
- La excepción es el Detective, que recibe la respuesta antes de morir.
- La Prostituta puede señalarla sin morir y la inhibe completamente.
- Si la Abuela queda inhibida, pierde escopeta y blindaje durante esa noche.
- Si un grupo la señala, muere un solo integrante: el jugador vivo/habilitado más cercano a la Abuela según el orden circular de vivos.
- Si hay empate de cercanía, se elige al azar.
- La escopeta no actúa contra envenenamientos ni explosiones.
- Romeo/Julieta pueden matar a la Abuela por veneno aunque esté blindada.
- Si un rol futuro mata a la Abuela por un efecto especial inmune a su escopeta, la Abuela todavía dispara contra otros visitantes de esa noche; su muerte se confirma al amanecer.

### 4.6. Romeo y Julieta

- **Equipo:** Pueblo.
- **Mafioso estricto:** No.
- **Acción nocturna normal:** ninguna.
- **Identificación:** primera noche solamente.

Reglas de voto:

- Comparten voto forzosamente durante el día.
- Si uno vota primero, el otro vota lo mismo.
- Si uno cambia voto, el otro cambia automáticamente.
- Cuando le toca votar al segundo amante, la app debe mostrar igualmente el paso visual para no delatar públicamente el autovoto.
- El autovoto solo es visible en la app de Dios.
- La penalización por no cumplir teatralmente el voto compartido queda fuera de V1 y se tratará como regla social futura.

Reglas de muerte y veneno:

- Si uno de los amantes muere, el otro muere inmediatamente de pena.
- Antes de morir, el segundo amante puede envenenar a un jugador vivo.
- No puede envenenarse a sí mismo.
- No puede envenenar al amante ya muerto.
- El envenenamiento atraviesa blindajes.
- El envenenamiento no puede ser salvado por Médico.
- Si la primera muerte ocurre durante el día, el segundo envenena sí o sí porque la inhibición nocturna ya no aplica.
- Si la primera muerte ocurre durante la noche, el segundo envenena al amanecer, salvo que haya sido inhibido esa misma noche por la Prostituta.
- Si ambos amantes mueren simultáneamente por la misma ventana de resolución, ninguno envenena.

Procedimiento público:

- Al amanecer o durante el día, cuando se informa que uno de los amantes murió, se anuncia inmediatamente que el otro también muere de pena.
- El segundo amante elige públicamente a quién envenenar.
- Los jugadores vivos pueden opinar y persuadir, pero la app registra la elección final.
- Dictamen público sugerido: `Murió X. Y murió de pena. Y se llevó a Z a la tumba por envenenamiento.`

### 4.7. Prostituta

- **Equipo:** Mafia.
- **Mafioso estricto:** No.
- **Acción nocturna:** inhibición individual.
- **Identificación:** primera noche y noches posteriores.

Reglas:

- Debe elegir a un jugador vivo cada noche.
- No puede inhibirse a sí misma.
- Puede repetir objetivo noche tras noche.
- Solo inhibe la habilidad nocturna del objetivo.
- No afecta votos ni estados diurnos.
- El inhibido actúa teatralmente, pero su acción no surte efecto.
- El inhibido no cuenta como presente para efectos de la Abuela.
- Si inhibe al único actor de un rol grupal, esa acción se cancela.
- Si quedan varios actores vivos/habilitados del rol grupal, la acción se ejecuta con los demás.
- Si inhibe al Detective efectivo y no hay grupo alternativo, Dios informa la respuesta opuesta a la verdad.
- La Prostituta es inmune al disparo de la Abuela.
- Si señala a la Abuela, la inhibe completamente y desactiva su escopeta y blindaje por esa noche.

Condición de victoria:

- Pertenece a la Mafia, pero no cuenta como Mafioso estricto.
- Si todos los Mafiosos estrictos mueren, la Prostituta no impide la victoria del Pueblo.

---

## 5. Reglas sociales pendientes

Quedan fuera de la V1, pero deben ser discutidas en iteraciones futuras:

- penalización por muertos que hablan;
- penalización por gestos o revelaciones indirectas;
- penalización o advertencia cuando Romeo/Julieta no votan teatralmente igual aunque la app los autovote;
- soporte para pantalla pública;
- helper avanzado de interacciones complejas por carta.

---

Este documento pretende servir como guía exhaustiva para implementar el motor de reglas de MafiApp V1. Versiones futuras podrán ampliar estos conceptos con roles adicionales, nuevas categorías de muerte y condiciones de victoria específicas.
