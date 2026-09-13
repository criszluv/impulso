# Continuidad de Impulso · 13 de septiembre de 2026

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
