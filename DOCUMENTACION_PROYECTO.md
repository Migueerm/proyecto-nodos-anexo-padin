# 📚 Documentación Técnica Completa - Proyecto Nodos TECO

Este documento contiene la especificación técnica completa, la guía de seguridad/control de acceso dinámico remoto, la arquitectura de interfaz y la referencia de despliegue para la versión de producción validada del **Módulo de Carga Masiva de Reportes de Nodos**.

---

## 📂 1. Estructura del Repositorio

```
proyecto nodos teco/
│
├── CargaMasivaReportes.gs     --> Backend Apps Script con lectura remota de permisos desde Planilla Externa
├── Dialogo.html               --> Interfaz Web/Modal responsiva con overlay dinámico e ingesta de datos
├── nodo.txt                   --> Algoritmo de monitoreo y alertas por nodo
├── ALERTAS POR NODOS...txt    --> Triggers de ejecución en minutos pares y bloqueos nocturnos
├── DOCUMENTACION_PROYECTO.md  --> Documentación técnica detallada (este archivo)
└── README.md                  --> Resumen de arquitectura y guía rápida
```

---

## 🔒 2. Control de Acceso Dinámico Remoto (`1TEFwlV7_7A0dY5X2t8qmEFJZT3QVmCj48NPf59Izq-A`)

En el punto de entrada web (`doGet`), el sistema realiza la validación de seguridad consultando dinámicamente la planilla externa de autorizaciones especificada.

### Datos de la Planilla de Autorización:
- **ID de Planilla**: `1TEFwlV7_7A0dY5X2t8qmEFJZT3QVmCj48NPf59Izq-A`
- **Pestaña de Usuarios**: `UsuariosAutorizados` (o primera hoja por defecto).
- **Estructura de Columnas**:
  - **Columna A (`MAIL`)**: Correo electrónico del usuario (ej. `nombre.apellido@konecta.com`).
  - **Columna B (`ACCESO`)**: Menú desplegable con validación estricta (**`SI`** / **`NO`**).

### Funcionamiento:
1. Al intentar acceder a la Web App, el script obtiene el mail mediante `Session.getActiveUser().getEmail()`.
2. La función `obtenerMailsAutorizados()` abre la planilla remota `1TEFwlV7_7A0dY5X2t8qmEFJZT3QVmCj48NPf59Izq-A` y extrae los correos con **`ACCESO = SI`**.
3. **Dar de alta un correo**: Agrega el mail en la Columna A y selecciona **`SI`** en la Columna B.
4. **Revocar acceso**: Selecciona **`NO`** en la Columna B. El cambio surte efecto inmediatamente.
5. **Usuario NO Autorizado**: Muestra la pantalla **"Acceso Denegado ❌"** deteniendo la carga del formulario.

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

3. **Integración de Planillas**:
   - **Planilla Principal de Trabajo (`1-TfFDqea0OkGlQrQdls_3NxMqlQrK8HMieGwPWdLvIo`)**: Almacena las hojas `Historial`, `UltimaCarga`, `UltimoReportado`, `RegistroCargas`, `UltimoResumen` e `Historico`.
   - **Planilla de Autorizaciones (`1TEFwlV7_7A0dY5X2t8qmEFJZT3QVmCj48NPf59Izq-A`)**: Administra los permisos de acceso de usuarios en la hoja `UsuariosAutorizados`.

---

## 🛠️ 5. Guía de Despliegue en Google Apps Script

### Opción A: Web App (Recomendado para producción)
1. En Google Apps Script, ir a **Desplegar > Nueva implementación**.
2. Seleccionar **Aplicación web**.
3. Configuración:
   - **Ejecutar como**: *Tu cuenta de usuario*.
   - **Quién tiene acceso**: *Cualquier persona dentro de la organización*.
4. Hacer clic en **Desplegar** y copiar la URL Web App (`.../exec`).
5. La URL verificará automáticamente el correo del usuario contra la planilla externa `1TEFwlV7_7A0dY5X2t8qmEFJZT3QVmCj48NPf59Izq-A`.

### Opción B: Menú en Google Sheets
1. Al abrir la planilla vinculada, el activador `onOpen()` crea el menú superior **`📤 Carga de archivos > 📄 Subir archivo`**.
2. Abre la ventana modal directamente dentro del entorno de Sheets.
