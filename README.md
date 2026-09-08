# Censo Integral de Residentes — RAVELL PH / Edificio Terra 93 PH

Sistema de censo de residentes construido en **Google Apps Script** (backend),
**HTML/CSS/JS vanilla** (frontend) y **Google Sheets + Google Drive** como
almacenamiento. Sin frameworks ni dependencias externas.

## Arquitectura

```
Config.gs            Configuración centralizada, inicializarSistema(), obtenerConfiguracion()
Database.gs           Helpers de lectura/escritura de hojas + funciones crearXxx()
Validation.gs         Validación de payload, sanitización anti-inyección, duplicados
DriveService.gs        Subida de documentos a Drive (máx. 5MB)
AuditService.gs         Registro y consulta de auditoría
DashboardService.gs      Indicadores agregados para el panel administrativo
Code.gs                doGet(), funciones públicas para el cliente y administración

Index.html            Documento HTML con las 17 secciones del censo (estáticas)
CSS.html                Estilos (variables, mobile-first, paleta RAVELL PH)
JavaScript.html          Lógica de cliente (navegación, validación, envío)
```

Cada `.gs` y `.html` es un archivo plano en la raíz del proyecto — así es como
`clasp` los sube al proyecto de Apps Script (un proyecto de Apps Script no
tiene subcarpetas de código).

### Por qué el HTML no se genera con `innerHTML`

Las 17 secciones del formulario, y las tarjetas repetibles (residentes,
vehículos, mascotas, personas autorizadas, contratistas), están **escritas
como HTML estático en `Index.html`** desde el inicio. JavaScript únicamente:

- Muestra/oculta secciones con `classList` (nunca reconstruye el DOM).
- Clona `<template>` con `cloneNode()` para agregar tarjetas dinámicas.
- Actualiza `textContent`/`value` de nodos ya existentes (ej. el resumen final).

Esto evita un bug conocido de los Web Apps de Apps Script: cuando se
construyen bloques grandes de HTML como *string* de JavaScript e insertan con
`innerHTML`, el cargador interno de Apps Script (que usa `document.write()`
dentro de un iframe anidado) puede truncar el contenido sin ningún error
visible, dejando la página a medio cargar. Ver la sección de comentarios en
`JavaScript.html` para más detalle.

## Instalación

### 1. Crear el proyecto de Apps Script y vincularlo con `clasp`

```bash
npm install -g @google/clasp
clasp login
```

Desde una carpeta vacía en tu máquina:

```bash
clasp create --type webapp --title "Censo Integral de Residentes - Terra 93 PH"
```

Esto genera un `.clasp.json` con el `scriptId` del nuevo proyecto y crea (o
puedes vincular) una hoja de cálculo de Google Sheets asociada como su
contenedor (`Container-bound script`). Si prefieres crear primero el Google
Sheet y luego el script desde **Extensiones → Apps Script**, copia el
`scriptId` resultante a tu `.clasp.json` local (`clasp clone <scriptId>`).

Copia todos los archivos de este repositorio a esa carpeta y sube el código:

```bash
clasp push
```

### 2. Ejecutar `inicializarSistema()` una sola vez

1. Abre el proyecto en el editor de Apps Script (`clasp open`).
2. En el selector de funciones (arriba, junto a "Depurar"), elige
   `inicializarSistema`.
3. Presiona **Ejecutar**. La primera vez, Google pedirá autorizar permisos
   (ver sección de permisos abajo).
4. Verifica en el Google Sheet contenedor que se crearon todas las hojas
   (CONFIGURACION, UNIDADES, PERSONAS, etc.) con sus encabezados, y en Drive
   la estructura de carpetas `RAVELL PH / TERRA 93 / CENSO / MASCOTAS`.

Esta función es **idempotente para las hojas y carpetas** (no duplica hojas
existentes) pero **no sobrescribe la fila de configuración** si ya existe
contenido en `CONFIGURACION` — así puedes ejecutarla de nuevo sin miedo a
perder configuración ya ajustada.

### 3. Configurar el administrador

En la hoja `CONFIGURACION`, edita las filas:

- `CORREO_ADMIN`: correo principal de contacto de la administración (se
  muestra a los residentes si se decide exponerlo).
- `TELEFONO_ADMIN`: teléfono de contacto.
- `CORREOS_ADMIN`: lista de correos autorizados para ver el panel
  administrativo (dashboard y auditoría), **separados por comas**. Ejemplo:
  `admin1@ravellph.com, admin2@ravellph.com`. Solo estos correos pueden
  invocar `obtenerDashboardAdmin()` y `obtenerAuditoriaAdmin()`.

### 4. Desplegar como Web App

1. En el editor de Apps Script: **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
3. **Ejecutar como**: *Yo* (tu cuenta — así los residentes no necesitan una
   cuenta de Google con permisos sobre el Sheet/Drive).
4. **Quién tiene acceso**: *Cualquier usuario* (para que cualquier residente
   pueda abrir el enlace y diligenciar el censo sin iniciar sesión).
5. Copia la URL `.../exec` resultante y compártela con los residentes.

Cada vez que actualices el código con `clasp push`, este cambio llega al
proyecto guardado (visible en la implementación `@HEAD` / `/dev`), **pero no
al `/exec` público** hasta que repitas: **Implementar → Gestionar
implementaciones → editar (lápiz) → Versión: Nueva versión → Implementar**.

### Permisos que solicitará Google (y por qué)

Al ejecutar `inicializarSistema()` o al primer uso del Web App, Google pedirá
autorizar:

- **Ver y administrar hojas de cálculo de Google Sheets** — el sistema crea
  las hojas del censo y escribe/lee cada registro.
- **Ver y administrar archivos de Google Drive creados por esta app** (o
  acceso completo a Drive, según el alcance detectado) — para crear las
  carpetas `RAVELL PH / TERRA 93 / CENSO / MASCOTAS` y guardar los
  documentos subidos (ej. carné de vacunas).
- **Ejecutar como Web App / conocer tu identidad básica** — necesario para
  `doGet()` y para registrar en auditoría el usuario que realiza cada acción
  administrativa.

## Cómo editar preguntas y textos sin tocar código

Todo lo siguiente se edita directamente en la hoja `CONFIGURACION`, sin
tocar ningún archivo:

- Textos: `TEXTO_BIENVENIDA`, `TEXTO_AUTORIZACION_DATOS`, `TEXTO_POLITICA_DATOS`.
- Colores: `COLOR_PRINCIPAL` (código hex, ej. `#0B3D2E`).
- Activar/desactivar módulos completos: `HABILITAR_ENCUESTA`,
  `HABILITAR_DOCUMENTOS`, `HABILITAR_VEHICULOS`, `HABILITAR_MASCOTAS`,
  `HABILITAR_BICICLETAS` (valores `true`/`false`).
- Administradores autorizados: `CORREOS_ADMIN`.

**Para agregar, quitar o renombrar campos individuales del formulario** (por
ejemplo, agregar un campo "tipo de sangre" en el contacto de emergencia) es
necesario editar `Index.html` (el campo estático o el `<template>`
correspondiente) y `JavaScript.html` (la función `recolectarPayload()` que
lee ese campo, y `validarSeccionActual()` si debe ser obligatorio), además de
`Database.gs`/`Config.gs` si el campo debe guardarse en una nueva columna de
alguna hoja.

## Cómo agregar una nueva copropiedad

El sistema está diseñado para una sola copropiedad por proyecto de Apps
Script/Google Sheet, pero admite más de una fila de configuración por
`ID_COPROPIEDAD` si se desea extender:

1. Agrega una nueva fila en `CONFIGURACION` con `PARAMETRO = ID_COPROPIEDAD`
   y el nuevo identificador (ej. `COP-002`), o gestiona el multi-tenant
   duplicando el proyecto completo de Apps Script (más simple y más aislado:
   un proyecto = una copropiedad = un Google Sheet = una estructura de
   Drive).
2. Si se opta por compartir un mismo proyecto, ejecuta manualmente
   `inicializarCarpetasDrive()` ajustando `CONFIG.CARPETA_COPROPIEDAD_DRIVE`
   para la nueva carpeta en Drive, y usa el parámetro `idCopropiedad` en
   `obtenerConfiguracion(idCopropiedad)` al leer configuración específica.
3. La opción recomendada para producción es **un proyecto de Apps Script
   independiente por copropiedad** — más simple de mantener, respaldar y
   dar de baja sin afectar a las demás.

## Mantenimiento y backups

- **Backup periódico del Google Sheet**: Archivo → Hacer una copia (o
  `Archivo → Descargar → Microsoft Excel (.xlsx)`), guardando la copia en
  una carpeta de respaldo en Drive con fecha en el nombre. Se recomienda
  hacerlo semanalmente o antes de cualquier cambio grande de configuración.
- **Backup de documentos de Drive**: la carpeta `RAVELL PH/TERRA 93/CENSO`
  puede comprimirse/duplicarse periódicamente igual que cualquier carpeta de
  Drive.
- **Revisión de `LOG_ERRORES`**: revisar periódicamente esta hoja para
  detectar fallos recurrentes (no contiene datos sensibles, solo
  identificadores como `idUnidad`).
- **Revisión de `AUDITORIA`**: permite reconstruir qué se hizo, cuándo y por
  quién (o "anónimo" si el usuario no tenía sesión de Google activa).

## Checklist de despliegue

1. [ ] `clasp push` con todos los archivos de este repositorio.
2. [ ] Ejecutar `inicializarSistema()` manualmente una vez.
3. [ ] Verificar hojas y carpetas de Drive creadas correctamente.
4. [ ] Completar `CORREO_ADMIN`, `TELEFONO_ADMIN`, `CORREOS_ADMIN` en
   `CONFIGURACION`.
5. [ ] Ajustar `TEXTO_BIENVENIDA`, `TEXTO_AUTORIZACION_DATOS`,
   `TEXTO_POLITICA_DATOS` y `COLOR_PRINCIPAL` si aplica.
6. [ ] Implementar como Web App (ejecutar como *Yo*, acceso *Cualquier
   usuario*).
7. [ ] Probar el flujo completo del formulario de principio a fin desde el
   enlace `/exec` en un navegador (no solo `/dev`).
8. [ ] Confirmar que un correo en `CORREOS_ADMIN` puede leer el dashboard
   (`obtenerDashboardAdmin()`), y que uno fuera de la lista recibe el
   mensaje genérico de "no autorizado".
9. [ ] Compartir el enlace `/exec` con los residentes.
10. [ ] Programar el primer backup del Sheet.

## Limitaciones conocidas

1. **El token de actualización no es autenticación real.** Es un UUID que
   viaja en el enlace enviado al residente; cualquiera que obtenga ese
   enlace puede editar el censo de esa unidad. No usar para datos que
   requieran control de acceso estricto.
2. **Google Sheets no es una base de datos indexada.** Las búsquedas
   (`buscarUnidadPorTorreApto`, verificación de duplicados) recorren filas
   completas; con miles de unidades y crecimiento sostenido, el rendimiento
   se degrada. Adecuado para una copropiedad (decenas a un par de cientos de
   unidades), no para un portafolio de muchos edificios en un mismo Sheet.
3. **Límite de 5MB por documento subido** (carné de vacunas, etc.),
   calculado desde el tamaño del base64 en el navegador antes de enviarlo.
4. **El índice de duplicados (placas, documentos, apto+torre) vive en
   `PropertiesService`**, con un límite práctico de tamaño total de las
   propiedades del script (unos pocos MB); en el límite (miles de registros)
   se recorta el valor más antiguo, lo que puede permitir falsos negativos
   de "no duplicado" en el largo plazo. Sirve como advertencia temprana, no
   como restricción única (`ESTADO_REGISTRO = CENSADO` en `UNIDADES` sigue
   siendo la fuente de verdad para evitar doble censo de una misma unidad).
5. **`Session.getActiveUser().getEmail()` puede devolver vacío** si el Web
   App se implementó con acceso "Cualquier usuario" y quien contesta el
   censo no tiene sesión de Google iniciada (caso esperado y normal); en ese
   caso la auditoría registra `"anónimo"`.
6. **`clasp push` no publica cambios automáticamente en el enlace `/exec`
   público** — requiere el paso manual de nueva versión + implementar,
   descrito en el checklist. Es fácil olvidar este paso y suponer que un
   cambio ya está "en producción" cuando solo está en `/dev`.
