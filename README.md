# 🚀 Proyecto Nodos TECO (Carga Masiva y Monitoreo de Nodos)

Sistema de automatización en **Google Apps Script (GAS)** para la carga masiva, estandarización de reportes de servicio, mapeo de equipos, almacenamiento local/remoto, control de acceso por lista blanca y monitoreo automático de concentraciones/masivos en nodos de red.

---

## 📐 Arquitectura General del Sistema

```mermaid
flowchart TD
    A[Usuario Web / Operador] -->|Abre URL Web App| B{doGet - Control de Acceso}
    B -->|Correo NO en MAILS_AUTORIZADOS| C[Pantalla Acceso Denegado ❌]
    B -->|Correo Autorizado| D[Dialogo.html - Carga Masiva]
    D -->|Subida XLSX/CSV & Asignación U/DNI| E[CargaMasivaReportes.gs]
    E -->|Normaliza cabeceras & mapea SERVICIO_MAP| F[LockService & Guardado]
    F -->|Guarda localmente| G[(Hojas: Historial, UltimaCarga, UltimoReportado, etc.)]
    F -->|Inserta remotamente| H[(Google Sheet Historico ID: 1-TfFDqea0Ok...)]
    H -->|Evaluación cada 1 min| I[ALERTAS POR NODOS / nodo.txt]
    I -->|Detecta masivo >= 5 reportes| J[Notificación MailApp a Operaciones]
```

---

## 🗂️ Estructura de Archivos y Módulos

| Archivo | Descripción | Estado |
| :--- | :--- | :--- |
| **`CargaMasivaReportes.gs`** | Backend Apps Script con control de acceso por lista blanca (`MAILS_AUTORIZADOS`), helper `getAppSpreadsheet()`, mapeo de modelos a servicios (`Internet HFC`, `Flow`, `Internet FTTH`) y guardado concurrente con `LockService`. | **Producción** |
| **`Dialogo.html`** | Interfaz Web/Modal responsiva con animación overlay modal (`#loadingOverlay`), reseteo en caliente de formulario y validación dinámica de Identificador (DNI) y Código U. | **Producción** |
| **`nodo.txt`** | Algoritmo de evaluación de masivos por nodo, filtrado por antigüedad (`MAX_LOOKBACK_HOURS`), deduplicación con `PropertiesService` y envío de notificaciones. | **Producción** |
| **`ALERTAS POR NODOS (EJECUCIÓN MINU.txt`** | Configuración de triggers temporales, ventana de bloqueo nocturno (00:59–03:00) y tareas de limpieza diaria. | **Producción** |
| **`DOCUMENTACION_PROYECTO.md`** | Documentación técnica completa y especificación detallada del proyecto. | **Documentación** |
| **`README.md`** | Resumen de arquitectura y guía técnica general. | **Documentación** |

---

## ⚙️ Funcionalidades Clave

### 1. Control de Acceso por Lista Blanca (`MAILS_AUTORIZADOS`)
* Restringe el acceso a la Web App verificando el mail del usuario (`Session.getActiveUser().getEmail()`).
* Bloquea a usuarios no autorizados antes de cargar la interfaz, retornando un aviso de acceso restringido.

### 2. Overlay Modal y Reseteo sin Recargar
* Ventana modal flotante con estado visual animado durante la subida e integración de datos.
* Reseteo fluido de estado tras completar la carga sin requerir recargar la página Web.

### 3. Mapeo Inteligente Modelo → Servicio
* **Internet HFC**: `FAST389615`, `CGA4233TAR`, `FAST3890V3`, `CGA4233TCH3`, `CG3000`, `DPC3848VET`, `FAST3686V2`, `DPC3848VE`, `FAST3686`.
* **Flow**: `HP4CH`, `B866V6N`, `ZXV10`, `DIW250`, `HP44`, `HP40`, `VSB3918`, `DIW362UHDV2`, `DIW360`, `DCX-4400`, `DCX-4220`.
* **Internet FTTH**: `HG8145X610`, `HG8245W58Tv2`, `HG8245U`, `FAST5657`, `G1426GD`, `G240WJ`, `G2425GB`, `G240WB`, `PPV4439B`, `PRV33AX349B`.

### 4. Gestión de Hojas Locales y Remotas
* **`Historial`**: Almacén acumulativo de cargas.
* **`UltimaCarga`**: Espejo únicamente del último archivo subido.
* **`UltimoReportado`**: Matriz unificada de 12 columnas.
* **`RegistroCargas`**: Bitácora de transacciones.
* **`UltimoResumen`**: Métrica por nodo y estado.
* **`Historico` (Externa)**: Inserción directa en la planilla principal `1-TfFDqea0OkGlQrQdls_3NxMqlQrK8HMieGwPWdLvIo`.

---

## 👨‍💻 Autoría y Créditos
- **Desarrollado por**: Lautaro Padin
- **Impulsado por**: Nodos MERM
