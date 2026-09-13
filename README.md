# Impulso

Aplicación web para ordenar una búsqueda de trabajo: cargas tu información una vez y desde ahí
salen el CV, las cartas de presentación, el análisis de cada oferta y el seguimiento de las
postulaciones.

Funciona entera en el navegador. No hay servidor, no hay cuentas y nada de lo que escribes sale de
tu equipo: todo se guarda en `localStorage` y puedes exportarlo a un archivo JSON cuando quieras.

## Empezar sin escribir nada

Llenar un perfil campo por campo espanta a cualquiera, así que lo primero que ofrece la app es
traer lo que ya existe. Los cuatro caminos procesan el archivo en el navegador; nada se sube.

| Origen | Qué hace |
|---|---|
| **CV en PDF** | Extrae el texto con pdf.js y lo reparte en secciones. Necesita un PDF con texto seleccionable: un escaneo no se puede leer y la app lo dice. |
| **CV en Word (.docx)** | Un `.docx` es un ZIP con el documento en XML; se abre y se lee de ahí. |
| **Copia de datos de LinkedIn** | El ZIP oficial (Configuración → Privacidad de los datos → Obtener una copia de tus datos). Es la vía más fiel: son los CSV tal como los tiene LinkedIn, no un texto adivinado. |
| **PDF del perfil de LinkedIn** | «Más → Guardar en PDF» en tu perfil, sin esperar el correo de la copia de datos. |
| **Pegar texto** | El camino que funciona siempre, con cualquier formato. |

Lo detectado **nunca se guarda directo**: se muestra en una pantalla de revisión con el conteo por
sección, casillas para descartar lo que no sirva y la opción de reemplazar o sumar a lo que ya
tengas. Recién ahí pasa al perfil, donde se edita campo por campo.

Hay dos lectores. El **incluido** es heurístico: ancla las fechas para cortar los cargos, separa
puesto de empresa con un diccionario de palabras y reconoce encabezados en español y en inglés.
Funciona sin conexión y sin costo, pero adivina la estructura del documento, así que con un CV de
dos columnas, con tablas o con encabezados poco comunes se equivoca y manda datos a campos que no
corresponden. El **asistente con IA** (abajo) resuelve justamente eso.

## Asistente con IA (opcional)

Si conectas un modelo en Ajustes, el texto se interpreta en vez de adivinarse con reglas. Sirve
para cuatro cosas:

- **Leer un perfil profesional pegado de cualquier parte**: un CV en PDF, tu perfil de LinkedIn, tu
  portafolio, un Google Docs, la ficha de una bolsa de empleo. Los menús, botones y avisos de
  cookies que vienen pegados de una web se descartan solos.
- **Leer un aviso de trabajo**, pegado o —con Claude— directamente desde su enlace.
- **Escribir la carta de presentación** cruzando tu perfil con el aviso al que postulas, en el tono
  que elijas: directo, formal, cercano o muy breve. El aviso se pega en la propia carta o se lee
  desde su enlace; no hace falta crear antes una postulación.
- **Reescribir un logro** del CV: propone tres versiones y, si al logro le falta una cifra, la
  pide en vez de inventarla.

### Cartas: cómo se evita que invente

Una carta que afirma cosas falsas sobre ti o sobre la empresa es peor que no mandar carta. Tres
medidas, en orden de fiabilidad:

1. El perfil se le entrega formateado y se le prohíbe usar cualquier dato que no esté ahí.
2. Sobre la empresa solo puede afirmar lo que diga el aviso o lo que tú hayas escrito como motivo;
   si no, tiene que dejar un hueco entre corchetes.
3. **Una verificación que no depende del modelo**: si no escribiste un motivo y la carta no dejó
   ningún hueco, la app asume que el motivo se lo inventó y te avisa que revises ese párrafo.
   Probando con un modelo local, el punto 2 se saltó y el 3 lo atajó.

### Leer un aviso desde su enlace

Un navegador no puede abrir la página de un portal de empleo: se lo impide la política de orígenes.
Quedan dos vías, y en las dos alguien más ve el enlace, así que la app lo dice antes:

- **Con Claude** viene incluido: la página la lee el servidor de Anthropic, que ya es tu proveedor,
  sin sumar a nadie más. *(No probado de punta a punta: requiere una clave de Anthropic.)*
- **Con cualquier otro proveedor**, incluido un modelo local, se puede activar un lector externo
  (`r.jina.ai`) que convierte la página en texto. Viene **apagado**: ese servicio ve a qué estás
  postulando. Tu CV y tus datos no salen, solo el enlace.

No funciona en todas partes: los sitios que arman la página con JavaScript o piden sesión iniciada
—LinkedIn entre ellos— no se dejan leer, y ahí la app te dice que pegues el texto.

El texto que devuelve el lector se limpia antes de usarlo: se quitan menús, publicidad y las URL de
cada enlace. No es cosmética. En un aviso real de Chiletrabajos, esa basura era el **66% del texto**
(14.021 caracteres contra 4.400 de contenido) y el aviso de verdad quedaba fuera al recortar, con lo
que el modelo no veía la oferta y respondía cualquier cosa.

Probado con avisos reales de Get on Board y Chiletrabajos: de 1 a 4 segundos en leer la página, y
salen correctos el cargo, la empresa, la ubicación y el sueldo.

### Cuando el modelo contesta en vez de escribir

Un modo de fallo real: se le pide la carta y responde como asistente («Hola Cristóbal, he revisado
tu perfil… ¿te gustaría que redacte una carta?»). Cumple el esquema, así que la validación de tipos
lo deja pasar. La app revisa el texto —preguntas, comentarios sobre el perfil, listas de pasos,
saludar a quien firma— y si detecta dos o más señales, reintenta insistiendo; si vuelve a fallar,
avisa en vez de guardar eso como carta.

### Cuando tu perfil no calza con el aviso

Si el calce con el aviso baja del 25%, la app avisa **antes** de escribir. La razón es concreta:
probando con un perfil de logística contra un aviso de desarrollo backend, el modelo —cumpliendo la
regla de no inventar— escribió una carta que empezaba «no calzo para este puesto». Honesto e
inservible. Ahora el prompt le prohíbe evaluar la candidatura (eso lo decide quien contrata) y la
app te deja decidir si igual quieres escribirla.

### Con qué se puede conectar

| Proveedor | Costo | Notas |
|---|---|---|
| **Ollama** (en tu computador) | Gratis | Nada sale de tu equipo. Acepta llamadas desde `localhost` sin configurar nada. |
| **LM Studio** (en tu computador) | Gratis | Igual que Ollama, con interfaz gráfica. Hay que activar «Enable CORS» en el servidor. |
| **Google Gemini** | Capa gratuita | Clave desde Google AI Studio, sin tarjeta. |
| **Groq** | Capa gratuita | Tope diario, muy rápido. |
| **OpenRouter** | Modelos `:free` | Muchos modelos con una sola clave. |
| **Claude (Anthropic)** | De pago | El más preciso con un CV mal maquetado. |
| Otro compatible con OpenAI | — | Mistral, Together, DeepSeek, tu propio servidor. |

Claude va por su SDK oficial; el resto comparte un único transporte compatible con el formato de
OpenAI. Todos fueron comprobados desde el navegador: los cinco servicios de la nube responden a
peticiones desde otro origen, y Ollama también.

### Detalles que importan

- **Es opcional y con respaldo.** Sin configurar nada, la app funciona completa con el lector
  incluido; la lectura sin IA queda siempre disponible como alternativa y como respaldo automático
  si la llamada falla.
- **Con un modelo local no sale nada de tu equipo.** Con uno en la nube, viaja solo el texto que le
  pidas leer en ese momento; el resto del perfil, las postulaciones y las notas no salen nunca.
- **La clave vive solo en tu navegador**, en una entrada de `localStorage` aparte del resto del
  estado, y **la copia de seguridad que exportas no la incluye**. Como la app no tiene servidor, la
  petición sale directo desde el navegador: es aceptable porque cada persona pone su clave, pero
  por lo mismo no conviene guardarla en un equipo compartido.
- **Lo que devuelve el modelo se normaliza antes de guardarlo.** Los modelos pequeños cumplen el
  esquema «casi siempre»: mandan un número donde va texto o escriben «enero 2020» donde se pidió
  `2020-01`. En vez de rechazar la respuesta, se arregla lo arreglable.
- **A los modelos que razonan se les apaga el razonamiento** en Ollama (`reasoning_effort: none`).
  Sin eso se comen el presupuesto de salida pensando y devuelven vacío: medido con un modelo de 9B,
  apagarlo bajó una extracción de 15 s a 1 s con el mismo resultado.
- Los SDK y esquemas se cargan solo cuando la IA se usa de verdad, así que quien no la active no
  paga ese peso en el arranque.

## Qué más hace

**Perfil profesional.** Datos de contacto, resumen, experiencia, formación, habilidades, idiomas,
proyectos y certificaciones. Es la fuente de verdad del resto de la app.

**Ayuda a redactar.** No es un modelo de lenguaje: son reglas de escritura de CV aplicadas a lo que
escribes.

- Revisa cada logro y avisa cuándo empieza con «encargado de…», cuándo no tiene cifras, cuándo se
  fue largo o cuándo se coló una frase de relleno.
- Asistente en cuatro pasos (verbo → qué → cómo → resultado) que arma el logro por ti.
- Tres propuestas de resumen profesional generadas con tus propios datos.
- Borrador de titular y sección «Acerca de» para LinkedIn.

**Constructor de CV.** Cuatro plantillas y una revisión de compatibilidad con los filtros
automáticos (ver abajo). Se exporta a PDF con el diálogo de impresión del navegador: lo que ves en
pantalla es lo que sale, y con el texto seleccionable.

**¿Calza con la oferta?** Pegas la descripción del aviso y la app extrae sus palabras clave, las
compara con tu perfil y te dice cuáles faltan.

**Cartas de presentación.** Borrador en cuatro párrafos armado con tu perfil y las habilidades que
la oferta menciona. El párrafo de «por qué esta empresa» queda marcado para que lo escribas tú, que
es justamente el que no se puede automatizar.

**Postulaciones.** El registro de a qué postulaste, en qué estado va y qué sigue. Sirve para dos
cosas concretas: que ninguna oportunidad se enfríe por olvido, y ver en qué parte del proceso se
cae tu búsqueda (el embudo del inicio compara registradas → enviadas → entrevistas → ofertas). Se
agregan pegando el aviso: el cargo, la empresa, la ubicación y el sueldo se completan solos.

**Entrevistas.** Banco de preguntas frecuentes con el criterio detrás de cada una, editor de
respuestas con método STAR y preguntas que conviene hacerle tú a la empresa.

## El formato de CV que usa la app

Después de unos años en que las plantillas de dos columnas se impusieron, el estándar volvió a la
**columna única**, precisamente porque los sistemas de reclutamiento (ATS) leen línea por línea y
las columnas les hacen mezclar el contenido. La plantilla por defecto, `ATS`, sigue esas reglas:

- Una sola columna, sin tablas, iconos ni gráficos.
- Orden de secciones: contacto → resumen → habilidades → experiencia → educación → certificaciones.
- Encabezados estándar («Experiencia», «Educación», «Habilidades»), no creativos.
- Orden cronológico inverso y formato de fecha consistente.
- Tipografías seguras: Calibri, Arial, Georgia o Times New Roman, de 10 a 12 puntos.
- Negro sobre blanco, sin foto.
- Una o dos páginas, y al menos el 70% de los logros con una cifra.

La app revisa tu CV contra esas reglas y da un puntaje con lo que falta. También lista las
prácticas que hoy **penalizan** en vez de ayudar: rellenar de palabras clave, esconder texto en
blanco, meter contenido en tablas o imágenes y exportar el PDF desde una herramienta de diseño.

Las otras tres plantillas siguen disponibles —`Clásico`, `Compacto` y `Moderno` a dos columnas—,
pero la app avisa cuándo estás usando una que los filtros no leen bien.

Fuentes consultadas: [ATS Resume Best Practices 2026 (Resume Optimizer
Pro)](https://resumeoptimizerpro.com/blog/ats-friendly-resume-tips), [ATS Resume Templates & Format
Guide (Resume.io)](https://resume.io/resume-templates/ats), [Cómo escribir un currículum a prueba
de ATS (CVMaker)](https://www.cvmaker.es/blog/curriculum-vitae/ats-curriculum) y [Formato de CV
2026 (MissCV)](https://misscv.com/blog/formato-cv/).

## Por qué hay que pegar el texto de los avisos

La app corre entera en el navegador y los portales de empleo bloquean que otra página lea sus
avisos (CORS). Traerlos pasando por un servidor intermedio significaría mandarle a un tercero a qué
estás postulando, y eso no compensa. Así que el enlace se guarda para abrirlo con un clic y el
texto lo pegas tú; a cambio, ese texto completo es justamente lo que necesita el comparador con tu
CV.

## Correr el proyecto

```bash
npm install
npm run dev
```

Queda en http://localhost:5173.

Otros comandos:

```bash
npm run build
npm run preview
npm run lint
```

## Stack

React 19, TypeScript, Vite y React Router (modo hash, para que funcione servido desde cualquier
subdirectorio). `pdfjs-dist`, `jszip`, `@anthropic-ai/sdk` y `zod` se cargan solo cuando los
necesitas, así que no pesan en el arranque. Sin librería de estado ni de UI: el estado vive en un contexto con `useState` y los
estilos son CSS plano con variables, incluidas las reglas `@media print` que generan el PDF.

## Estructura

```
src/
  lib/
    text.ts        normalización, tokenizado y extracción de palabras clave
    analysis.ts    revisión de logros y resúmenes, calce con la oferta, completitud del perfil
    ats.ts         reglas de compatibilidad con filtros automáticos
    writing.ts     generadores: resumen, logro, carta, LinkedIn, banco de preguntas
    ai/
      settings.ts     proveedores, clave y modelo, guardados aparte del estado
      client.ts       cliente del SDK de Anthropic y traducción de errores
      openaiCompat.ts transporte para Ollama, LM Studio, Gemini, Groq y OpenRouter
      extract.ts      esquemas y prompts de lectura de CV, avisos y logros
      coerce.ts       normalización de lo que devuelve un modelo poco fiable
    import/
      files.ts     texto desde PDF, DOCX y ZIP, y parser de CSV
      parseCv.ts   lector heurístico de un CV en texto plano
      linkedin.ts  lector de la exportación de datos de LinkedIn
      parseJob.ts  lector de un aviso de trabajo pegado
      apply.ts     volcado de lo detectado sobre el perfil
  state/           contexto de la app y persistencia en localStorage
  components/      piezas de interfaz reutilizables
  cv/              plantillas del documento imprimible
  pages/           una por sección del menú
```

## Un aviso sobre las sugerencias

Las propuestas de redacción son borradores construidos con los datos que tú cargaste. Sirven para
salir de la hoja en blanco, no para enviarse tal cual. Y sobre el comparador con la oferta: agrega
una palabra clave solo si es verdad. Los sistemas actuales cruzan lo que declaras contra tu
historial, así que una habilidad que no puedes defender resta en vez de sumar.
