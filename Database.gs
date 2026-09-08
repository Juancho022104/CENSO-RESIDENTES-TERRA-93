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
  var encabezados = CONFIG.ENCABEZADOS[nombreHoja];
  var fila = encabezados.map(function (encabezado) {
    var valor = objetoFila[encabezado];
    return valor === undefined || valor === null ? '' : sanitizarValor(valor);
  });
  hoja.appendRow(fila);
  return fila;
}

/**
 * Actualiza una fila existente localizada por el valor de su columna ID (primera columna).
 */
function actualizarFilaPorId(nombreHoja, idValor, cambios) {
  var hoja = obtenerHoja(nombreHoja);
  var ultimaFila = hoja.getLastRow();
  if (ultimaFila < 2) return false;
  var encabezados = CONFIG.ENCABEZADOS[nombreHoja];
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
    USA_BICICLETERO: datos.usaBiciletero || '',
    ESPACIO_ASIGNADO: datos.espacioAsignado || '',
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
    DOCUMENTACION: datos.documentacion || '',
    URL_DOCUMENTO: datos.urlDocumento || '',
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
    FECHA_INICIO: datos.fechaInicio || '',
    FECHA_FIN: datos.fechaFin || '',
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
    BLOQUE: datos.bloque || '',
    TORRE: datos.torre || '',
    PISO: datos.piso || '',
    APARTAMENTO: datos.apartamento || '',
    TIPO_UNIDAD: datos.tipoUnidad || '',
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
  registrarIndiceDuplicado('APTO_TORRE', (datos.torre || '') + '-' + (datos.apartamento || ''));
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

function buscarUnidadPorTorreApto(torre, apto) {
  var filas = obtenerFilasComoObjetos(CONFIG.HOJAS.UNIDADES);
  for (var i = 0; i < filas.length; i++) {
    if (String(filas[i].TORRE) === String(torre) && String(filas[i].APARTAMENTO) === String(apto)) {
      return filas[i];
    }
  }
  return null;
}

function listarUnidades() {
  return obtenerFilasComoObjetos(CONFIG.HOJAS.UNIDADES);
}
