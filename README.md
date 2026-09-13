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
| **Pegar texto** | El camino que funciona siempre, con cualquier formato. |

Lo detectado **nunca se guarda directo**: se muestra en una pantalla de revisión con el conteo por
sección, casillas para descartar lo que no sirva y la opción de reemplazar o sumar a lo que ya
tengas. Recién ahí pasa al perfil, donde se edita campo por campo.

El lector de CV es heurístico: ancla las fechas para cortar los cargos, separa puesto de empresa
con un diccionario de palabras, y reconoce encabezados en español y en inglés. Acierta bastante
pero no siempre, y por eso el paso de revisión es obligatorio.

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
subdirectorio). `pdfjs-dist` y `jszip` se cargan solo cuando importas un archivo, así que no pesan
en el arranque. Sin librería de estado ni de UI: el estado vive en un contexto con `useState` y los
estilos son CSS plano con variables, incluidas las reglas `@media print` que generan el PDF.

## Estructura

```
src/
  lib/
    text.ts        normalización, tokenizado y extracción de palabras clave
    analysis.ts    revisión de logros y resúmenes, calce con la oferta, completitud del perfil
    ats.ts         reglas de compatibilidad con filtros automáticos
    writing.ts     generadores: resumen, logro, carta, LinkedIn, banco de preguntas
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
