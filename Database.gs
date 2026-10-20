/**
 * Database.gs
 * Helpers genéricos de acceso a las hojas de cálculo y funciones de creación
 * de entidades del censo.
 */

/**
 * Obtiene (o crea) la hoja por nombre.
 */
function obtenerHoja(nombre) {
  var ss = obtenerSpreadsheet();
  var hoja = ss.getSheetByName(nombre);
  if (!hoja) {
    hoja = ss.insertSheet(nombre);
    var encabezados = CONFIG.ENCABEZADOS[nombre];
    if (encabezados) {
      hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados]);
    }
  }
  return hoja;
}

/**
 * Devuelve todas las filas de una hoja como arreglo de objetos {ENCABEZADO: valor}.
 */
function obtenerFilasComoObjetos(nombreHoja) {
  var hoja = obtenerHoja(nombreHoja);
  var ultimaFila = hoja.getLastRow();
  if (ultimaFila < 2) {
    return [];
  }
  var datos = hoja.getRange(1, 1, ultimaFila, hoja.getLastColumn()).getValues();
  var encabezados = datos[0];
  var filas = [];
  for (var i = 1; i < datos.length; i++) {
    var objeto = {};
    for (var j = 0; j < encabezados.length; j++) {
      objeto[encabezados[j]] = datos[i][j];
    }
    objeto._fila = i + 1; // referencia interna para actualizaciones
    filas.push(objeto);
  }
  return filas;
}

/**
 * Inserta una fila en la hoja indicada respetando el orden de encabezados configurado.
 * @param {string} nombreHoja
 * @param {Object} objetoFila - Mapa {ENCABEZADO: valor}
 */
function insertarFila(nombreHoja, objetoFila) {
  var hoja = obtenerHoja(nombreHoja);
  var encabezados = obtenerEncabezadosReales(hoja, nombreHoja);
  var fila = encabezados.map(function (encabezado) {
    var valor = objetoFila[encabezado];
    return valor === undefined || valor === null ? '' : sanitizarValor(valor);
  });
  // Se escribe en la primera fila libre a partir de la columna A con el ancho real
  // de los encabezados (appendRow ya hace esto, pero así queda explícito el mapeo).
  hoja.appendRow(fila);
  return fila;
}

/**
 * Lee los encabezados reales de la fila 1 de la hoja. Así el orden de las columnas
 * lo manda la hoja y no el código: si alguien inserta, borra o mueve columnas,
 * los datos nuevos siguen cayendo bajo el encabezado correcto.
 * Si la fila 1 está vacía, se usa el orden definido en CONFIG.
 */
function obtenerEncabezadosReales(hoja, nombreHoja) {
  var porDefecto = CONFIG.ENCABEZADOS[nombreHoja] || [];
  var ultimaColumna = hoja.getLastColumn();
  if (ultimaColumna < 1) return porDefecto;
  var reales = hoja.getRange(1, 1, 1, ultimaColumna).getValues()[0]
    .map(function (h) { return String(h).trim(); });
  while (reales.length > 0 && reales[reales.length - 1] === '') reales.pop();
  return reales.length > 0 ? reales : porDefecto;
}

/**
 * Actualiza una fila existente localizada por el valor de su columna ID (primera columna).
 */
function actualizarFilaPorId(nombreHoja, idValor, cambios) {
  var hoja = obtenerHoja(nombreHoja);
  var ultimaFila = hoja.getLastRow();
  if (ultimaFila < 2) return false;
  var encabezados = obtenerEncabezadosReales(hoja, nombreHoja);
  var datos = hoja.getRange(1, 1, ultimaFila, encabezados.length).getValues();

  for (var i = 1; i < datos.length; i++) {
    if (datos[i][0] === idValor) {
      Object.keys(cambios).forEach(function (campo) {
        var col = encabezados.indexOf(campo);
        if (col >= 0) {
          hoja.getRange(i + 1, col + 1).setValue(sanitizarValor(cambios[campo]));
        }
      });
      return true;
    }
  }
  return false;
}

/**
 * Genera un ID único con prefijo, atómico mediante LockService + PropertiesService.
 * Padding a 5 dígitos (6 para auditoría).
 */
function generarId(prefijo) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var propiedades = PropertiesService.getScriptProperties();
    var clave = 'contador_' + prefijo;
    var actual = parseInt(propiedades.getProperty(clave) || '0', 10);
    var siguiente = actual + 1;
    propiedades.setProperty(clave, String(siguiente));
    var padding = prefijo === CONFIG.PREFIJOS_ID.AUDITORIA ? 6 : 5;
    var numero = String(siguiente);
    while (numero.length < padding) {
      numero = '0' + numero;
    }
    return prefijo + '-' + numero;
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Funciones de creación de entidades
// ---------------------------------------------------------------------------

function crearPersona(datos) {
  var ahora = new Date();
  var id = generarId(CONFIG.PREFIJOS_ID.PERSONA);
  insertarFila(CONFIG.HOJAS.PERSONAS, {
    ID_PERSONA: id,
    ID_UNIDAD: datos.idUnidad,
    TIPO_PERSONA: datos.tipoPersona || '',
    NOMBRE_COMPLETO: datos.nombreCompleto || '',
    TIPO_DOCUMENTO: datos.tipoDocumento || '',
    DOCUMENTO: datos.documento || '',
    TELEFONO: datos.telefono || '',
    WHATSAPP: datos.whatsapp || '',
    CORREO: datos.correo || '',
    RELACION_INMUEBLE: datos.relacionInmueble || '',
    PARENTESCO: datos.parentesco || '',
    FECHA_INGRESO: datos.fechaIngreso || '',
    AUTORIZA_COMUNICACIONES: datos.autorizaComunicaciones || '',
    ESTADO: 'ACTIVO',
    FECHA_CREACION: ahora,
    FECHA_ACTUALIZACION: ahora
  });
  registrarIndiceDuplicado('DOCUMENTO', datos.documento);
  return id;
}

function crearResidente(datos) {
  var ahora = new Date();
  var id = generarId(CONFIG.PREFIJOS_ID.RESIDENTE);
  insertarFila(CONFIG.HOJAS.RESIDENTES, {
    ID_RESIDENTE: id,
    ID_UNIDAD: datos.idUnidad,
    ID_PERSONA: datos.idPersona,
    TIPO_RESIDENTE: datos.tipoResidente || '',
    PARENTESCO: datos.parentesco || '',
    ES_MENOR: datos.esMenor || '',
    ESTADO: 'ACTIVO',
    FECHA_CREACION: ahora,
    FECHA_ACTUALIZACION: ahora
  });
  return id;
}

function crearVehiculo(datos) {
  var ahora = new Date();
  var id = generarId(CONFIG.PREFIJOS_ID.VEHICULO);
  insertarFila(CONFIG.HOJAS.VEHICULOS, {
    ID_VEHICULO: id,
    ID_UNIDAD: datos.idUnidad,
    ID_PERSONA_RESPONSABLE: datos.idPersonaResponsable || '',
    TIPO_VEHICULO: datos.tipoVehiculo || '',
    PLACA: datos.placa || '',
    MARCA: datos.marca || '',
    LINEA: datos.linea || '',
    COLOR: datos.color || '',
    MODELO: datos.modelo || '',
    PARQUEADERO: datos.parqueadero || '',
    ES_ELECTRICO: datos.esElectrico || '',
    ESTADO: 'ACTIVO',
    FECHA_CREACION: ahora,
    FECHA_ACTUALIZACION: ahora
  });
  if (datos.placa) {
    registrarIndiceDuplicado('PLACA', datos.placa);
  }
  return id;
}

function crearBicicleta(datos) {
  var id = generarId(CONFIG.PREFIJOS_ID.BICICLETA);
  insertarFila(CONFIG.HOJAS.BICICLETAS, {
    ID_BICICLETA: id,
    ID_UNIDAD: datos.idUnidad,
    CANTIDAD: datos.cantidad || 0,
    COLOR: datos.color || '',
    MODELO: datos.modelo || '',
    NUMERO_TARJETA_PROPIEDAD: datos.numeroTarjetaPropiedad || '',
    USA_BICICLETERO: datos.usaBiciletero || '',
    ESPACIO_ASIGNADO: datos.espacioAsignado || '',
    URL_FOTO_BICI: datos.urlFotoBici || '',
    URL_FOTO_TARJETA_PROPIEDAD: datos.urlFotoTarjetaPropiedad || '',
    OBSERVACIONES: datos.observaciones || '',
    ESTADO: 'ACTIVO'
  });
  return id;
}

function crearMascota(datos) {
  var ahora = new Date();
  var id = generarId(CONFIG.PREFIJOS_ID.MASCOTA);
  insertarFila(CONFIG.HOJAS.MASCOTAS, {
    ID_MASCOTA: id,
    ID_UNIDAD: datos.idUnidad,
    ID_PERSONA_RESPONSABLE: datos.idPersonaResponsable || '',
    NOMBRE: datos.nombre || '',
    ESPECIE: datos.especie || '',
    RAZA: datos.raza || '',
    SEXO: datos.sexo || '',
    EDAD_APROXIMADA: datos.edadAproximada || '',
    URL_CARNET_VACUNAS: datos.urlCarnetVacunas || '',
    URL_FOTO_MASCOTA: datos.urlFotoMascota || '',
    URL_POLIZA: datos.urlPoliza || '',
    URL_CHIP: datos.urlChip || '',
    OBSERVACIONES: datos.observaciones || '',
    ESTADO: 'ACTIVO',
    FECHA_CREACION: ahora,
    FECHA_ACTUALIZACION: ahora
  });
  return id;
}

function crearPersonaAutorizada(datos) {
  var ahora = new Date();
  var id = generarId(CONFIG.PREFIJOS_ID.AUTORIZADO);
  insertarFila(CONFIG.HOJAS.PERSONAS_AUTORIZADAS, {
    ID_AUTORIZADO: id,
    ID_UNIDAD: datos.idUnidad,
    NOMBRE_COMPLETO: datos.nombreCompleto || '',
    TIPO_PERSONA: datos.tipoPersona || '',
    TELEFONO: datos.telefono || '',
    DIAS_INGRESO: datos.diasIngreso || '',
    HORARIO_REFERENCIA: datos.horarioReferencia || '',
    ESTADO: 'ACTIVO',
    FECHA_CREACION: ahora,
    FECHA_ACTUALIZACION: ahora
  });
  return id;
}

function crearContratista(datos) {
  var ahora = new Date();
  var id = generarId(CONFIG.PREFIJOS_ID.CONTRATISTA);
  insertarFila(CONFIG.HOJAS.CONTRATISTAS, {
    ID_CONTRATISTA: id,
    ID_UNIDAD: datos.idUnidad,
    NOMBRE_PERSONA_EMPRESA: datos.nombrePersonaEmpresa || '',
    TIPO_SERVICIO: datos.tipoServicio || '',
    FRECUENCIA: datos.frecuencia || '',
    TELEFONO: datos.telefono || '',
    ESTADO: 'ACTIVO',
    FECHA_CREACION: ahora,
    FECHA_ACTUALIZACION: ahora
  });
  return id;
}

function crearContactoEmergencia(datos) {
  var id = generarId(CONFIG.PREFIJOS_ID.EMERGENCIA);
  insertarFila(CONFIG.HOJAS.EMERGENCIAS, {
    ID_EMERGENCIA: id,
    ID_UNIDAD: datos.idUnidad,
    NOMBRE_CONTACTO: datos.nombreContacto || '',
    PARENTESCO: datos.parentesco || '',
    TELEFONO_PRINCIPAL: datos.telefonoPrincipal || '',
    TELEFONO_ALTERNATIVO: datos.telefonoAlternativo || '',
    CORREO: datos.correo || '',
    CIUDAD: datos.ciudad || '',
    ESTADO: 'ACTIVO'
  });
  return id;
}

function crearArrendamiento(datos) {
  var id = generarId(CONFIG.PREFIJOS_ID.ARRENDAMIENTO);
  insertarFila(CONFIG.HOJAS.ARRENDAMIENTOS, {
    ID_ARRENDAMIENTO: id,
    ID_UNIDAD: datos.idUnidad,
    NOMBRE_ARRENDATARIO: datos.nombreArrendatario || '',
    TELEFONO: datos.telefono || '',
    CORREO: datos.correo || '',
    FECHA_INICIO: '',
    FECHA_FIN: '',
    INMOBILIARIA: datos.inmobiliaria || '',
    ESTADO: 'ACTIVO',
    OBSERVACIONES: datos.observaciones || ''
  });
  return id;
}

function crearDeposito(datos) {
  var id = generarId(CONFIG.PREFIJOS_ID.DEPOSITO);
  insertarFila(CONFIG.HOJAS.DEPOSITOS, {
    ID_DEPOSITO: id,
    ID_COPROPIEDAD: datos.idCopropiedad || CONFIG.ID_COPROPIEDAD_DEFAULT,
    NUMERO: datos.numero || '',
    UBICACION: datos.ubicacion || '',
    ID_UNIDAD: datos.idUnidad,
    ESTADO: 'ACTIVO',
    OBSERVACIONES: datos.observaciones || ''
  });
  return id;
}

function crearRegistroComunicacion(datos) {
  var id = generarId(CONFIG.PREFIJOS_ID.COMUNICACION);
  insertarFila(CONFIG.HOJAS.COMUNICACIONES, {
    ID_REGISTRO: id,
    ID_UNIDAD: datos.idUnidad,
    WHATSAPP: datos.whatsapp || '',
    CORREO: datos.correo || '',
    LLAMADA: datos.llamada || '',
    TIPO_COMUNICACION_PREFERIDA: datos.tipoComunicacionPreferida || '',
    AUTORIZACION: datos.autorizacion || '',
    FECHA_ACTUALIZACION: new Date()
  });
  return id;
}

function crearEncuesta(datos) {
  var id = generarId(CONFIG.PREFIJOS_ID.ENCUESTA);
  insertarFila(CONFIG.HOJAS.ENCUESTAS, {
    ID_ENCUESTA: id,
    ID_UNIDAD: datos.idUnidad,
    FECHA: new Date(),
    ADMINISTRACION: datos.administracion || '',
    SEGURIDAD: datos.seguridad || '',
    ASEO: datos.aseo || '',
    MANTENIMIENTO: datos.mantenimiento || '',
    COMUNICACION: datos.comunicacion || '',
    PROBLEMA_PRINCIPAL: datos.problemaPrincipal || '',
    PROPUESTA: datos.propuesta || '',
    SERVICIO_ADICIONAL: datos.servicioAdicional || '',
    OBSERVACIONES: datos.observaciones || ''
  });
  return id;
}

/**
 * Crea la unidad (inmueble) inicial y devuelve su ID.
 */
function crearUnidad(datos) {
  var ahora = new Date();
  var id = generarId(CONFIG.PREFIJOS_ID.UNIDAD);
  var codigoCenso = 'CENSO-' + id.split('-')[1] + Math.floor(100 + Math.random() * 900);
  var token = Utilities.getUuid();
  insertarFila(CONFIG.HOJAS.UNIDADES, {
    ID_UNIDAD: id,
    ID_COPROPIEDAD: datos.idCopropiedad || CONFIG.ID_COPROPIEDAD_DEFAULT,
    APARTAMENTO: datos.apartamento || '',
    TIPO_UNIDAD: 'Apartamento',
    AREA: datos.area || '',
    COEFICIENTE: datos.coeficiente || '',
    ESTADO_OCUPACION: datos.estadoOcupacion || '',
    ESTADO_REGISTRO: 'CENSADO',
    CODIGO_CENSO: codigoCenso,
    TOKEN_ACTUALIZACION: token,
    CALIDAD_CENSO: 0,
    FECHA_CREACION: ahora,
    FECHA_ACTUALIZACION: ahora
  });
  registrarIndiceDuplicado('APTO', String(datos.apartamento || ''));
  return { idUnidad: id, codigoCenso: codigoCenso, tokenActualizacion: token };
}

function obtenerUnidad(idUnidad) {
  var filas = obtenerFilasComoObjetos(CONFIG.HOJAS.UNIDADES);
  for (var i = 0; i < filas.length; i++) {
    if (filas[i].ID_UNIDAD === idUnidad) {
      return filas[i];
    }
  }
  return null;
}

function buscarUnidadPorApto(apto) {
  var filas = obtenerFilasComoObjetos(CONFIG.HOJAS.UNIDADES);
  for (var i = 0; i < filas.length; i++) {
    if (String(filas[i].APARTAMENTO) === String(apto)) {
      return filas[i];
    }
  }
  return null;
}

function listarUnidades() {
  return obtenerFilasComoObjetos(CONFIG.HOJAS.UNIDADES);
}

/**
 * Reparación única de la hoja UNIDADES. Ejecutar una sola vez desde el editor de Apps Script,
 * después de hacer una copia de la hoja.
 *
 * Caso que corrige: BLOQUE, TORRE y PISO se quitaron de la hoja (el formulario ya no los
 * pide) pero el código siguió escribiendo 16 columnas, dejando filas desalineadas.
 * Deja todas las filas en el formato vigente de 13 columnas (CONFIG.ENCABEZADOS.UNIDADES):
 *  - filas correctas (ESTADO_REGISTRO en el índice 7): no se tocan.
 *  - filas desalineadas (ESTADO_REGISTRO en el índice 10, formato de 16 columnas): se
 *    eliminan las 3 columnas BLOQUE/TORRE/PISO, que estaban vacías.
 */
function repararHojaUnidades() {
  var hoja = obtenerHoja(CONFIG.HOJAS.UNIDADES);
  var encabezados = CONFIG.ENCABEZADOS.UNIDADES;
  var idxRegistro = encabezados.indexOf('ESTADO_REGISTRO');
  var idxRegistro16 = idxRegistro + 3;
  var ultimaFila = hoja.getLastRow();
  var ultimaColumna = Math.max(hoja.getLastColumn(), encabezados.length + 3);
  var filas = ultimaFila > 1 ? hoja.getRange(2, 1, ultimaFila - 1, ultimaColumna).getValues() : [];
  var sinClasificar = [];
  var corregidas = 0;

  var normalizadas = filas.map(function (fila, i) {
    var nueva;
    if (fila[idxRegistro] === 'CENSADO' || fila[idxRegistro] === 'PENDIENTE') {
      nueva = fila.slice(0, encabezados.length);
    } else if (fila[idxRegistro16] === 'CENSADO' || fila[idxRegistro16] === 'PENDIENTE') {
      nueva = fila.slice(0, 2).concat(fila.slice(5, 5 + encabezados.length - 2));
      corregidas++;
    } else {
      sinClasificar.push(i + 2);
      nueva = fila.slice(0, encabezados.length);
    }
    while (nueva.length < encabezados.length) nueva.push('');
    return nueva;
  });

  hoja.getRange(1, 1, Math.max(ultimaFila, 1), ultimaColumna).clearContent();
  hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados]);
  if (normalizadas.length > 0) {
    hoja.getRange(2, 1, normalizadas.length, encabezados.length).setValues(normalizadas);
  }
  var resumen = 'Hoja UNIDADES reparada. Filas: ' + normalizadas.length + ', corregidas: ' + corregidas +
    (sinClasificar.length ? '. Revisar manualmente las filas: ' + sinClasificar.join(', ') : '.');
  Logger.log(resumen);
  return resumen;
}
