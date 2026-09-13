# Impulso

Una app local para personas que necesitan ayuda para buscar trabajo, preparar su currículum y seguir sus postulaciones. React + TypeScript + Vite. Sin registro y sin servidor de datos.

## Abrir en Windows

Haz doble clic en **Abrir Impulso.cmd**. Abre [Impulso local](http://localhost:5180/) y deja el servidor local en segundo plano. Si faltan dependencias, las prepara la primera vez. Requiere Node.js; el archivo explica qué hacer si no está instalado.

Para desarrollo:

```
npm ci
npm run dev -- --host 127.0.0.1 --port 5180 --strictPort
```

Usa siempre el mismo origen y navegador. localhost y 127.0.0.1 tienen almacenamientos independientes. Cambiar de puerto también cambia el almacenamiento.

## Un recorrido sencillo

- **Inicio:** una próxima acción, acceso a los tres pasos y pendientes.
- **Mi currículum:** guía de seis pasos con país explícito, experiencias y estudios múltiples en cuadros plegables, fechas y estado actual/en curso. Sede y fechas aparecen en el PDF. Añadir, minimizar, quitar/deshacer y ordenar por fecha funciona sin salir de la guía. Sigue siendo compatible con oficios, trabajos informales y primer empleo; teléfono sin correo y cifras opcionales.
- **Buscar trabajo:** selector de 25 países y ciudad libre con sugerencias. Ofertas remotas de Remotive y Jobicy dentro de la app, con descripción, fuente y guardado sin duplicados. La ciudad se usa en búsquedas externas de Google, LinkedIn, Indeed, InfoJobs (España) y Chiletrabajos (Chile). No hay servicio público/BNE.
- **Mis postulaciones:** comparación local del aviso con el CV, con fragmentos del aviso, evidencia de las secciones visibles y sugerencias. También conserva registro del aviso, pasos de envío, confirmación explícita, notas y recordatorios descargables.
- **Ayuda y mis datos:** copias descargables, validación y revisión antes de restaurar, versión anterior y borrado local.
- **IA y cartas visibles:** accesos permanentes a activar IA, leer un CV y crear cartas de presentación. Las cartas funcionan sin empleo guardado e incluyen tono y motivación. Una oferta integrada pasa su descripción directamente a la carta.
- **Herramientas complementarias:** importación PDF/Word/texto/ZIP de LinkedIn, edición completa del perfil, borradores de LinkedIn y preparación de entrevistas.

## Documentos y datos

El currículum se descarga directamente como PDF con texto seleccionable. La vista previa se dibuja desde el mismo PDF descargable. La paginación admite documentos largos. Los estilos disponibles son Esencial, Con color y Compacto; las fuentes integradas del PDF son Helvetica y Times. Los nombres Calibri y Georgia de perfiles antiguos se conservan y se explican como variantes sans serif/serif.

Los datos se guardan en localStorage bajo la clave histórica impulso.state.v1. Las copias antiguas se normalizan con Zod y conservan los campos existentes. El borrado local incluye la copia interna y la configuración de IA. Los archivos ya descargados permanecen en el equipo.

Un error de cuota o almacenamiento se muestra al usuario; nunca se anuncia un guardado fallido como exitoso. Un estado corrupto se conserva para recuperarlo, en lugar de sobrescribirlo automáticamente. Antes de reemplazar el perfil se intenta crear una copia interna y se ofrece deshacer durante la sesión.

En equipos compartidos, cualquiera que use ese mismo navegador puede acceder a los datos. La app explica cómo descargar una copia y borrar los datos al terminar.

## Guía, país y comparación del aviso

El país de residencia no se rellena con Chile para personas nuevas. Los perfiles y copias antiguos conservan el país que ya tuvieran; un país ausente queda vacío. España aparece tanto en la guía como en el buscador, con ciudades sugeridas e InfoJobs como búsqueda externa. La ubicación de residencia inicia la búsqueda cuando todavía no hay un destino independiente; explorar otro país no modifica el CV.

Los cuadros de experiencia y estudios se pueden minimizar independientemente. El cuadro nuevo recibe el foco; si una fila cerrada tiene un error, se abre y enfoca el campo. Las fechas son opcionales y se rechaza un fin anterior al inicio. Una fila totalmente vacía se omite al continuar; las filas con información requieren cargo o título. Quitar datos existentes exige confirmación y ofrece deshacer mientras permanece ese paso abierto. Se conservan arrays y estructura históricos; sede/ciudad utiliza Education.location.

La comparación de postulaciones reconoce 30 temas frecuentes en español e inglés. Es una lectura por reglas, sin IA ni envío externo. Los contadores representan temas reconocidos con información relacionada, sin información visible o por revisar; no son un porcentaje de compatibilidad, una evaluación ATS ni una probabilidad de contratación. Se muestran citas de ambas fuentes y sugerencias concretas. No aparecer en el CV no significa carecer de esa habilidad.

La revisión respeta las opciones de visibilidad del CV. No utiliza el cargo deseado como experiencia ni deduce manejo de una herramienta porque una empresa lleve su nombre. Las afirmaciones negativas y los niveles, títulos, licencias y duración requieren revisión humana. Otros requisitos explícitos no reconocidos se muestran para revisión, y el aviso completo se puede editar desde esa misma sección. No hay interpretación semántica exhaustiva, equivalencias de estudios ni cálculo automático de años de experiencia.

Las orientaciones de claridad, relevancia para el puesto y orden cronológico inverso se basan en [Europass: cómo hacer un buen CV](https://europass.europa.eu/es/create-europass-cv), consultado el 13 de septiembre de 2026. El orden por fecha es una acción explícita del usuario: no se altera en silencio el orden elegido en el editor. Impulso conserva sus plantillas propias; no presenta su PDF como un documento oficial Europass ni exige foto o documento de identidad.

## IA en tu equipo

La barra de herramientas muestra **Activar IA**, **Leer mi CV con IA** y **Cartas de presentación**. Configurar un modelo no envía datos: la importación exige activar el interruptor de IA y la carta tiene su propio botón.

1. Instala y abre [Ollama](https://ollama.com/download) o [LM Studio](https://lmstudio.ai/). Descarga/carga un modelo de texto; en LM Studio inicia su servidor.
2. En Impulso, abre **Activar IA**, elige el servicio y presiona **Buscar modelos en mi equipo**.
3. Elige el modelo y pulsa **Probar conexión**. Los fallos se muestran como fallos.
4. Vuelve a importar o a redactar. Revisa el resultado antes de guardarlo/enviarlo.

El servidor local de Impulso conecta con los puertos de loopback 11434 (Ollama) y 1234 (LM Studio). Evita configurar CORS en esos servicios. Los destinos son fijos, el cuerpo tiene límite y las operaciones no se registran ni se guardan en el servidor. Los endpoints personalizados conservan el transporte directo anterior.

La lectura distingue IA de extracción básica. Permite corregir contacto, cargos, empresas, tareas y fechas antes de importar; conserva los datos actuales hasta confirmar. Si falla la IA, puedes procesar el mismo texto con el lector básico. El ZIP de LinkedIn se lee estructuralmente sin IA. No hay OCR para PDFs escaneados.

Las cartas incluyen aviso opcional, motivación y tono para la IA. Usar una oferta aporta contexto; el modelo sigue siendo quien redacta y relaciona ese contexto con el perfil. Se puede recuperar el texto anterior después de generar otra versión.

Las conexiones externas existentes se mantienen para quien ya tenga su servicio. No hay suscripciones, cobros ni sistema de créditos en Impulso. Antes de un servicio público de pago hará falta un backend que proteja claves, registre consumo y controle saldos. Los modelos/precios de proveedores externos deben verificarse al integrar esa etapa.

## Ofertas reales y cobertura

- [Remotive: API oficial y condiciones](https://github.com/remotive-com/remote-jobs-api): hasta 500 avisos recientes por consulta, publicados con 24 h de retraso. Se mantiene fuente y enlace original. No se redistribuyen a Google Jobs ni otros agregadores.
- [Jobicy: API oficial y condiciones](https://jobicy.com/jobs-rss-feed): hasta 200 avisos recientes; fuente y enlace original siempre visibles.
- Ambas son fuentes de empleo remoto. El número real de avisos cambia y puede ser menor que esos máximos. No cubren exhaustivamente trabajos presenciales, oficios ni todos los países. Muchos avisos están en inglés.
- El filtro local compara el país, las regiones explícitas o una ubicación mundial declarada. No deduce elegibilidad por nacionalidad ni residencia; omite ubicaciones ambiguas al filtrar por país. La ciudad **no** filtra ofertas remotas: se utiliza para ampliar la búsqueda externa. Horario filtra jornada completa o parcial cuando la fuente lo declara.
- El usuario lee y guarda el aviso aquí; el envío final se hace en la fuente original. Guardar nunca marca una candidatura como enviada. Una oferta podría haber cerrado desde la última consulta.
- [La documentación de Google para empleos](https://developers.google.com/search/docs/appearance/structured-data/job-posting) describe cómo publicar/indexar avisos. Esa integración no permite obtener su catálogo en Impulso. Aquí Google es un enlace de búsqueda externa; no se scrapea su interfaz.

El servicio de ofertas funciona con **npm run dev**, **npm run preview** y el lanzador local. Hace peticiones solo a dos fuentes fijas, sin enviar perfil ni filtros personales. Guarda una caché de ofertas públicas en **.cache/jobs-v1.json** (excluida de Git): 6 h tras una consulta correcta, espera de 15 min tras fallos y copia antigua de hasta 48 h identificada como tal. Comparte peticiones concurrentes. La API de modelos locales no guarda caché.

Una publicación puramente estática de la carpeta dist no incluye estos servicios locales. En ese caso la app conserva los documentos y enlaces externos y muestra el error al intentar obtener ofertas. Mantener el funcionamiento local es el alcance de esta etapa.

No hay cuentas, sincronización en la nube ni notificaciones en segundo plano. No se envían correos ni postulaciones automáticamente. Compartir PDF depende del navegador; hay una alternativa de descarga.

## Diseño

Interfaz reconstruida con fondo marfil, verde intenso y superficies coral y amarillo. Navegación de cuatro entradas, barra inferior en móvil, controles con texto, foco visible, etiquetas vinculadas a sus campos, movimiento reducido y ayudas progresivas.

Referencias consultadas:

- [GOV.UK Design System: Question pages](https://design-system.service.gov.uk/patterns/question-pages/): dividir el recorrido en preguntas manejables.
- [W3C WAI: Help users understand what things are and how to use them](https://www.w3.org/WAI/WCAG2/supplemental/objectives/o1-understandable/): controles familiares y propósito claro.
- [W3C WAI: Accessibility principles](https://www.w3.org/WAI/fundamentals/accessibility-principles/): estructura, etiquetas y contraste.

Estas referencias orientan el diseño; las comprobaciones automáticas no equivalen a una certificación de accesibilidad.

Los porcentajes de compatibilidad con ATS se retiraron de la interfaz. Las listas de comprobación indican datos faltantes y temas que revisar; no predicen contratación.

## Verificar

```
npm run build
npm run lint
npx playwright install chromium
npm test
```

Las 25 pruebas usan contextos aislados del navegador y datos ficticios, sin modificar el perfil del usuario. Cubren el recorrido inicial, PDF legible y multipágina, persistencia, errores de guardado, migración, importación, recuperación y deshacer, envío confirmado, calendario, cartas y entrevistas, navegación móvil y comprobaciones axe. Las seis pruebas añadidas cubren la guía completa en España con varias experiencias y estudios, PDF con sede y estado en curso, validación de filas cerradas, foco y deshacer, migración de países, separación entre residencia y búsqueda, evidencia de comparación, secciones ocultas y estados sin perfil/aviso.

Los servicios de IA y empleo se simulan en las pruebas para hacerlas reproducibles y no consumir APIs. Se comprobó por separado la llegada real de ofertas de ambas fuentes; no había servidor de IA local activo durante esta revisión.

Los resultados y capturas se guardan en test-results, excluido de Git.

## Siguiente validación de producto

Probar con 5–8 personas con poca experiencia digital, en sus propios celulares. Pedirles crear un currículum, encontrar un aviso y preparar el envío. Medir cuántas completan cada tarea sin ayuda, dónde se detienen y si entienden dónde quedan sus datos. Conseguir un empleo no se puede deducir de completar el perfil.
