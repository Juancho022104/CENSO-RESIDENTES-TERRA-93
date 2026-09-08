/**
 * Config.gs
 * Configuración centralizada del sistema de Censo Integral de Residentes.
 * RAVELL PH - Edificio Terra 93 PH
 */

var CONFIG = {
  NOMBRE_SPREADSHEET: 'RAVELL PH - Censo Integral de Residentes',
  CARPETA_RAIZ_DRIVE: 'RAVELL PH',
  CARPETA_COPROPIEDAD_DRIVE: 'TERRA 93',
  CARPETA_CENSO_DRIVE: 'CENSO',
  CARPETA_MASCOTAS_DRIVE: 'MASCOTAS',
  ID_COPROPIEDAD_DEFAULT: 'COP-001',

  PREFIJOS_ID: {
    UNIDAD: 'UNI',
    PERSONA: 'PER',
    RESIDENTE: 'RES',
    VEHICULO: 'VEH',
    BICICLETA: 'BIC',
    MASCOTA: 'MAS',
    AUTORIZADO: 'AUT',
    CONTRATISTA: 'CON',
    EMERGENCIA: 'EME',
    PARQUEADERO: 'PAR',
    DEPOSITO: 'DEP',
    ARRENDAMIENTO: 'ARR',
    COMUNICACION: 'COM',
    ENCUESTA: 'ENC',
    AUDITORIA: 'AUD',
    CONFIG: 'CFG'
  },

  HOJAS: {
    CONFIGURACION: 'CONFIGURACION',
    UNIDADES: 'UNIDADES',
    PERSONAS: 'PERSONAS',
    RESIDENTES: 'RESIDENTES',
    VEHICULOS: 'VEHICULOS',
    BICICLETAS: 'BICICLETAS',
    MASCOTAS: 'MASCOTAS',
    PERSONAS_AUTORIZADAS: 'PERSONAS_AUTORIZADAS',
    CONTRATISTAS: 'CONTRATISTAS',
    EMERGENCIAS: 'EMERGENCIAS',
    PARQUEADEROS: 'PARQUEADEROS',
    DEPOSITOS: 'DEPOSITOS',
    ARRENDAMIENTOS: 'ARRENDAMIENTOS',
    COMUNICACIONES: 'COMUNICACIONES',
    ENCUESTAS: 'ENCUESTAS',
    AUDITORIA: 'AUDITORIA',
    LOG_ERRORES: 'LOG_ERRORES'
  },

  ENCABEZADOS: {
    CONFIGURACION: ['ID_CONFIG', 'PARAMETRO', 'VALOR', 'ESTADO'],
    UNIDADES: ['ID_UNIDAD', 'ID_COPROPIEDAD', 'BLOQUE', 'TORRE', 'PISO', 'APARTAMENTO', 'TIPO_UNIDAD', 'AREA', 'COEFICIENTE', 'ESTADO_OCUPACION', 'ESTADO_REGISTRO', 'CODIGO_CENSO', 'TOKEN_ACTUALIZACION', 'CALIDAD_CENSO', 'FECHA_CREACION', 'FECHA_ACTUALIZACION'],
    PERSONAS: ['ID_PERSONA', 'ID_UNIDAD', 'TIPO_PERSONA', 'NOMBRE_COMPLETO', 'TIPO_DOCUMENTO', 'DOCUMENTO', 'TELEFONO', 'WHATSAPP', 'CORREO', 'RELACION_INMUEBLE', 'PARENTESCO', 'FECHA_INGRESO', 'AUTORIZA_COMUNICACIONES', 'ESTADO', 'FECHA_CREACION', 'FECHA_ACTUALIZACION'],
    RESIDENTES: ['ID_RESIDENTE', 'ID_UNIDAD', 'ID_PERSONA', 'TIPO_RESIDENTE', 'PARENTESCO', 'ES_MENOR', 'ESTADO', 'FECHA_CREACION', 'FECHA_ACTUALIZACION'],
    VEHICULOS: ['ID_VEHICULO', 'ID_UNIDAD', 'ID_PERSONA_RESPONSABLE', 'TIPO_VEHICULO', 'PLACA', 'MARCA', 'LINEA', 'COLOR', 'MODELO', 'PARQUEADERO', 'ES_ELECTRICO', 'ESTADO', 'FECHA_CREACION', 'FECHA_ACTUALIZACION'],
    BICICLETAS: ['ID_BICICLETA', 'ID_UNIDAD', 'CANTIDAD', 'USA_BICICLETERO', 'ESPACIO_ASIGNADO', 'OBSERVACIONES', 'ESTADO'],
    MASCOTAS: ['ID_MASCOTA', 'ID_UNIDAD', 'ID_PERSONA_RESPONSABLE', 'NOMBRE', 'ESPECIE', 'RAZA', 'SEXO', 'EDAD_APROXIMADA', 'DOCUMENTACION', 'URL_DOCUMENTO', 'ESTADO', 'FECHA_CREACION', 'FECHA_ACTUALIZACION'],
    PERSONAS_AUTORIZADAS: ['ID_AUTORIZADO', 'ID_UNIDAD', 'NOMBRE_COMPLETO', 'TIPO_PERSONA', 'TELEFONO', 'DIAS_INGRESO', 'HORARIO_REFERENCIA', 'ESTADO', 'FECHA_CREACION', 'FECHA_ACTUALIZACION'],
    CONTRATISTAS: ['ID_CONTRATISTA', 'ID_UNIDAD', 'NOMBRE_PERSONA_EMPRESA', 'TIPO_SERVICIO', 'FRECUENCIA', 'TELEFONO', 'ESTADO', 'FECHA_CREACION', 'FECHA_ACTUALIZACION'],
    EMERGENCIAS: ['ID_EMERGENCIA', 'ID_UNIDAD', 'NOMBRE_CONTACTO', 'PARENTESCO', 'TELEFONO_PRINCIPAL', 'TELEFONO_ALTERNATIVO', 'CIUDAD', 'ESTADO'],
    PARQUEADEROS: ['ID_PARQUEADERO', 'ID_COPROPIEDAD', 'NUMERO', 'TIPO', 'BLOQUE', 'NIVEL', 'ID_UNIDAD', 'ID_VEHICULO', 'ESTADO', 'OBSERVACIONES'],
    DEPOSITOS: ['ID_DEPOSITO', 'ID_COPROPIEDAD', 'NUMERO', 'UBICACION', 'ID_UNIDAD', 'ESTADO', 'OBSERVACIONES'],
    ARRENDAMIENTOS: ['ID_ARRENDAMIENTO', 'ID_UNIDAD', 'NOMBRE_ARRENDATARIO', 'TELEFONO', 'CORREO', 'FECHA_INICIO', 'FECHA_FIN', 'INMOBILIARIA', 'ESTADO', 'OBSERVACIONES'],
    COMUNICACIONES: ['ID_REGISTRO', 'ID_UNIDAD', 'WHATSAPP', 'CORREO', 'LLAMADA', 'TIPO_COMUNICACION_PREFERIDA', 'AUTORIZACION', 'FECHA_ACTUALIZACION'],
    ENCUESTAS: ['ID_ENCUESTA', 'ID_UNIDAD', 'FECHA', 'ADMINISTRACION', 'SEGURIDAD', 'ASEO', 'MANTENIMIENTO', 'COMUNICACION', 'PROBLEMA_PRINCIPAL', 'PROPUESTA', 'SERVICIO_ADICIONAL', 'OBSERVACIONES'],
    AUDITORIA: ['ID_AUDITORIA', 'FECHA', 'USUARIO', 'ACCION', 'MODULO', 'ID_REGISTRO', 'DESCRIPCION'],
    LOG_ERRORES: ['FECHA', 'FUNCION', 'ERROR', 'USUARIO', 'DATOS_RELEVANTES']
  },

  CACHE_SEGUNDOS: 300
};

/**
 * Este proyecto es un script independiente (no está atado a un Google Sheet
 * como contenedor), así que SpreadsheetApp.getActiveSpreadsheet() siempre
 * devuelve null aquí. La primera vez, crea el spreadsheet del censo y guarda
 * su ID en las propiedades del script; las siguientes veces lo reabre por ID.
 */
function obtenerSpreadsheet() {
  var propiedades = PropertiesService.getScriptProperties();
  var idGuardado = propiedades.getProperty('SPREADSHEET_ID');
  if (idGuardado) {
    return SpreadsheetApp.openById(idGuardado);
  }
  var nuevo = SpreadsheetApp.create(CONFIG.NOMBRE_SPREADSHEET);
  propiedades.setProperty('SPREADSHEET_ID', nuevo.getId());
  return nuevo;
}

/**
 * Crea (si no existen) todas las hojas del sistema con sus encabezados,
 * inicializa la fila de configuración por defecto y las carpetas de Drive.
 * Ejecutar UNA sola vez manualmente desde el editor de Apps Script.
 */
function inicializarSistema() {
  var ss = obtenerSpreadsheet();
  var nombresHojas = Object.keys(CONFIG.HOJAS).map(function (k) { return CONFIG.HOJAS[k]; });

  nombresHojas.forEach(function (nombre) {
    var hoja = ss.getSheetByName(nombre);
    if (!hoja) {
      hoja = ss.insertSheet(nombre);
    }
    var encabezados = CONFIG.ENCABEZADOS[nombre];
    if (encabezados) {
      var rango = hoja.getRange(1, 1, 1, encabezados.length);
      rango.setValues([encabezados]);
      rango.setFontWeight('bold');
      rango.setBackground('#0B3D2E');
      rango.setFontColor('#FFFFFF');
      hoja.setFrozenRows(1);
      hoja.autoResizeColumns(1, encabezados.length);
    }
  });

  // Eliminar hoja por defecto "Hoja 1" si quedó vacía y sin uso
  var hojaDefault = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (hojaDefault && ss.getSheets().length > 1) {
    ss.deleteSheet(hojaDefault);
  }

  inicializarConfiguracionPorDefecto();
  inicializarCarpetasDrive();

  registrarAuditoria('CREAR', 'SISTEMA', '-', 'Inicialización del sistema de censo ejecutada.');

  return 'Sistema inicializado correctamente.';
}

/**
 * Inserta las filas de configuración por defecto si la hoja CONFIGURACION está vacía.
 */
function inicializarConfiguracionPorDefecto() {
  var hoja = obtenerHoja(CONFIG.HOJAS.CONFIGURACION);
  if (hoja.getLastRow() > 1) {
    return; // ya configurado, no sobrescribir
  }

  var textoBienvenida = 'Bienvenido(a) al Censo Integral de Residentes de TERRA 93 PH. ' +
    'Esta información nos permite mantener actualizados los datos de la copropiedad para efectos ' +
    'administrativos, de seguridad y de convivencia.';

  var textoAutorizacion = 'De acuerdo con la Ley 1581 de 2012 y sus decretos reglamentarios, autorizo a RAVELL PH, ' +
    'en calidad de administrador de TERRA 93 PH, para recolectar, almacenar y tratar mis datos personales y los de ' +
    'los demás residentes que registro, con el único fin de la gestión administrativa, de seguridad y de convivencia ' +
    'de la copropiedad. Los datos no serán compartidos con terceros salvo autoridad competente.';

  var textoPolitica = 'RAVELL PH trata los datos personales recolectados en este censo conforme a la política de ' +
    'tratamiento de datos personales de la copropiedad, disponible ante la administración. Usted puede solicitar en ' +
    'cualquier momento la actualización, rectificación o eliminación de sus datos.';

  var filas = [
    ['NOMBRE_COPROPIEDAD', 'TERRA 93 PH', 'ACTIVO'],
    ['NOMBRE_ADMINISTRADOR', 'RAVELL PH', 'ACTIVO'],
    ['CORREO_ADMIN', '', 'ACTIVO'],
    ['TELEFONO_ADMIN', '', 'ACTIVO'],
    ['COLOR_PRINCIPAL', '#0B3D2E', 'ACTIVO'],
    ['TEXTO_BIENVENIDA', textoBienvenida, 'ACTIVO'],
    ['TEXTO_AUTORIZACION_DATOS', textoAutorizacion, 'ACTIVO'],
    ['VERSION_POLITICA_DATOS', '1.0', 'ACTIVO'],
    ['TEXTO_POLITICA_DATOS', textoPolitica, 'ACTIVO'],
    ['HABILITAR_ENCUESTA', 'true', 'ACTIVO'],
    ['HABILITAR_DOCUMENTOS', 'true', 'ACTIVO'],
    ['HABILITAR_VEHICULOS', 'true', 'ACTIVO'],
    ['HABILITAR_MASCOTAS', 'true', 'ACTIVO'],
    ['HABILITAR_BICICLETAS', 'true', 'ACTIVO'],
    ['CORREOS_ADMIN', '', 'ACTIVO'],
    ['ID_COPROPIEDAD', CONFIG.ID_COPROPIEDAD_DEFAULT, 'ACTIVO']
  ];

  filas.forEach(function (fila) {
    var id = generarId(CONFIG.PREFIJOS_ID.CONFIG);
    hoja.appendRow([id, fila[0], fila[1], fila[2]]);
  });
}

/**
 * Crea la estructura de carpetas en Drive: RAVELL PH / TERRA 93 / CENSO / MASCOTAS
 */
function inicializarCarpetasDrive() {
  var raiz = obtenerOCrearCarpeta(CONFIG.CARPETA_RAIZ_DRIVE, DriveApp.getRootFolder());
  var copropiedad = obtenerOCrearCarpeta(CONFIG.CARPETA_COPROPIEDAD_DRIVE, raiz);
  var censo = obtenerOCrearCarpeta(CONFIG.CARPETA_CENSO_DRIVE, copropiedad);
  obtenerOCrearCarpeta(CONFIG.CARPETA_MASCOTAS_DRIVE, censo);
}

/**
 * Obtiene la configuración de una copropiedad como objeto {PARAMETRO: VALOR}, con caché.
 * @param {string} [idCopropiedad] - Si se omite, se usa la única copropiedad configurada.
 */
function obtenerConfiguracion(idCopropiedad) {
  var idBuscado = idCopropiedad || CONFIG.ID_COPROPIEDAD_DEFAULT;
  var cache = CacheService.getScriptCache();
  var claveCache = 'config_' + idBuscado;
  var cacheado = cache.get(claveCache);
  if (cacheado) {
    return JSON.parse(cacheado);
  }

  var filas = obtenerFilasComoObjetos(CONFIG.HOJAS.CONFIGURACION);
  var configuracion = {};
  filas.forEach(function (fila) {
    if (fila.ESTADO === 'ACTIVO') {
      configuracion[fila.PARAMETRO] = fila.VALOR;
    }
  });

  cache.put(claveCache, JSON.stringify(configuracion), CONFIG.CACHE_SEGUNDOS);
  return configuracion;
}

/**
 * Actualiza uno o varios parámetros de configuración (uso administrativo).
 * @param {Object} params - Mapa {PARAMETRO: nuevoValor}
 */
function guardarConfiguracion(params) {
  var hoja = obtenerHoja(CONFIG.HOJAS.CONFIGURACION);
  var datos = hoja.getDataRange().getValues();
  var encabezados = datos[0];
  var colParametro = encabezados.indexOf('PARAMETRO');
  var colValor = encabezados.indexOf('VALOR');

  Object.keys(params).forEach(function (parametro) {
    var encontrado = false;
    for (var i = 1; i < datos.length; i++) {
      if (datos[i][colParametro] === parametro) {
        hoja.getRange(i + 1, colValor + 1).setValue(sanitizarValor(params[parametro]));
        encontrado = true;
        break;
      }
    }
    if (!encontrado) {
      var id = generarId(CONFIG.PREFIJOS_ID.CONFIG);
      hoja.appendRow([id, parametro, sanitizarValor(params[parametro]), 'ACTIVO']);
    }
  });

  CacheService.getScriptCache().remove('config_' + CONFIG.ID_COPROPIEDAD_DEFAULT);
  registrarAuditoria('ACTUALIZAR', 'CONFIGURACION', '-', 'Configuración actualizada.');
  return { exito: true };
}
