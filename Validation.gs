/**
 * Validation.gs
 * Validación de datos de entrada, sanitización anti-inyección de fórmulas
 * y control de duplicados.
 */

var REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var REGEX_TELEFONO_CO = /^(\+?57)?[\s-]?(3\d{9}|[1-8]\d{6,7})$/;
var REGEX_PLACA_CO = /^[A-Za-z]{2,3}[\s-]?\d{2,3}[A-Za-z]?$/;

/**
 * Antepone un apóstrofe si el valor comienza con = + - @ para evitar
 * inyección de fórmulas al escribir en Sheets. Aplicar a TODO valor antes de guardar.
 */
function sanitizarValor(valor) {
  if (valor === null || valor === undefined) return valor;
  if (typeof valor === 'string') {
    var primerCaracter = valor.charAt(0);
    if (['=', '+', '-', '@'].indexOf(primerCaracter) !== -1) {
      return "'" + valor;
    }
    return valor;
  }
  return valor;
}

/**
 * Sanitiza recursivamente todos los valores string de un objeto/array (payload completo).
 */
function sanitizarPayload(payload) {
  if (payload === null || payload === undefined) return payload;
  if (Array.isArray(payload)) {
    return payload.map(sanitizarPayload);
  }
  if (typeof payload === 'object') {
    var resultado = {};
    Object.keys(payload).forEach(function (clave) {
      resultado[clave] = sanitizarPayload(payload[clave]);
    });
    return resultado;
  }
  if (typeof payload === 'string') {
    return sanitizarValor(payload);
  }
  return payload;
}

/**
 * Valida el payload completo del censo. Devuelve {valido:boolean, errores:[...]}
 */
function validarDatos(payload) {
  var errores = [];

  if (!payload || typeof payload !== 'object') {
    return { valido: false, errores: ['El formulario está vacío o corrupto.'] };
  }

  // Sección 0: autorización
  if (!payload.autorizacion || payload.autorizacion.autoriza !== true) {
    errores.push('Debe autorizar el tratamiento de datos personales para continuar.');
  }

  // Sección 1: identificación del inmueble
  var inmueble = payload.inmueble || {};
  if (!inmueble.torre) errores.push('La torre/bloque del inmueble es obligatoria.');
  if (!inmueble.apartamento) errores.push('El número de apartamento es obligatorio.');
  if (!inmueble.tipoUnidad) errores.push('El tipo de unidad es obligatorio.');

  // Sección 2: propietario
  var propietario = payload.propietario || {};
  if (!propietario.nombreCompleto) errores.push('El nombre del propietario es obligatorio.');
  if (!propietario.documento) errores.push('El documento del propietario es obligatorio.');
  if (propietario.correo && !REGEX_EMAIL.test(propietario.correo)) {
    errores.push('El correo del propietario no tiene un formato válido.');
  }
  if (propietario.telefono && !REGEX_TELEFONO_CO.test(String(propietario.telefono).replace(/\s/g, ''))) {
    errores.push('El teléfono del propietario no tiene un formato válido.');
  }

  // Sección 3: residente principal (si reside una persona distinta o el propietario mismo)
  var residentePrincipal = payload.residentePrincipal || {};
  if (residentePrincipal.correo && !REGEX_EMAIL.test(residentePrincipal.correo)) {
    errores.push('El correo del residente principal no tiene un formato válido.');
  }
  if (residentePrincipal.telefono && !REGEX_TELEFONO_CO.test(String(residentePrincipal.telefono).replace(/\s/g, ''))) {
    errores.push('El teléfono del residente principal no tiene un formato válido.');
  }

  // Vehículos: placas con formato flexible (no bloquea, solo advierte via consistente)
  (payload.vehiculos || []).forEach(function (vehiculo, indice) {
    if (vehiculo.placa && vehiculo.tipoVehiculo !== 'bicicleta_electrica') {
      // Formato flexible: no bloquea el registro, solo se valida si aporta longitud mínima razonable
      if (String(vehiculo.placa).trim().length < 5) {
        errores.push('La placa del vehículo #' + (indice + 1) + ' parece incompleta.');
      }
    }
  });

  // Contacto de emergencia
  var emergencia = payload.emergencia || {};
  if (!emergencia.nombreContacto) errores.push('El nombre del contacto de emergencia es obligatorio.');
  if (!emergencia.telefonoPrincipal) errores.push('El teléfono principal de emergencia es obligatorio.');

  // Confirmación final
  var confirmacion = payload.confirmacion || {};
  if (!confirmacion.datosCorrectos) {
    errores.push('Debe confirmar que los datos registrados son correctos.');
  }

  return { valido: errores.length === 0, errores: errores };
}

/**
 * Valida formato de placa colombiana de forma flexible (no bloqueante para casos especiales:
 * motos, diplomáticos, oficiales, etc.) - se usa como advertencia informativa, no bloqueo duro.
 */
function formatoPlacaEsRazonable(placa) {
  if (!placa) return true;
  return REGEX_PLACA_CO.test(String(placa).trim()) || String(placa).trim().length >= 5;
}

/**
 * Verifica si un valor ya existe en el índice liviano de duplicados guardado en
 * PropertiesService. tipo: 'PLACA' | 'DOCUMENTO' | 'APTO_TORRE'
 */
function existeDuplicado(tipo, valor, idExcluir) {
  if (!valor) return false;
  var propiedades = PropertiesService.getScriptProperties();
  var clave = 'indice_' + tipo;
  var indiceRaw = propiedades.getProperty(clave);
  if (!indiceRaw) return false;
  var indice = JSON.parse(indiceRaw);
  var valorNormalizado = String(valor).trim().toUpperCase();
  if (idExcluir) {
    return indice.some(function (item) {
      return item.valor === valorNormalizado && item.id !== idExcluir;
    });
  }
  return indice.indexOf(valorNormalizado) !== -1 || indice.some(function (item) {
    return item.valor === valorNormalizado;
  });
}

/**
 * Agrega un valor al índice liviano de duplicados (llamar tras cada creación exitosa).
 */
function registrarIndiceDuplicado(tipo, valor) {
  if (!valor) return;
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var propiedades = PropertiesService.getScriptProperties();
    var clave = 'indice_' + tipo;
    var indiceRaw = propiedades.getProperty(clave);
    var indice = indiceRaw ? JSON.parse(indiceRaw) : [];
    var valorNormalizado = String(valor).trim().toUpperCase();
    if (indice.indexOf(valorNormalizado) === -1) {
      indice.push(valorNormalizado);
      // Límite de seguridad: si el índice crece demasiado, se recorta el más antiguo.
      if (indice.length > 5000) {
        indice.shift();
      }
      propiedades.setProperty(clave, JSON.stringify(indice));
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Compara el número de habitantes declarados contra los residentes efectivamente
 * registrados. No bloquea, solo retorna advertencia para el resumen.
 */
function validarConsistenciaHogar(numHabitantesDeclarados, numResidentesRegistrados) {
  var declarados = parseInt(numHabitantesDeclarados, 10) || 0;
  var registrados = parseInt(numResidentesRegistrados, 10) || 0;
  if (declarados !== registrados) {
    return {
      consistente: false,
      advertencia: 'Declaró ' + declarados + ' habitante(s) pero registró ' + registrados +
        ' residente(s). Por favor verifique la información antes de finalizar.'
    };
  }
  return { consistente: true, advertencia: '' };
}
