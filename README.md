# Impulso

Aplicación web para ordenar una búsqueda de trabajo: armas tu perfil profesional una vez y desde
ahí salen el CV, las cartas de presentación, el análisis de cada oferta y el seguimiento de las
postulaciones.

Funciona entera en el navegador. No hay servidor, no hay cuentas y nada de lo que escribes sale de
tu equipo: todo se guarda en `localStorage` y puedes exportarlo a un archivo JSON cuando quieras.

## Qué hace

**Perfil profesional.** Datos de contacto, resumen, experiencia, formación, habilidades, idiomas,
proyectos y certificaciones. Es la fuente de verdad del resto de la app.

**Ayuda a redactar.** No es un modelo de lenguaje: son reglas de escritura de CV aplicadas a lo que
escribes.

- Revisa cada logro y avisa cuándo empieza con «encargado de…», cuándo no tiene cifras, cuándo se
  fue largo o cuándo se coló una frase de relleno.
- Asistente en cuatro pasos (verbo → qué → cómo → resultado) que arma el logro por ti.
- Tres propuestas de resumen profesional generadas con tus propios datos.
- Borrador de titular y sección «Acerca de» para LinkedIn.

**Constructor de CV.** Tres plantillas (moderno a dos columnas, clásico y compacto), color de
acento, tamaño de letra y secciones opcionales. Se exporta a PDF con el diálogo de impresión del
navegador: lo que ves en pantalla es lo que sale.

**¿Calza con la oferta?** Pegas la descripción del aviso y la app extrae sus palabras clave, las
compara con tu perfil y te dice cuáles faltan. Es el mismo criterio que usan los filtros
automáticos de los portales de empleo.

**Cartas de presentación.** Borrador en cuatro párrafos armado con tu perfil y las habilidades que
la oferta menciona. El párrafo de «por qué esta empresa» queda marcado para que lo escribas tú, que
es justamente el que no se puede automatizar.

**Postulaciones.** Tablero kanban con cinco estados, arrastrando las tarjetas. Guarda el próximo
paso con fecha y avisa cuáles llevan más de una semana sin respuesta.

**Entrevistas.** Banco de preguntas frecuentes con el criterio detrás de cada una, editor de
respuestas con método STAR y preguntas que conviene hacerle tú a la empresa.

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
subdirectorio). Sin librería de estado ni de UI: el estado vive en un contexto con `useState` y los
estilos son CSS plano con variables, incluidas las reglas `@media print` que generan el PDF.

## Estructura

```
src/
  lib/
    text.ts        normalización, tokenizado y extracción de palabras clave
    analysis.ts    revisión de logros y resúmenes, calce con la oferta, completitud del perfil
    writing.ts     generadores: resumen, logro, carta, LinkedIn, banco de preguntas
    utils.ts       fechas, ids y utilidades varias
  state/           contexto de la app y persistencia en localStorage
  components/      piezas de interfaz reutilizables
  cv/              plantillas del documento imprimible
  pages/           una por sección del menú
```

## Un aviso sobre las sugerencias

Las propuestas de redacción son borradores construidos con los datos que tú cargaste. Sirven para
salir de la hoja en blanco, no para enviarse tal cual. Y sobre el comparador con la oferta: agrega
una palabra clave solo si es verdad. Inflar el CV con términos que no puedes defender en la
entrevista es la forma más rápida de quedar fuera.
