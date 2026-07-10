# AVANCE DEL PROYECTO — ERP Tactical Marketing
## Registro de decisiones y contexto (respaldo)

Fecha de este registro: 10 de julio de 2026

---

## 1. HISTORIAL DEL PROCESO

- **Herramienta 1 — ChatGPT:** Se inició el proyecto, pero solo pidió
  información repetidamente sin llegar a ninguna prueba concreta. Sin
  avance funcional.
- **Herramienta 2 — Gemini:** Organizó mucho mejor el proceso y avanzó
  bastante. Generaba archivos HTML que servían como mockups visuales
  (dieron una idea de cómo se vería el proyecto). Sin embargo, se bloqueó
  varias veces intentando construir demasiado en un solo proceso. Gemini
  mismo confirmó finalmente que no se podía hacer todo en un solo proceso.
- **Herramienta 3 — Claude (actual):** Se retoma el proyecto con un
  diagnóstico distinto: el bloqueo no fue por la herramienta en sí, sino
  por intentar construir el sistema completo (6 módulos, motor de precios
  con decenas de reglas interdependientes) de una sola vez, sin
  descomponerlo ni validarlo por partes.

---

## 2. DIAGNÓSTICO DEL PROBLEMA

El documento fuente (Dossier Maestro Absoluto y Diccionario de Datos —
ERP Tactical Marketing) describe un sistema de 6 módulos:

1. Cotizador y CRM
2. Producción (Kanban)
3. Contabilidad y Finanzas
4. Inventarios / Datos Maestros
5. Tareas Diarias (Matriz con regla de Rollover automático)
6. Informes y Reprocesos

El motor de cotización es la pieza más compleja: 6 líneas de producto
(Editorial, Publicomerciales, Rompecabezas, Promocionales, Empaques, Gran
Formato), cada una con sus propias tablas de troqueles, reglas de merma,
ruteo automático digital/offset, cubicaje dinámico entre 2 formatos de
pliego, descuentos escalonados, fondo de seguridad escalonado, escudo de
bajos montos, y un divisor financiero inverso aplicado sobre todo.

**Conclusión:** intentar construir esto en una sola sesión/proceso, sin
importar la IA usada, produce pérdida de consistencia (se olvidan reglas,
se mezclan condiciones de líneas distintas). La solución no es cambiar de
herramienta indefinidamente, sino cambiar el método: construcción modular
y validada.

---

## 3. LIMITANTES IDENTIFICADAS DEL CHAT DE CLAUDE.AI PARA ESTE PROYECTO

- No hay backend persistente real ni base de datos relacional (los
  artifacts solo permiten almacenamiento clave-valor simple, máx. 5MB por
  clave, solo texto/JSON).
- No hay autenticación multiusuario ni sesiones persistentes entre
  módulos dentro de un artifact.
- Ventana de contexto limitada por conversación — con un documento de
  reglas tan extenso, la probabilidad de "olvido" de reglas sube si se
  intenta generar demasiado código en la misma conversación.
- No se pueden ejecutar servicios continuos (ej. el job automático de
  Rollover a las 11:59 PM) desde el chat.

**Conclusión:** el chat de claude.ai sirve para diseñar la lógica,
estructurar el diccionario de datos y prototipar/validar el motor de
cálculo pieza por pieza — pero no para construir el ERP completo con
persistencia real. Para eso se recomienda **Claude Code** (app de
escritorio), que sí permite archivos reales persistentes, conexión a base
de datos, y trabajo incremental sin perder lo ya construido.

---

## 4. ESTIMACIÓN DE ESFUERZO (referencial, sujeta a validación real)

| Módulo | Desarrollo tradicional | Con IA organizada (Claude Code) |
|---|---|---|
| Motor de cotización (6 líneas + reglas financieras) | 300–500 h | 120–200 h |
| CRM (estados, escudo VIP) | 40–60 h | 15–25 h |
| Producción (Kanban) | 50–70 h | 20–30 h |
| Contabilidad/Finanzas | 60–90 h | 25–40 h |
| Inventarios/Datos maestros | 30–40 h | 10–15 h |
| Tareas diarias + Rollover | 25–35 h | 10–15 h |
| Informes y reprocesos | 30–50 h | 12–20 h |
| Infraestructura base (auth, BD, PDF, integraciones, UI) | 60–100 h | 30–50 h |
| Integración y validación cruzada contra Litoplan | 80–120 h | 40–60 h |
| **Total estimado** | **~675–1.065 h** | **~280–455 h** |

En calendario, con dedicación parcial (10-15h/semana, más realista si
sigues operando el negocio en paralelo) usando IA: **~4.5 a 10 meses**.

El motor de cotización representa ~40-45% del esfuerzo total porque cada
línea de producto tiene reglas propias de troquel, merma y ruteo. Es la
pieza que más mueve el número total.

---

## 5. MÉTODO DE TRABAJO ACORDADO

**Regla central:** no construir el sistema completo de una vez. Se
descompone en piezas verificables:

1. Trabajar **una sola línea de producto a la vez**, empezando por la que
   ya tiene avance previo (plantilla parcial en Google Docs): **Editorial
   y Cuadernos**.
2. Antes de programar, recolectar **10-15 cotizaciones reales ya
   calculadas en Litoplan** (con su resultado final en COP) como casos de
   prueba objetivos.
3. Construir la función de cálculo de esa línea (sin interfaz visual
   todavía) y validarla contra esos casos uno por uno hasta que cuadren al
   100%.
4. Solo después de validar una línea, se agrega la siguiente como pieza
   independiente — no se mezclan.
5. Cuando el motor de cálculo completo esté probado, ahí se conecta a
   base de datos, interfaz visual y al resto de módulos (CRM, Kanban,
   etc.), que son estructuralmente más simples.

**Herramienta recomendada para la ejecución:** Claude Code (app de
escritorio de Anthropic), en modo Local, trabajando sobre archivos reales
en una carpeta de proyecto, con revisión manual de cada cambio antes de
aplicarlo (modo por defecto).

---

## 6. ESTADO ACTUAL / PRÓXIMO PASO

- Se generó una **solicitud estructurada (Fase 1)** para pegar en Claude
  Code, con:
  - Alcance limitado explícitamente a la línea Editorial/Cuadernos.
  - Instrucción de no avanzar a otras piezas sin confirmación del usuario.
  - Diccionario de datos en JSON extraído del Dossier Maestro,
    específico para cuadernos: motor financiero general, precios de
    sustratos, motor de impresión digital/offset, y los 4 submódulos
    (tapas, taco, guardas, armado y encuadernación).
  - Instrucción de pedir al usuario 10-15 casos reales de Litoplan antes
    de escribir cualquier función de cálculo.

  Archivo: `solicitud_claude_code_motor_cotizacion_cuadernos.md`

- **Decisión del usuario:** además de esa solicitud, se anexará también
  al primer mensaje de Claude Code el Dossier Maestro completo (todas las
  líneas y módulos) como contexto de referencia para fases futuras, con
  una aclaración explícita de que el trabajo actual es solo Fase 1 y que
  el resto del dossier es solo información de fondo, no una instrucción
  de construir todo ya.

- **Próximo paso pendiente del usuario:** reunir los 10-15 casos de
  cotizaciones reales de Litoplan (cuadernos) para entregárselos a Claude
  Code como casos de prueba, o traerlos primero a este chat para
  estructurarlos juntos antes de pasarlos.

---

*Fin del registro de avance.*
