# Continuidad de Impulso · 13 de septiembre de 2026

## Solicitud nueva pendiente · prioridad para la próxima sesión

El usuario confirmó que la app funciona bien y autorizó los siguientes cambios. Mantener el diseño aprobado, el uso local y las funciones actuales de CV y cartas. No hace falta pedir nuevamente permiso para implementarlos.

**Punto de parada:** se comprobó el uso de la cuenta: quedaba 18 % del límite de cinco horas (82 % consumido). El usuario pidió detenerse y dejar un archivo de continuidad si quedaba poco uso. Por eso esta ampliación todavía NO se ha implementado; en este turno solo se revisó el código y se actualizó este documento. La versión funcional anterior es cde70e1, rama codex/impulso-simple, ya publicada en GitHub. El árbol estaba limpio al iniciar este pedido.

### 1. Experiencias dentro de la guía, sin cambiar de página

- En el paso «Tu experiencia», sustituir «Tengo más experiencias o quiero agregar fechas», que actualmente navega a /perfil, por un botón que agregue otra experiencia debajo.
- Permitir tantas experiencias como necesite el usuario, con cuadros plegables independientes y un resumen legible del cargo/empresa cuando estén cerrados. El nuevo cuadro debe abrirse y recibir el foco sin sacar al usuario de /empezar.
- Cada cuadro: cargo/actividad, empresa o trabajo por cuenta propia, ubicación, tareas, fecha de inicio y fin, y casilla de trabajo actual. Conservar trabajos informales y el recorrido de primer empleo.
- Evitar que «Continuar» valide solo el primer elemento. Validar filas con contenido y fechas invertidas; permitir quitar un cuadro vacío sin borrar experiencias existentes. Mantener los datos al retroceder o recargar.
- Código: src/pages/Onboarding.tsx toma ahora solo state.profile.experience[0]. Los tipos Experience y los editores completos ya incluyen las fechas y current; reutilizar la estructura, no inventar un segundo almacenamiento.

### 2. Estudios completos en «Lo que sabes»

- Conservar la selección de habilidades que el usuario aprobó.
- Ampliar «Agregar mis estudios» con estudios/título, institución, sede o ubicación, inicio, fin y «Sigo estudiando».
- Permitir añadir otro estudio y plegar cuadros para mantener orden. Sigue siendo opcional.
- Education ya contiene degree, institution, location, startDate, endDate, current y detail. Evaluar usar location con etiqueta «Sede o ciudad»; si se crea un campo separado de sede, actualizar de forma compatible tipos, Zod, importación, editor completo y exportación PDF.
- Validar fechas sin inventar meses o fechas de término. Mostrar estos datos en el PDF y conservarlos en copias/restauración.

### 3. País en la introducción y España en búsqueda

- Añadir país al paso de ubicación de la guía, junto con comuna/ciudad. Para personas nuevas, pedir elegir el país explícitamente: actualmente emptyProfile.personal.country vale Chile y Onboarding ni lo muestra ni lo pregunta.
- Mantener países reales de perfiles existentes y copias antiguas. No convertirlos a Chile al migrar ni borrar su ciudad de manera inesperada.
- Compartir catálogo con src/lib/jobs.ts y sincronizar el código de país de SearchPreferences con el nombre legible de PersonalInfo donde corresponda. Permitir distinguir país de residencia y destino de búsqueda si se necesita; no cambiar silenciosamente el perfil solo por explorar trabajo en otro país.
- España YA existe en src/lib/jobs.ts (ES, España) y el selector de src/pages/SearchJobs.tsx la muestra. Incluye Madrid, Barcelona, Valencia, Sevilla, Málaga y Bilbao; también está la búsqueda externa en InfoJobs. No duplicarla. Comprobar visualmente que sea fácil de encontrar y que el usuario esté abriendo la versión actual en localhost:5180.
- Revisar ejemplos y texto demasiado exclusivos de Chile en la guía (teléfono +56, correo .cl, referencia a RUT) sin rediseñar la interfaz.

### 4. Comparar el aviso guardado con el CV

- El usuario pide ver cuánto coincide su currículum con la postulación y qué puede mejorar antes de enviarla.
- src/components/JobReview.tsx, dentro de Applications, ahora solo muestra ubicación, sueldo, disponibilidad y preguntas genéricas. Tiene acceso al perfil y al texto completo en application.jobDescription.
- Añadir una comparación visible con requisitos/tareas del aviso, evidencia concreta que aparece en el CV y aspectos que faltan por explicar o verificar. Debe funcionar localmente; una ampliación con IA puede ser opcional y explícita.
- Distinguir «no figura en tu CV» de «no sabes hacerlo». Proponer correcciones reales: describir una tarea pertinente, aclarar una herramienta, añadir estudios o fechas si se tienen. No inventar experiencia para aumentar coincidencias.
- Si se incluye un indicador, explicar exactamente qué mide (por ejemplo, requisitos detectados con evidencia, sin evidencia o por revisar). No presentarlo como probabilidad de contratación ni recuperar el antiguo porcentaje ATS engañoso. Mostrar la evidencia que permite entender la comparación.
- Si no hay descripción, pedir pegarla; si el perfil está vacío, orientar a completarlo. No concluir incompatibilidad por datos ausentes ni usar edad, sexo u otros datos personales para puntuar.
- No hace falta salir de la app para leer el aviso o iniciar esta revisión. El guardado sigue siendo distinto del envío efectivo.

### 5. Currículum acorde a prácticas actuales

- El alcance inmediato sigue siendo ayudar a formular CV y cartas. Antes de afirmar un «estándar actual», consultar recomendaciones oficiales vigentes (por ejemplo Europass para estructura y orientación), con adaptación al destino. No asumir que hay una plantilla universal obligatoria.
- Conservar PDF con texto seleccionable, cronología clara, datos ciertos, encabezados legibles y revisión del usuario. No imponer foto ni datos sensibles ni logros numéricos inventados.

### Pruebas de aceptación pendientes

1. Crear una persona de España desde cero, elegir Madrid, completar contacto y comprobar país/ciudad en perfil, buscador y PDF.
2. Añadir dos experiencias con fechas sin salir de la guía, plegar/abrir, retroceder y recargar; comprobar ambas en PDF y almacenamiento.
3. Añadir dos estudios con institución/sede, uno terminado y otro en curso; comprobar datos y fechas en el PDF. Evitar fechas invertidas.
4. Mantener el recorrido sin experiencia ni estudios y las copias antiguas sin pérdidas.
5. Comparar un aviso con datos coincidentes y ausentes, mostrando evidencia y sugerencias. Comprobar los estados sin aviso/sin perfil y que no se inventen requisitos ni probabilidades de contratación.
6. Probar los formularios plegables en móvil, teclado, etiquetas y foco; ejecutar build, lint y las pruebas pertinentes. La suite previa tiene 19 pruebas, algunas necesitarán actualizarse al exigir elegir país.

Retomar directamente esta lista; las secciones siguientes describen la etapa anterior ya terminada y los pendientes de largo plazo.


## Encargo vigente

Conservar el diseño visual aprobado y el funcionamiento local. Dar protagonismo a IA para leer currículums y redactar cartas; buscar por país y ciudad; mostrar ofertas dentro de la app y reducir cambios de página. No activar pagos ni créditos todavía.

## Implementado

- Accesos visibles a IA, importación con IA y cartas en todas las pantallas.
- Configuración local guiada de Ollama/LM Studio, descubrimiento de modelos, prueba de conexión que distingue errores y retorno a la tarea anterior.
- Puente local para modelos, sin necesidad de configurar CORS, sin registrar el texto enviado.
- Lectura de CV optativa con IA, revisión editable antes de guardar y alternativa básica ante fallos. Corrección de una inferencia errónea que marcaba un empleo como vigente solo por no tener fecha final. No se inventa enero cuando el modelo devuelve solo un año.
- Cartas sin empleo/cargo obligatorio, tono y motivación persistentes, descripción opcional y recuperación del texto anterior. Los avisos integrados pasan sus datos a la carta automáticamente.
- 25 países, sugerencias de ciudad y campo libre. Oferta remota integrada desde Remotive y Jobicy, lectura segura como texto, fuente visible, guardado sin duplicar y creación de carta. Enlaces externos para buscar también empleo presencial. Retirada BNE/servicio público.
- Caché persistente de ofertas públicas, consulta de fuentes fijas, límite de tiempo, aviso de fuente fallida o copia antigua. Ningún perfil se envía a los portales al buscar.
- Migración compatible con copias antiguas para país, motivación y tono.

## Verificado

- 19 pruebas de navegador pasaron. Tras el último ajuste de posición del panel de IA en cartas, se repitieron las 7 pruebas nuevas: todas pasaron.
- Compilación final y revisión estática correctas. Revisión adicional con ofertas reales en escritorio y móvil: sin errores de página, sin desbordamiento y sin infracciones detectadas por axe; reutilización de caché comprobada.
- Consulta real: 216 ofertas recibidas en conjunto de Remotive y Jobicy, ambas respondieron correctamente (la cantidad variará).
- En este equipo no respondían Ollama (11434) ni LM Studio (1234). La integración se probó con respuestas simuladas, no se evaluó la precisión de un modelo real. No se instaló ni descargó ninguno.
- Sin cambios sobre los datos personales del navegador habitual: pruebas aisladas con datos ficticios.

## Límites y siguientes decisiones

1. **Cobertura presencial/internacional:** la primera integración abierta ofrece trabajo remoto y muchos textos en inglés. La ciudad se usa solo en búsquedas externas. Para un catálogo presencial amplio por ciudad, contratar o acordar una fuente autorizada (evaluar Adzuna/InfoJobs u otra), comprobar países, derechos de uso, precios y disponibilidad; no prometer que sus APIs sean abiertas sin credenciales.
2. **Google Jobs:** no hay lectura integrada del catálogo en esta implementación. La API de indexación documentada publica/actualiza avisos, no devuelve resultados de búsqueda. Los enlaces a Google siguen siendo externos.
3. **IA real:** abrir/instalar Ollama o LM Studio, cargar un modelo y evaluar con currículums de prueba consentidos (columnas, fechas parciales, oficios y distintos idiomas). La configuración no equivale a conexión comprobada. Mantener revisión humana.
4. **OCR:** fotos y PDF escaneado todavía requieren transcripción; evaluar OCR local antes de ampliar el lector. También faltan métricas de precisión sobre un conjunto de documentos.
5. **API y créditos:** pendiente deliberado. Necesitará backend, claves de servidor, usuarios, control de consumo, saldos y cobros. Revisar modelos vigentes de cada proveedor; no usar los presets históricos como catálogo validado. No poner una clave compartida en el frontend.
6. **Datos:** sigue siendo localStorage. Un servidor estático no ejecuta las rutas locales de empleo/modelos. Documentado en README.
7. **Usabilidad:** probar los nuevos accesos y el recorrido buscar → leer → guardar → carta con personas con poca experiencia digital. Medir comprensión, no atribuir mejoras de contratación a estas pruebas automáticas.

## Retomar

Proyecto real: C:/Users/crist/OneDrive/Documentos/impulso (no confundir con web dle).
Rama: codex/impulso-simple. Repositorio: https://github.com/criszluv/impulso
Abrir: doble clic en Abrir Impulso.cmd, http://localhost:5180/.
Comprobar: npm run build; npm run lint; npm test.
Revisar git status antes de tocar archivos. No sustituir el diseño actual ni los datos del usuario.

Fuentes: https://github.com/remotive-com/remote-jobs-api ; https://jobicy.com/jobs-rss-feed ; https://developers.google.com/search/docs/appearance/structured-data/job-posting
