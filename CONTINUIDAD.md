# Continuidad de Impulso · 13 de septiembre de 2026

## Última ampliación completada · guía y comparación

Se retomó el documento tras renovarse el límite de uso y se implementó la ampliación que había quedado pendiente. Mantener el diseño aprobado y el funcionamiento local. No hay trabajo de implementación a medias de esta solicitud.

- Experiencias múltiples en la guía, con cargo, empresa, ubicación, tareas, inicio/fin y trabajo actual. Cuadros plegables, añadir debajo, quitar con confirmación, deshacer y ordenar por fecha. No se navega a otra pantalla para agregar datos.
- Estudios múltiples con título/curso, institución, sede/ciudad, fechas, estado en curso y detalle. Se preserva la selección de habilidades. Se usa Education.location; no se añadió un campo incompatible con copias antiguas.
- País de residencia obligatorio en la guía para personas nuevas, sin Chile por defecto. Se mantienen países existentes y ciudades ya guardadas. El buscador reconoce España, también si un perfil antiguo dice Spain; país desconocido no se transforma en Chile.
- La residencia y el destino de búsqueda se mantienen separados cuando el usuario ya eligió otro destino. España se explica en la ayuda del selector. Se neutralizaron ejemplos de contacto exclusivos de Chile.
- PDF real corregido para incluir sede/ciudad de estudios y «En curso», coincidiendo con su representación accesible como texto.
- Comparación visible en postulaciones: fragmentos del aviso, información relacionada en el CV, ausencias de información y condiciones que necesitan revisión. Respeta secciones ocultas y no cuenta aspiraciones o el nombre de una empresa como manejo de herramientas.
- Los contadores son temas detectados, no una probabilidad de contratación. El lector local reconoce 30 temas frecuentes; no sustituye la lectura completa. Idiomas, licencias, titulación y duración requieren verificación del usuario. Sin perfil o sin descripción hay una orientación específica.
- Ayuda en el CV basada en las recomendaciones de claridad, relevancia y orden cronológico inverso de Europass, consultadas en https://europass.europa.eu/es/create-europass-cv. No se impone una plantilla oficial, foto ni identificación personal.

### Validación de esta ampliación

- Suite ampliada a 25 pruebas. Las 19 existentes pasaron con la elección explícita de país ajustada. Las 6 nuevas pasaron tras corregir el foco al abrir una fila con errores.
- Verificados: guía completa desde España, dos experiencias y dos estudios, minimizar/abrir, recargar y retroceder, deshacer eliminación, fechas invertidas, estado en curso, contenido del PDF y orden elegido por el usuario.
- Comprobados países de copias antiguas, separación de residencia/destino, evidencia y ausencia de información en la comparación, secciones ocultas, estado sin perfil y edición del aviso sin perder el foco.
- Capturas revisadas de experiencias y estudios en móvil, y comparación en móvil/escritorio. Sin desbordamientos ni infracciones detectadas por axe en estos recorridos. La evaluación automática no equivale a certificación de accesibilidad.
- Revisión estática sin advertencias después de la corrección de foco. Compilación final correcta.

### Archivos para retomar

- src/components/GuidedHistory.tsx: cuadros plegables y foco.
- src/lib/guided.ts: validación de filas/fechas, orden y sincronización de ubicación.
- src/pages/Onboarding.tsx: integración en los seis pasos.
- src/lib/jobComparison.ts y src/components/JobReview.tsx: comparación local y su explicación.
- tests/guided-comparison.spec.ts: seis pruebas de aceptación de esta ampliación.

Pendiente a futuro, fuera de esta ampliación: validar con usuarios, ampliar el reconocimiento de temas o añadir análisis semántico optativo, OCR, comprobar la IA con un modelo real y catálogo presencial/API/créditos. Se detallan más abajo. No reinstalar ni rehacer las funciones que ya están terminadas.

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
