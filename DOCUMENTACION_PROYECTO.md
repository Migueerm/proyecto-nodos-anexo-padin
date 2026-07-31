# 📚 Documentación Técnica Completa - Proyecto Nodos TECO

Este documento contiene la especificación completa, la guía de despliegue y la referencia de código de ambas ramas del proyecto (**`main`** de producción y **`dev`** de desarrollo web).

---

## 📂 1. Estructura del Repositorio y Ramas

```
proyecto nodos teco/
│
├── main (Rama de Producción Protegida)
│   ├── CargaMasivaReportes.gs     --> Backend original ligado al Sheet
│   ├── Dialogo.html               --> Interfaz modal HTML original de producción
│   ├── nodo.txt                   --> Algoritmo de monitoreo y alertas por nodo
│   ├── ALERTAS POR NODOS...txt    --> Triggers de ejecución en minutos pares y bloqueos nocturnos
│   └── README.md                  --> Guía general de arquitectura
│
└── dev (Rama de Desarrollo para Web App Aislada)
    ├── CargaMasivaReportes.gs     --> Backend con getAppSpreadsheet() y doGet() para Web App
    ├── Dialogo.html               --> Interfaz HTML responsiva con asignación masiva e integración dual
    ├── nodo.txt                   --> Algoritmo de monitoreo y alertas por nodo
    ├── ALERTAS POR NODOS...txt    --> Triggers y ventana de limpieza
    ├── DOCUMENTACION_PROYECTO.md  --> Documentación detallada del proyecto
    └── README.md                  --> Guía de arquitectura actualizada
```

---

## 🔁 2. Comandos para Alternar entre Ramas

Para cambiar de versión en cualquier momento desde la terminal en `C:\Users\migue\Desktop\proyecto nodos teco`:

* **Ver rama activa**:
  ```bash
  git branch
  ```
* **Ir a la versión de Producción (`main`)**:
  ```bash
  git checkout main
  ```
* **Ir a la versión de Desarrollo Web App (`dev`)**:
  ```bash
  git checkout dev
  ```

---

## ⚡ 3. Comparativa de Código: `main` vs `dev`

### A. Diferencias en `CargaMasivaReportes.gs`

| Característica | Rama `main` (Producción) | Rama `dev` (Web App) |
| :--- | :--- | :--- |
| **Punto de Entrada Web** | No disponible (`onOpen` en Sheet únicamente) | Disponible mediante `doGet(e)` |
| **Referencia a Planilla** | `SpreadsheetApp.getActiveSpreadsheet()` | `getAppSpreadsheet()` (Detecta si corre desde Sheet o desde URL Web) |
| **Manejo de Errores UI** | Asume contenedor gráfico abierto | Bloques `try/catch` defensivos si corre fuera de Sheets |
| **Serialización de Arrays** | Estándar | Sanitizado tolerante a celdas vacías/nulas |

### B. Diferencias en `Dialogo.html`

| Característica | Rama `main` (Producción) | Rama `dev` (Web App) |
| :--- | :--- | :--- |
| **Estilo Visual** | CSS Outfit clásico de producción | CSS Outfit enriquecido con barra de modo seguro |
| **Asignación de Datos** | Casillas individuales por fila | Casillas individuales + Barra de autocompletado masivo (`⚡ Asignación Masiva`) |
| **Cierre de Ventana** | `google.script.host.close()` directo | `cerrarVentana()` defensivo (compatible con navegador web y modal) |

---

## 🛠️ 4. Guía de Despliegue en Google Apps Script

### Opción A: Ejecución como Menú en Google Sheets (Modal Dialog)
1. Abrir la planilla de Google Sheets.
2. Ir a **Extensiones > Apps Script**.
3. Pegar los archivos `CargaMasivaReportes.gs` y `Dialogo.html`.
4. Al abrir o recargar la planilla, aparecerá el menú `📤 Carga de archivos > 📄 Subir archivo`.

### Opción B: Ejecución como Web App Independiente (Recomendado para Seguridad)
1. En Google Apps Script, ir a **Desplegar > Nueva implementación**.
2. Seleccionar el tipo **Aplicación web**.
3. Configurar:
   * **Ejecutar como**: *Tu cuenta de usuario*.
   * **Quién tiene acceso**: *Cualquier persona dentro de tu organización*.
4. Hacer clic en **Desplegar**.
5. Copiar la **URL de la aplicación web** generada (`.../exec`).
6. Compartir esa URL a los operadores: ellos podrán cargar archivos desde la web sin ver ni modificar las celdas de la planilla.

---

## 🔒 5. Hojas y Formato de Almacenamiento

El sistema gestiona de manera automática las siguientes 5 hojas en la planilla local:

1. **`Historial`**: Almacena todos los datos alineados a `ENCABEZADOS_HISTORIAL`.
2. **`UltimaCarga`**: Se sobrescribe en cada carga con los registros del último lote procesado.
3. **`UltimoReportado`**: Formato de 12 columnas unificado enviado a la hoja externa.
4. **`RegistroCargas`**: Bitácora de transacciones (Fecha/Hora, Usuario, Mail, Archivo, Registros, Estado).
5. **`UltimoResumen`**: Métrica de cantidad de reportes agrupados por `NODO` (`AREA SERVICE`) y `ESTADO`.
