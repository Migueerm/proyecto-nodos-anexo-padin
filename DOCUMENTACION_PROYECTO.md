# 📚 Documentación Técnica Completa - Proyecto Nodos TECO

Este documento contiene la especificación técnica completa, la guía de seguridad/control de acceso dinámico, la arquitectura de interfaz y la referencia de despliegue para la versión de producción validada del **Módulo de Carga Masiva de Reportes de Nodos**.

---

## 📂 1. Estructura del Repositorio

```
proyecto nodos teco/
│
├── CargaMasivaReportes.gs     --> Backend Apps Script con gestión dinámica de accesos (Hoja UsuariosAutorizados)
├── Dialogo.html               --> Interfaz Web/Modal responsiva con overlay dinámico e ingesta de datos
├── nodo.txt                   --> Algoritmo de monitoreo y alertas por nodo
├── ALERTAS POR NODOS...txt    --> Triggers de ejecución en minutos pares y bloqueos nocturnos
├── DOCUMENTACION_PROYECTO.md  --> Documentación técnica detallada (este archivo)
└── README.md                  --> Resumen de arquitectura y guía rápida
```

---

## 🔒 2. Control de Acceso Dinámico desde Google Sheets (`UsuariosAutorizados`)

En el punto de entrada web (`doGet`), el sistema implementa una capa de seguridad administrable dinámicamente desde la hoja **`UsuariosAutorizados`** en la planilla principal.

### Estructura de la Hoja `UsuariosAutorizados`:
- **Columna A (`MAIL`)**: Correo electrónico del usuario (ej. `nombre.apellido@konecta.com`).
- **Columna B (`ACCESO`)**: Menú desplegable con validación de datos estricta (`SI` / `NO`).

### Funcionamiento:
1. Obtenemos el correo del usuario activo a través de `Session.getActiveUser().getEmail()`.
2. La función `obtenerMailsAutorizados()` lee en tiempo real la hoja `UsuariosAutorizados` y filtra únicamente los correos cuyo campo **`ACCESO` sea igual a `SI`**.
3. **Otorgar Acceso**: El administrador agrega una nueva fila en la planilla con el mail del usuario y selecciona **`SI`** en el desplegable.
4. **Revocar Acceso**: El administrador modifica la columna B a **`NO`** (o elimina la fila). El usuario pierde el acceso inmediatamente al abrir la URL.
5. **Usuario NO Autorizado**: Se retorna una pantalla estandarizada de **"Acceso Denegado ❌"** informando que el correo no está habilitado.

---

## 🎨 3. Arquitectura y Experiencia de Usuario (`Dialogo.html`)

La interfaz HTML5 implementa las siguientes mejoras de UX/UI en producción:

1. **Overlay Modal Interactivo (`#loadingOverlay`)**:
   - Muestra un spinner animado durante el procesamiento de datos ("Procesando y Guardando...").
   - Al finalizar, despliega un ícono de estado (✅ Éxito / ❌ Error) con resumen del lote insertado.
   - Ocultamiento y reseteo automático a los 4 segundos tras una confirmación exitosa.

2. **Reseteo de Estado Inteligente (`resetearApp()`)**:
   - Limpia inputs de archivo, grilla de asignación de datos y previsualización de tabla.
   - Habilita/deshabilita botones según el estado de validación sin recargar la página del navegador.

3. **Asignación de Datos por Registro**:
   - Cada equipo reportable muestra su **MAC** y **Abonado**.
   - Campos requeridos por fila: **Identificador (DNI/CUIT/CUIL, 7 a 11 dígitos)** e **ID Operador / U (6 dígitos)**.
   - Validación visual en tiempo real (bordes verdes para campos válidos y rojos para inválidos).

---

## ⚡ 4. Backend y Motor de Datos (`CargaMasivaReportes.gs`)

1. **Mapeo Automático de Servicios (`SERVICIO_MAP`)**:
   - Clasifica los equipos ingresados según su modelo en: `Internet HFC`, `Flow` e `Internet FTTH`.

2. **Concurrencia Segura con `LockService`**:
   - Implementa `LockService.getDocumentLock()` / `LockService.getScriptLock()` con un tiempo de espera de 15 segundos para evitar escrituras simultáneas sobre la planilla local y externa.

3. **Estructura de Hojas Administradas**:
   - **`Historial`**: Registro acumulativo ordenado según `ENCABEZADOS_HISTORIAL`.
   - **`UltimaCarga`**: Reemplazo completo del contenido con el último lote procesado.
   - **`UltimoReportado`**: Matriz simplificada de 12 columnas enviada a la hoja de destino.
   - **`RegistroCargas`**: Bitácora con timestamp, usuario, mail, archivo y total de filas.
   - **`UltimoResumen`**: Conteo consolidado de incidencias por `NODO` (`AREA SERVICE`) y `ESTADO`.
   - **`UsuariosAutorizados`**: Tabla de gestión dinámica de accesos con lista blanca y desplegable `SI`/`NO`.

4. **Escritura Remota en Hoja `Historico`**:
   - Abre la planilla principal definida por `SPREADSHEET_ID_LOCAL` e inserta los registros formateados en la hoja `Historico`.

---

## 🛠️ 5. Guía de Despliegue en Google Apps Script

### Opción A: Web App (Recomendado para producción)
1. En Google Apps Script, ir a **Desplegar > Nueva implementación**.
2. Seleccionar **Aplicación web**.
3. Configuración:
   - **Ejecutar como**: *Tu cuenta de usuario*.
   - **Quién tiene acceso**: *Cualquier persona dentro de la organización*.
4. Hacer clic en **Desplegar** y copiar la URL Web App (`.../exec`).
5. La URL verificará automáticamente el correo del usuario contra la hoja `UsuariosAutorizados`.

### Opción B: Menú en Google Sheets
1. Al abrir la planilla vinculada, el activador `onOpen()` crea el menú superior **`📤 Carga de archivos > 📄 Subir archivo`**.
2. Abre la ventana modal directamente dentro del entorno de Sheets.
