// -------------------- ID DE LA PLANILLA DE TRABAJO --------------------
// ID de la planilla principal para funcionamiento tanto desde el Sheet como desde la Web App (doGet)
const SPREADSHEET_ID_LOCAL = '1-TfFDqea0OkGlQrQdls_3NxMqlQrK8HMieGwPWdLvIo';

/**
 * Helper para obtener la planilla de trabajo.
 * - Si se ejecuta desde el contenedor del Sheet, usa getActiveSpreadsheet().
 * - Si se ejecuta desde la URL Web App (doGet), abre la planilla por ID evitando errores de referencia nula.
 */
function getAppSpreadsheet() {
  try {
    const ssActive = SpreadsheetApp.getActiveSpreadsheet();
    if (ssActive) return ssActive;
  } catch (e) {}
  return SpreadsheetApp.openById(SPREADSHEET_ID_LOCAL);
}

// -------------------- DESPLIEGUE WEB APP --------------------
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Dialogo')
    .setTitle('📤 Carga Masiva de Reporte')
    .setFaviconUrl('https://www.google.com/favicon.ico') 
    .addMetaTag('viewport', 'width=device-width, initial-scale=1'); 
}

// Helper para buscar índices de columnas de manera insensible a mayúsculas/minúsculas y espacios
function obtenerIndiceCabecera(cabeceras, nombreEsperado) {
  if (!cabeceras || !Array.isArray(cabeceras)) return -1;
  const normEsperado = nombreEsperado.trim().toUpperCase().replace(/\s+/g, '');
  for (let i = 0; i < cabeceras.length; i++) {
    const normCabecera = String(cabeceras[i] || '').trim().toUpperCase().replace(/\s+/g, '');
    if (normCabecera === normEsperado) {
      return i;
    }
  }
  return -1;
}

// Estructura fija requerida en la hoja Historial y UltimaCarga local
const ENCABEZADOS_HISTORIAL = [
  "FECHA_HORA_CARGA", "USUARIO", "USUARIO_MAIL", "DNI", "MAC", "ABONADO", "ALTURA", "CALLE", 
  "AREA SERVICE", "MODELO", "SERVICIO_AFECTADO", "PISO", "DPTO", "ESTADO", "DOCSIS VERSION", 
  "US TX", "US RX", "US SNR", "US CER", "US CCER", "DS RX", "DS MER", "DS SNR", "DS CER", "DS CCER", 
  "LAST STATUS DOWN", "SCORE", "SEMANA SCORE", "FECHA SCORE", "CALI F_CPE_SCORE", "LNG", "LAT", 
  "CEI", "CMTS", "HUB", "LOCALIDAD", "PROVINCIA", "SERVICE ACCOUNT", "SERVICIO", "VELOCIDAD", 
  "MARCA", "SW VERSION", "HW VERSION", "IP", "TIP O_DOMIC", "COD E_ZIP", "PAQUET E_ADQUIRIDO", 
  "VELO C_DESCARGA", "VELO C_SUBIDA", "NU M_SERIAL_EQUIPO", "OUTAGE"
];

// -------------------- MAPEO MODELO → SERVICIO AFECTADO --------------------
const SERVICIO_MAP = {
  "FAST389615": "Internet HFC",
  "CGA4233TAR": "Internet HFC",
  "FAST3890V3": "Internet HFC",
  "CGA4233TCH3": "Internet HFC",
  "CG3000": "Internet HFC",
  "DPC3848VET": "Internet HFC",
  "FAST3686V2": "Internet HFC",
  "DPC3848VE": "Internet HFC",
  "FAST3686": "Internet HFC",
  "HP4CH": "Flow",
  "B866V6N": "Flow",
  "ZXV10": "Flow",
  "DIW250": "Flow",
  "HP44": "Flow",
  "HP40": "Flow",
  "VSB3918": "Flow",
  "DIW362UHDV2": "Flow",
  "DIW360": "Flow",
  "DCX-4400": "Flow",
  "DCX-4220": "Flow",
  "HG8145X610": "Internet FTTH",
  "HG8245W58Tv2": "Internet FTTH",
  "HG8245U": "Internet FTTH",
  "FAST5657": "Internet FTTH",
  "G1426GD": "Internet FTTH",
  "G240WJ": "Internet FTTH",
  "G2425GB": "Internet FTTH",
  "G240WB": "Internet FTTH",
  "PPV4439B": "Internet FTTH",
  "PRV33AX349B": "Internet FTTH"
};

function obtenerServicio(modelo) {
  if (!modelo) return "";
  return SERVICIO_MAP[String(modelo).trim()] || "";
}

// -------------------- MENÚ Y CONFIGURACIÓN INICIAL --------------------
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('📤 Carga de archivos')
      .addItem('📄 Subir archivo', 'mostrarDialogoCarga')
      .addToUi();
    configurarHojas();
  } catch (e) {
    Logger.log("onOpen omitido fuera del contenedor UI: " + e);
  }
}

function configurarHojas() {
  const ss = getAppSpreadsheet();
  
  let hist = ss.getSheetByName('Historial');
  if (!hist) hist = ss.insertSheet('Historial');
  hist.setFrozenRows(1);
  protegerHoja(hist, 'Solo script puede escribir');
  
  let ult = ss.getSheetByName('UltimaCarga');
  if (!ult) ult = ss.insertSheet('UltimaCarga');
  ult.setFrozenRows(1);
  protegerHoja(ult, 'Solo script puede escribir');

  let rep = ss.getSheetByName('UltimoReportado');
  if (!rep) {
    rep = ss.insertSheet('UltimoReportado');
    rep.getRange(1, 1, 1, 12).setValues([[
      'FECHA_HORA_REPORTE', 'USUARIO_U', 'SERIAL_EQUIPO', 'NODO', 
      'REGION_LOCALIDAD', 'IP', 'DNI', 'EXTRA', 
      'SERVICIO_AFECTADO', 'INCONVENIENTE', 'MAC', 'DOMICILIO_COMPLETO'
    ]]);
  }
  rep.setFrozenRows(1);
  protegerHoja(rep, 'Solo script puede escribir');
  
  let reg = ss.getSheetByName('RegistroCargas');
  if (!reg) {
    reg = ss.insertSheet('RegistroCargas');
  }
  if (reg.getLastRow() === 0) {
    reg.getRange(1,1,1,6).setValues([['Fecha/Hora','Usuario','Mail','Archivo','Cantidad Registros','Estado']]);
  }
  reg.setFrozenRows(1);
  protegerHoja(reg, 'Solo script puede escribir');

  let resumen = ss.getSheetByName('UltimoResumen');
  if (!resumen) {
    resumen = ss.insertSheet('UltimoResumen');
    resumen.getRange(1,1,1,3).setValues([['AREA SERVICE','CALI F_CPE_SCORE','Cantidad']]);
  }
  resumen.setFrozenRows(1);
  protegerHoja(resumen, 'Solo script puede escribir');
}

function protegerHoja(hoja, descripcion) {
  try {
    const protecciones = hoja.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    let proteccion;
    if (protecciones.length > 0) {
      proteccion = protecciones[0];
    } else {
      proteccion = hoja.protect();
    }
    proteccion.setDescription(descripcion);
    proteccion.setWarningOnly(true);
  } catch (e) {
    Logger.log("Aviso en protegerHoja: " + e.message);
  }
}

// -------------------- APERTURA DEL DIÁLOGO --------------------
function mostrarDialogoCarga() {
  const html = HtmlService.createHtmlOutputFromFile('Dialogo')
    .setWidth(850)
    .setHeight(680);
  SpreadsheetApp.getUi().showModalDialog(html, '📤 Carga masiva de reporte');
}

// -------------------- VALIDACIÓN DE ESTRUCTURA --------------------
function validarEstructura(datos) {
  if (!datos || datos.length < 2) {
    return { ok: false, error: 'El archivo debe tener al menos un encabezado y una fila de datos.' };
  }
  const cabecera = datos[0];
  
  const requeridas = [
    "MAC", "ABONADO", "ALTURA", "CALLE", "AREA SERVICE", "MODELO", 
    "CALI F_CPE_SCORE", "LOCALIDAD", "PROVINCIA", "IP", "TIP O_DOMIC", "NU M_SERIAL_EQUIPO"
  ];
  
  for (let i = 0; i < requeridas.length; i++) {
    const idx = obtenerIndiceCabecera(cabecera, requeridas[i]);
    if (idx === -1) {
      return { ok: false, error: `No se encontró la columna requerida "${requeridas[i]}". Verifique el archivo.` };
    }
  }
  return { ok: true };
}

// -------------------- GUARDADO CON LOCK Y FILTRADO DE FILAS VACÍAS --------------------
function guardarEnHistorial(datos, userCodes, userDnis, fileName) {
  const lock = LockService.getDocumentLock() || LockService.getScriptLock();
  try {
    if (lock.tryLock(15000)) {
      const ss = getAppSpreadsheet(); // Soporta ejecuciones desde Sheet UI y desde Web App (doGet)
      configurarHojas(); // Garantiza la existencia de hojas
      
      const hojaHist = ss.getSheetByName('Historial');
      const hojaUltima = ss.getSheetByName('UltimaCarga');
      const hojaReportado = ss.getSheetByName('UltimoReportado');
      const hojaReg = ss.getSheetByName('RegistroCargas');
      const hojaResumen = ss.getSheetByName('UltimoResumen');
      if (!hojaHist || !hojaUltima || !hojaReportado || !hojaReg || !hojaResumen) throw new Error('Faltan hojas del sistema.');

      let userEmail = '';
      try {
        userEmail = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
      } catch (e) {
        userEmail = 'No disponible';
      }
      if (!userEmail || userEmail === '') userEmail = 'No disponible';

      const ahora = new Date();
      const zona = Session.getScriptTimeZone();
      const fechaHoraStr = Utilities.formatDate(ahora, zona, "d/M/yyyy H:mm:ss");

      const datosFiltrados = [];
      for (let i = 1; i < datos.length; i++) {
        const fila = datos[i];
        if (!fila || !Array.isArray(fila)) continue;
        const tieneAlgo = fila.some(celda => celda !== null && celda !== undefined && celda.toString().trim() !== "");
        if (tieneAlgo) {
          datosFiltrados.push(fila);
        }
      }

      const cabeceraArchivo = datos[0];
      const idxDni = obtenerIndiceCabecera(cabeceraArchivo, "DNI"); // Mantenemos internamente "DNI" como id de columna
      const idxCaliFCPE = obtenerIndiceCabecera(cabeceraArchivo, "CALI F_CPE_SCORE");
      const posModelo = obtenerIndiceCabecera(cabeceraArchivo, "MODELO");

      let reportablesCount = datosFiltrados.length;

      if (!userCodes || !userDnis || userCodes.length < reportablesCount || userDnis.length < reportablesCount) {
        return { ok: false, error: `Faltan ingresar datos manuales. Se esperaban ${reportablesCount} registros.` };
      }

      if (hojaHist.getLastRow() === 0) {
        hojaHist.getRange(1, 1, 1, ENCABEZADOS_HISTORIAL.length).setValues([ENCABEZADOS_HISTORIAL]);
      }

      const indexMap = {};
      for (let j = 3; j < ENCABEZADOS_HISTORIAL.length; j++) {
        const hName = ENCABEZADOS_HISTORIAL[j];
        if (hName === "SERVICIO_AFECTADO") continue;
        indexMap[hName] = obtenerIndiceCabecera(cabeceraArchivo, hName);
      }

      const filasAGuardar = [];
      let indexReportables = 0;
      for (let i = 0; i < datosFiltrados.length; i++) {
        const fila = datosFiltrados[i];
        const modelo = posModelo !== -1 ? (fila[posModelo] || "") : "";
        const servicio = obtenerServicio(modelo);
        
        let usuario = userCodes[indexReportables] || (userCodes.length > 0 ? userCodes[0] : "Desconocido");
        let dni = userDnis[indexReportables] || (idxDni !== -1 ? (fila[idxDni] || "") : "");
        indexReportables++;

        const filaHist = [fechaHoraStr, usuario, userEmail];
        for (let j = 3; j < ENCABEZADOS_HISTORIAL.length; j++) {
          const hName = ENCABEZADOS_HISTORIAL[j];
          if (hName === "DNI") {
            filaHist.push(dni); // Aquí se guarda el DNI / CUIT / CUIL
          } else if (hName === "SERVICIO_AFECTADO") {
            filaHist.push(servicio);
          } else {
            const idxInFile = indexMap[hName];
            if (idxInFile !== undefined && idxInFile !== -1) {
              filaHist.push(fila[idxInFile] !== undefined && fila[idxInFile] !== null ? fila[idxInFile] : "");
            } else {
              filaHist.push("");
            }
          }
        }
        filasAGuardar.push(filaHist);
      }

      if (filasAGuardar.length > 0) {
        const ultFila = hojaHist.getLastRow();
        hojaHist.getRange(ultFila + 1, 1, filasAGuardar.length, filasAGuardar[0].length)
          .setValues(filasAGuardar);
      }

      hojaUltima.clear();
      hojaUltima.getRange(1, 1, 1, ENCABEZADOS_HISTORIAL.length).setValues([ENCABEZADOS_HISTORIAL]);
      if (filasAGuardar.length > 0) {
        hojaUltima.getRange(2, 1, filasAGuardar.length, filasAGuardar[0].length)
          .setValues(filasAGuardar);
      }

      hojaReg.appendRow([fechaHoraStr, userCodes.slice(0, 5).join(', ') + (userCodes.length > 5 ? '...' : ''), userEmail, fileName || 'Archivo Cargado', filasAGuardar.length, 'OK']);

      const idxNodo = obtenerIndiceCabecera(cabeceraArchivo, "AREA SERVICE");
      const resumenMap = {};
      for (let i = 0; i < datosFiltrados.length; i++) {
        const fila = datosFiltrados[i];
        const nodo = idxNodo !== -1 ? String(fila[idxNodo] || '').trim() : "";
        const estado = idxCaliFCPE !== -1 ? String(fila[idxCaliFCPE] || '').trim() : "";
        const clave = `${nodo}|||${estado}`;
        resumenMap[clave] = (resumenMap[clave] || 0) + 1;
      }

      const filasResumen = Object.entries(resumenMap)
        .map(([clave, cantidad]) => {
          const [nodo, estado] = clave.split('|||');
          return [nodo, estado, cantidad];
        })
        .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

      hojaResumen.clear();
      hojaResumen.getRange(1, 1, 1, 3).setValues([['NODO', 'ESTADO', 'CANTIDAD']]);
      if (filasResumen.length > 0) {
        hojaResumen.getRange(2, 1, filasResumen.length, 3).setValues(filasResumen);
      }

      const resultadoExterno = insertarEnEstructuraFormOptimizado(datosFiltrados, userCodes, userDnis, cabeceraArchivo);

      hojaReportado.clear();
      hojaReportado.getRange(1, 1, 1, 12).setValues([[
        'FECHA_HORA_REPORTE', 'USUARIO_U', 'SERIAL_EQUIPO', 'NODO', 
        'REGION_LOCALIDAD', 'IP', 'DNI', 'EXTRA', 
        'SERVICIO_AFECTADO', 'INCONVENIENTE', 'MAC', 'DOMICILIO_COMPLETO'
      ]]);
      const filasReportadas = resultadoExterno.filasReportadas;
      if (filasReportadas && filasReportadas.length > 0) {
        const filasAMostrar = filasReportadas.map(fila => {
          const filaCopia = [...fila];
          filaCopia[0] = fechaHoraStr;
          return filaCopia;
        });
        hojaReportado.getRange(2, 1, filasAMostrar.length, 12).setValues(filasAMostrar);
      }

      return {
        ok: true,
        filasGuardadas: filasAGuardar.length,
        ignoradosOK: resultadoExterno.ignoradosOK,
        detallesPorNodo: resultadoExterno.detallesPorNodo
      };
    } else {
      return { ok: false, error: 'El sistema está ocupado. Intentá de nuevo en unos segundos.' };
    }
  } catch (e) {
    return { ok: false, error: e.toString() };
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

// -------------------- VERSIÓN OPTIMIZADA EXTERNA --------------------
function insertarEnEstructuraFormOptimizado(datos, userCodes, userDnis, cabeceraArchivo) {
  const ssDestino = SpreadsheetApp.openById(SPREADSHEET_ID_LOCAL); 
  const hojaForm = ssDestino.getSheetByName('Historico');
  if (!hojaForm) throw new Error("No se encontró la hoja de destino 'Historico'");

  const filasAInsertar = [];
  let contadorIgnorados = 0;
  let nodosIgnorados = {};
  const fechaNativa = new Date();
  
  const idxDni = obtenerIndiceCabecera(cabeceraArchivo, "DNI");
  const idxMac = obtenerIndiceCabecera(cabeceraArchivo, "MAC");
  const idxAltura = obtenerIndiceCabecera(cabeceraArchivo, "ALTURA");
  const idxCalle = obtenerIndiceCabecera(cabeceraArchivo, "CALLE");
  const idxNodo = obtenerIndiceCabecera(cabeceraArchivo, "AREA SERVICE");
  const idxModelo = obtenerIndiceCabecera(cabeceraArchivo, "MODELO");
  const idxPiso = obtenerIndiceCabecera(cabeceraArchivo, "PISO");
  const idxDpto = obtenerIndiceCabecera(cabeceraArchivo, "DPTO");
  const idxCaliFCPE = obtenerIndiceCabecera(cabeceraArchivo, "CALI F_CPE_SCORE");
  const idxLocalidad = obtenerIndiceCabecera(cabeceraArchivo, "LOCALIDAD");
  const idxProvincia = obtenerIndiceCabecera(cabeceraArchivo, "PROVINCIA");
  const idxIp = obtenerIndiceCabecera(cabeceraArchivo, "IP");
  const idxTipoDomicilio = obtenerIndiceCabecera(cabeceraArchivo, "TIP O_DOMIC");
  const idxSerialEquipo = obtenerIndiceCabecera(cabeceraArchivo, "NU M_SERIAL_EQUIPO");

  let indexReportables = 0;

  for (let i = 0; i < datos.length; i++) {
    const fila = datos[i];
    if (!fila || !Array.isArray(fila)) continue;
    
    const mac = idxMac !== -1 ? (fila[idxMac] || "") : "";
    const altura = idxAltura !== -1 ? (fila[idxAltura] || "") : "";
    const calle = idxCalle !== -1 ? (fila[idxCalle] || "") : "";
    const nodo = idxNodo !== -1 ? (fila[idxNodo] || "") : "";
    const modelo = idxModelo !== -1 ? (fila[idxModelo] || "") : "";
    const piso = (idxPiso !== -1 && fila[idxPiso]) ? " PISO " + fila[idxPiso] : "";
    const dpto = (idxDpto !== -1 && fila[idxDpto]) ? " DPTO " + fila[idxDpto] : "";
    const caliFCPE = idxCaliFCPE !== -1 ? (fila[idxCaliFCPE] || "") : "";
    const localidad = idxLocalidad !== -1 ? (fila[idxLocalidad] || "") : "";
    const provincia = idxProvincia !== -1 ? (fila[idxProvincia] || "") : "";
    const ip = idxIp !== -1 ? (fila[idxIp] || "") : "";
    let tipoDomicilio = idxTipoDomicilio !== -1 ? (fila[idxTipoDomicilio] || "") : "";
    const serialEquipo = idxSerialEquipo !== -1 ? (fila[idxSerialEquipo] || "") : "";

    const usuarioLogueado = userCodes[indexReportables] || (userCodes.length > 0 ? userCodes[0] : "Desconocido");
    const dni = userDnis[indexReportables] || (idxDni !== -1 ? (fila[idxDni] || "") : "");
    indexReportables++;

    const tipoNormalizado = tipoDomicilio.toString().trim().toLowerCase().replace(/\s+/g, '');
    if (tipoNormalizado === "sinclasificar" || tipoNormalizado === "sincalsificar") {
      tipoDomicilio = "";
    }

    const servicioAfectado = obtenerServicio(modelo);
    
    let inconveniente = "CAIDO";
    if (tipoDomicilio.trim() !== "") {
      inconveniente += ", " + tipoDomicilio.trim().toUpperCase();
    }

    const regionLocalidad = `${provincia} , ${localidad}`.toUpperCase();
    const domicilioCompleto = `${calle} ${altura}${piso}${dpto}`.trim().toUpperCase();

    const filaForm = [
      fechaNativa, usuarioLogueado, serialEquipo, nodo, regionLocalidad, ip,
      dni, "", servicioAfectado, inconveniente, mac, domicilioCompleto
    ];

    filasAInsertar.push(filaForm);
  }

  if (filasAInsertar.length > 0) {
    const ultFila = hojaForm.getLastRow();
    const filaInicio = ultFila + 1;
    const filasNecesarias = filaInicio + filasAInsertar.length - hojaForm.getMaxRows();
    if (filasNecesarias > 0) {
      hojaForm.insertRowsAfter(hojaForm.getMaxRows(), filasNecesarias + 5);
    }
    hojaForm.getRange(filaInicio, 1, filasAInsertar.length, filasAInsertar[0].length)
            .setValues(filasAInsertar);
  }

  return {
    filasInsertadas: filasAInsertar.length,
    ignoradosOK: contadorIgnorados,
    detallesPorNodo: nodosIgnorados,
    filasReportadas: filasAInsertar
  };
}
