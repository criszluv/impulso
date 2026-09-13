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
- **Mi currículum:** guía de seis pasos, compatible con oficios, trabajos informales y primer empleo. Se acepta teléfono sin correo. Las cifras no son obligatorias.
- **Buscar trabajo:** preferencias de ubicación, horario y traslado. Abre búsquedas de Google limitadas a BNE y Chiletrabajos, o sus portales directamente. Los enlaces no representan un catálogo integrado ni ofertas verificadas en tiempo real.
- **Mis postulaciones:** lista accesible, registro del aviso, pasos para enviar el currículum, confirmación explícita del envío, notas y recordatorios descargables para el calendario.
- **Ayuda y mis datos:** copias descargables, validación y revisión antes de restaurar, versión anterior y borrado local.
- **Herramientas complementarias:** importación PDF/Word/texto/ZIP de LinkedIn, edición completa del perfil, cartas, borradores de LinkedIn y preparación de entrevistas.

## Documentos y datos

El currículum se descarga directamente como PDF con texto seleccionable. La vista previa se dibuja desde el mismo PDF descargable. La paginación admite documentos largos. Los estilos disponibles son Esencial, Con color y Compacto; las fuentes integradas del PDF son Helvetica y Times. Los nombres Calibri y Georgia de perfiles antiguos se conservan y se explican como variantes sans serif/serif.

Los datos se guardan en localStorage bajo la clave histórica impulso.state.v1. Las copias antiguas se normalizan con Zod y conservan los campos existentes. El borrado local incluye la copia interna y la configuración de IA. Los archivos ya descargados permanecen en el equipo.

Un error de cuota o almacenamiento se muestra al usuario; nunca se anuncia un guardado fallido como exitoso. Un estado corrupto se conserva para recuperarlo, en lugar de sobrescribirlo automáticamente. Antes de reemplazar el perfil se intenta crear una copia interna y se ofrece deshacer durante la sesión.

En equipos compartidos, cualquiera que use ese mismo navegador puede acceder a los datos. La app explica cómo descargar una copia y borrar los datos al terminar.

## IA opcional

La ayuda principal funciona localmente, sin claves ni IA. La configuración avanzada mantiene la conexión opcional a servicios de redacción o modelos locales. Al activar una operación con IA se explica qué datos se envían al servicio configurado. Las claves quedan fuera de las copias exportadas.

No hay una IA alojada por Impulso, cuentas, sincronización en la nube ni notificaciones en segundo plano. No se envían correos ni postulaciones automáticamente. Compartir PDF depende de las capacidades del navegador; hay una alternativa de descarga.

## Diseño

Interfaz reconstruida con fondo marfil, verde intenso y superficies coral y amarillo. Navegación de cuatro entradas, barra inferior en móvil, controles con texto, foco visible, etiquetas vinculadas a sus campos, movimiento reducido y ayudas progresivas.

Referencias consultadas:

- [GOV.UK Design System: Question pages](https://design-system.service.gov.uk/patterns/question-pages/): dividir el recorrido en preguntas manejables.
- [W3C WAI: Help users understand what things are and how to use them](https://www.w3.org/WAI/WCAG2/supplemental/objectives/o1-understandable/): controles familiares y propósito claro.
- [W3C WAI: Accessibility principles](https://www.w3.org/WAI/fundamentals/accessibility-principles/): estructura, etiquetas y contraste.
- [BNE](https://www.bne.cl/) y [Chiletrabajos](https://www.chiletrabajos.cl/): destinos externos de búsqueda.

Estas referencias orientan el diseño; las comprobaciones automáticas no equivalen a una certificación de accesibilidad.

Los porcentajes de compatibilidad con ATS se retiraron de la interfaz. Las listas de comprobación indican datos faltantes y temas que revisar; no predicen contratación.

## Verificar

```
npm run build
npm run lint
npx playwright install chromium
npm test
```

Las pruebas usan contextos aislados del navegador y datos ficticios, sin modificar el perfil del usuario. Cubren el recorrido inicial, PDF legible y multipágina, persistencia, errores de guardado, migración, importación, recuperación y deshacer, envío confirmado, calendario, cartas y entrevistas, navegación móvil y comprobaciones axe.

Los resultados y capturas se guardan en test-results, excluido de Git.

## Siguiente validación de producto

Probar con 5–8 personas con poca experiencia digital, en sus propios celulares. Pedirles crear un currículum, encontrar un aviso y preparar el envío. Medir cuántas completan cada tarea sin ayuda, dónde se detienen y si entienden dónde quedan sus datos. Conseguir un empleo no se puede deducir de completar el perfil.
