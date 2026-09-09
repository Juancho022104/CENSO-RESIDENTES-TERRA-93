/**
 * Code.gs
 * Punto de entrada del Web App y funciones públicas expuestas al cliente
 * (google.script.run) para el Censo Integral de Residentes.
 */

function doGet(e) {
  var plantilla = HtmlService.createTemplateFromFile('Index');
  var salida = plantilla.evaluate();
  salida.setTitle('Censo Integral de Residentes - TERRA 93 PH');
  salida.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  salida.addMetaTag('viewport', 'width=device-width, initial-scale=1');
  return salida;
}

/**
 * Helper estándar de Apps Script para ensamblar archivos HTML/CSS/JS parciales
 * dentro de Index.html mediante scriptlets <?!= include('Nombre') ?>
 */
function include(nombre) {
  return HtmlService.createHtmlOutputFromFile(nombre).getContent();
}

// ---------------------------------------------------------------------------
// Funciones públicas para el formulario de censo (cliente)
// ---------------------------------------------------------------------------

/**
 * Wrapper de validación para uso desde el cliente, con manejo de errores amigable.
 */
function validarDatosCliente(payload) {
  try {
    return validarDatos(payload);
  } catch (error) {
    registrarErrorLog('validarDatosCliente', error, {});
    return { valido: false, errores: ['No fue posible validar el formulario. Intente nuevamente.'] };
  }
}

/**
 * Guarda un documento en Drive (wrapper público con manejo de errores amigable).
 * Nunca expone el stack técnico al cliente; el detalle queda en LOG_ERRORES.
 */
function guardarDocumentoDrive(base64, nombreArchivo, tipoMime, idUnidad, subcarpeta) {
  try {
    return { exito: true, url: guardarDocumentoDriveInterno(base64, nombreArchivo, tipoMime, idUnidad, subcarpeta) };
  } catch (error) {
    registrarErrorLog('guardarDocumentoDrive', error, { idUnidad: idUnidad });
    return { exito: false, mensaje: 'No fue posible cargar el documento. Verifique que pese menos de 5MB e intente de nuevo.' };
  }
}

/**
 * Guarda el censo completo de una unidad. Escribe en cascada todas las entidades
 * relacionadas dentro de un bloqueo (LockService) para evitar carreras.
 * @param {Object} payload
 * @returns {Object} {exito:true, codigoCenso, tokenActualizacion} | {exito:false, mensaje}
 */
function guardarCenso(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (error) {
    return { exito: false, mensaje: 'El sistema está ocupado procesando otra solicitud. Intente nuevamente en unos segundos.' };
  }

  try {
    var datos = sanitizarPayload(payload);

    var validacion = validarDatos(datos);
    if (!validacion.valido) {
      return { exito: false, mensaje: validacion.errores.join(' ') };
    }

    // Duplicado de unidad (apto) ya censada
    var unidadExistente = buscarUnidadPorApto(datos.inmueble.apartamento);
    if (unidadExistente && unidadExistente.ESTADO_REGISTRO === 'CENSADO') {
      return {
        exito: false,
        mensaje: 'Esta unidad ya cuenta con un censo registrado. Si necesita actualizar la información, use el enlace de actualización enviado a su correo.'
      };
    }

    // 1) Unidad
    var config = obtenerConfiguracion();
    var resultadoUnidad = crearUnidad({
      idCopropiedad: config.ID_COPROPIEDAD || CONFIG.ID_COPROPIEDAD_DEFAULT,
      apartamento: datos.inmueble.apartamento,
      area: datos.inmueble.area,
      coeficiente: datos.inmueble.coeficiente,
      estadoOcupacion: datos.inmueble.ocupado === true ? 'OCUPADO' : 'DESOCUPADO'
    });
    var idUnidad = resultadoUnidad.idUnidad;

    // 2) Propietario
    var idPersonaPropietario = null;
    if (datos.propietario && datos.propietario.nombreCompleto) {
      idPersonaPropietario = crearPersona({
        idUnidad: idUnidad,
        tipoPersona: 'PROPIETARIO',
        nombreCompleto: datos.propietario.nombreCompleto,
        tipoDocumento: datos.propietario.tipoDocumento,
        documento: datos.propietario.documento,
        telefono: datos.propietario.telefono,
        whatsapp: datos.propietario.whatsapp,
        correo: datos.propietario.correo,
        relacionInmueble: datos.propietario.reside === true ? 'RESIDE' : 'NO_RESIDE',
        autorizaComunicaciones: datos.propietario.recibeComunicaciones === true ? 'SI' : 'NO'
      });
      if (datos.propietario.reside === true) {
        crearResidente({
          idUnidad: idUnidad,
          idPersona: idPersonaPropietario,
          tipoResidente: 'PROPIETARIO_RESIDENTE',
          esMenor: 'NO'
        });
      }
    }

    // 3) Residente principal (si es distinto al propietario)
    if (datos.residentePrincipal && datos.residentePrincipal.nombreCompleto &&
        datos.residentePrincipal.esPropietario !== true) {
      var idPersonaResidente = crearPersona({
        idUnidad: idUnidad,
        tipoPersona: datos.inmueble.arrendado === true ? 'ARRENDATARIO' : 'RESIDENTE',
        nombreCompleto: datos.residentePrincipal.nombreCompleto,
        tipoDocumento: datos.residentePrincipal.tipoDocumento,
        documento: datos.residentePrincipal.documento,
        telefono: datos.residentePrincipal.telefono,
        whatsapp: datos.residentePrincipal.whatsapp,
        correo: datos.residentePrincipal.correo,
        relacionInmueble: datos.residentePrincipal.relacionInmueble,
        fechaIngreso: datos.residentePrincipal.fechaIngreso
      });
      crearResidente({
        idUnidad: idUnidad,
        idPersona: idPersonaResidente,
        tipoResidente: 'PRINCIPAL',
        esMenor: 'NO'
      });
    }

    // 4) Residentes adicionales
    (datos.otrosResidentes || []).forEach(function (residente) {
      if (!residente.nombreCompleto) return;
      var idPersonaAdicional = crearPersona({
        idUnidad: idUnidad,
        tipoPersona: 'RESIDENTE_ADICIONAL',
        nombreCompleto: residente.nombreCompleto,
        telefono: residente.telefono,
        correo: residente.correo,
        parentesco: residente.relacion
      });
      crearResidente({
        idUnidad: idUnidad,
        idPersona: idPersonaAdicional,
        tipoResidente: 'ADICIONAL',
        parentesco: residente.relacion,
        esMenor: residente.esMenor === true ? 'SI' : 'NO'
      });
    });

    // 5) Vehículos
    (datos.vehiculos || []).forEach(function (vehiculo) {
      if (!vehiculo.tipoVehiculo) return;
      crearVehiculo({
        idUnidad: idUnidad,
        tipoVehiculo: vehiculo.tipoVehiculo,
        placa: vehiculo.placa,
        marca: vehiculo.marca,
        linea: vehiculo.linea,
        color: vehiculo.color,
        modelo: vehiculo.modelo,
        parqueadero: vehiculo.parqueadero,
        esElectrico: vehiculo.esElectrico === true ? 'SI' : 'NO'
      });
    });

    // 6) Bicicletas (no eléctricas)
    if (datos.bicicletas && datos.bicicletas.tiene === true) {
      crearBicicleta({
        idUnidad: idUnidad,
        cantidad: datos.bicicletas.cantidad,
        usaBiciletero: datos.bicicletas.usaBiciletero === true ? 'SI' : 'NO',
        espacioAsignado: datos.bicicletas.espacioAsignado,
        observaciones: datos.bicicletas.observaciones
      });
    }

    // 7) Mascotas. Decisión de diseño: el documento (carné/vacunas) viaja en base64
    // dentro del mismo payload de guardarCenso y se sube a Drive aquí, ya con idUnidad
    // disponible, en vez de hacer una llamada google.script.run separada desde el
    // cliente antes de que exista la unidad. Mantiene el guardado en una sola operación.
    (datos.mascotas || []).forEach(function (mascota) {
      if (!mascota.nombre) return;
      var urlDocumento = '';
      if (mascota.documentoBase64) {
        try {
          urlDocumento = guardarDocumentoDriveInterno(
            mascota.documentoBase64,
            mascota.documentoNombre || 'documento_mascota',
            mascota.documentoMime || 'application/octet-stream',
            idUnidad,
            CONFIG.CARPETA_MASCOTAS_DRIVE
          );
        } catch (errorDocumento) {
          registrarErrorLog('guardarCenso_documentoMascota', errorDocumento, { idUnidad: idUnidad });
          // No se bloquea el registro del censo por un documento fallido.
        }
      }
      crearMascota({
        idUnidad: idUnidad,
        nombre: mascota.nombre,
        especie: mascota.especie,
        raza: mascota.raza,
        sexo: mascota.sexo,
        edadAproximada: mascota.edadAproximada,
        documentacion: mascota.documentoNombre || '',
        urlDocumento: urlDocumento
      });
    });

    // 8) Personas autorizadas
    (datos.autorizados || []).forEach(function (autorizado) {
      if (!autorizado.nombreCompleto) return;
      crearPersonaAutorizada({
        idUnidad: idUnidad,
        nombreCompleto: autorizado.nombreCompleto,
        tipoPersona: autorizado.tipoPersona,
        telefono: autorizado.telefono,
        diasIngreso: autorizado.diasIngreso,
        horarioReferencia: autorizado.horarioReferencia
      });
    });

    // 9) Contratistas
    (datos.contratistas || []).forEach(function (contratista) {
      if (!contratista.nombrePersonaEmpresa) return;
      crearContratista({
        idUnidad: idUnidad,
        nombrePersonaEmpresa: contratista.nombrePersonaEmpresa,
        tipoServicio: contratista.tipoServicio,
        frecuencia: contratista.frecuencia,
        telefono: contratista.telefono
      });
    });

    // 10) Contacto de emergencia
    if (datos.emergencia && datos.emergencia.nombreContacto) {
      crearContactoEmergencia({
        idUnidad: idUnidad,
        nombreContacto: datos.emergencia.nombreContacto,
        parentesco: datos.emergencia.parentesco,
        telefonoPrincipal: datos.emergencia.telefonoPrincipal,
        telefonoAlternativo: datos.emergencia.telefonoAlternativo,
        ciudad: datos.emergencia.ciudad
      });
    }

    // 11) Arrendamiento (si aplica)
    if (datos.inmueble.arrendado === true && datos.arrendamiento) {
      crearArrendamiento({
        idUnidad: idUnidad,
        nombreArrendatario: datos.arrendamiento.nombreArrendatario,
        telefono: datos.arrendamiento.telefono,
        correo: datos.arrendamiento.correo,
        fechaInicio: datos.arrendamiento.fechaInicio,
        fechaFin: datos.arrendamiento.fechaFin,
        inmobiliaria: datos.arrendamiento.tieneInmobiliaria === true ? datos.arrendamiento.nombreInmobiliaria : 'NO'
      });
    }

    // 12) Depósito (si aplica)
    if (datos.deposito && datos.deposito.tiene === true) {
      crearDeposito({
        idUnidad: idUnidad,
        idCopropiedad: config.ID_COPROPIEDAD || CONFIG.ID_COPROPIEDAD_DEFAULT,
        numero: datos.deposito.numero,
        ubicacion: datos.deposito.ubicacion,
        observaciones: datos.deposito.observaciones
      });
    }

    // 13) Comunicaciones
    if (datos.comunicaciones) {
      crearRegistroComunicacion({
        idUnidad: idUnidad,
        whatsapp: datos.comunicaciones.whatsapp === true ? 'SI' : 'NO',
        correo: datos.comunicaciones.correo === true ? 'SI' : 'NO',
        llamada: datos.comunicaciones.llamada === true ? 'SI' : 'NO',
        tipoComunicacionPreferida: (datos.comunicaciones.tiposInfo || []).join(', '),
        autorizacion: 'SI'
      });
    }

    // 14) Encuesta de percepción (si habilitada y respondida)
    if (config.HABILITAR_ENCUESTA === 'true' && datos.encuesta) {
      crearEncuesta({
        idUnidad: idUnidad,
        administracion: datos.encuesta.administracion,
        seguridad: datos.encuesta.seguridad,
        aseo: datos.encuesta.aseo,
        mantenimiento: datos.encuesta.mantenimiento,
        comunicacion: datos.encuesta.comunicacion,
        problemaPrincipal: datos.encuesta.problemaPrincipal,
        propuesta: datos.encuesta.propuesta,
        servicioAdicional: datos.encuesta.servicioAdicional,
        observaciones: datos.encuesta.observaciones
      });
    }

    // Calidad del censo y cierre
    var calidad = calcularCalidadCenso(idUnidad);
    actualizarFilaPorId(CONFIG.HOJAS.UNIDADES, idUnidad, {
      CALIDAD_CENSO: calidad,
      FECHA_ACTUALIZACION: new Date()
    });

    registrarAuditoria('CREAR', 'CENSO', idUnidad, 'Censo registrado para apto ' + datos.inmueble.apartamento);

    return {
      exito: true,
      codigoCenso: resultadoUnidad.codigoCenso,
      tokenActualizacion: resultadoUnidad.tokenActualizacion
    };
  } catch (error) {
    registrarErrorLog('guardarCenso', error, { apartamento: payload && payload.inmueble ? payload.inmueble.apartamento : '' });
    return { exito: false, mensaje: 'Ocurrió un problema al guardar el censo. Por favor intente nuevamente. Si el problema persiste, contacte a la administración.' };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Actualiza un censo ya existente, validando el token de actualización.
 * NOTA: el token es un mecanismo de conveniencia, no reemplaza autenticación real
 * (ver README - Limitaciones conocidas).
 */
function actualizarCenso(idUnidad, token, payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (error) {
    return { exito: false, mensaje: 'El sistema está ocupado. Intente nuevamente en unos segundos.' };
  }

  try {
    var unidad = obtenerUnidad(idUnidad);
    if (!unidad || unidad.TOKEN_ACTUALIZACION !== token) {
      return { exito: false, mensaje: 'El enlace de actualización no es válido o ha expirado.' };
    }

    var datos = sanitizarPayload(payload);
    var validacion = validarDatos(datos);
    if (!validacion.valido) {
      return { exito: false, mensaje: validacion.errores.join(' ') };
    }

    actualizarFilaPorId(CONFIG.HOJAS.UNIDADES, idUnidad, {
      ESTADO_OCUPACION: datos.inmueble.ocupado === true ? 'OCUPADO' : 'DESOCUPADO',
      FECHA_ACTUALIZACION: new Date()
    });

    var calidad = calcularCalidadCenso(idUnidad);
    actualizarFilaPorId(CONFIG.HOJAS.UNIDADES, idUnidad, { CALIDAD_CENSO: calidad });

    registrarAuditoria('ACTUALIZAR', 'CENSO', idUnidad, 'Censo actualizado.');

    return { exito: true, codigoCenso: unidad.CODIGO_CENSO, tokenActualizacion: unidad.TOKEN_ACTUALIZACION };
  } catch (error) {
    registrarErrorLog('actualizarCenso', error, { idUnidad: idUnidad });
    return { exito: false, mensaje: 'No fue posible actualizar el censo. Intente nuevamente.' };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Devuelve los datos de una unidad para edición, validando el token.
 */
function obtenerUnidadParaEdicion(idUnidad, token) {
  try {
    var unidad = obtenerUnidad(idUnidad);
    if (!unidad || unidad.TOKEN_ACTUALIZACION !== token) {
      return { exito: false, mensaje: 'El enlace de actualización no es válido o ha expirado.' };
    }
    registrarAuditoria('CONSULTAR', 'CENSO', idUnidad, 'Consulta de unidad para edición.');
    return { exito: true, unidad: unidad };
  } catch (error) {
    registrarErrorLog('obtenerUnidadParaEdicion', error, { idUnidad: idUnidad });
    return { exito: false, mensaje: 'No fue posible cargar la información. Intente nuevamente.' };
  }
}

// ---------------------------------------------------------------------------
// Funciones administrativas (requieren correo autorizado en CORREOS_ADMIN)
// ---------------------------------------------------------------------------

/**
 * Verifica si el usuario actual está autorizado como administrador.
 */
function esUsuarioAdministrador_() {
  var config = obtenerConfiguracion();
  var listaAdmins = (config.CORREOS_ADMIN || '').split(',').map(function (correo) {
    return correo.trim().toLowerCase();
  }).filter(function (correo) { return !!correo; });

  var usuario = '';
  try {
    usuario = (Session.getActiveUser().getEmail() || '').toLowerCase();
  } catch (e) {
    usuario = '';
  }

  return usuario && listaAdmins.indexOf(usuario) !== -1;
}

function obtenerDashboardAdmin() {
  if (!esUsuarioAdministrador_()) {
    return { exito: false, mensaje: 'No tiene autorización para consultar esta información.' };
  }
  try {
    return { exito: true, dashboard: obtenerDashboard() };
  } catch (error) {
    registrarErrorLog('obtenerDashboardAdmin', error, {});
    return { exito: false, mensaje: 'No fue posible cargar el panel administrativo.' };
  }
}

function obtenerAuditoriaAdmin(limite) {
  if (!esUsuarioAdministrador_()) {
    return { exito: false, mensaje: 'No tiene autorización para consultar esta información.' };
  }
  try {
    return { exito: true, registros: obtenerAuditoria(limite) };
  } catch (error) {
    registrarErrorLog('obtenerAuditoriaAdmin', error, {});
    return { exito: false, mensaje: 'No fue posible cargar la auditoría.' };
  }
}

// ---------------------------------------------------------------------------
// Registro de errores técnicos (nunca expuestos al usuario final)
// ---------------------------------------------------------------------------

/**
 * Registra un error técnico en LOG_ERRORES. No debe incluir datos sensibles
 * (documentos, teléfonos, contenido de archivos) - solo identificadores como idUnidad.
 */
function registrarErrorLog(nombreFuncion, error, datosRelevantes) {
  try {
    var usuario = '';
    try {
      usuario = Session.getActiveUser().getEmail() || 'anónimo';
    } catch (e) {
      usuario = 'anónimo';
    }
    var hoja = obtenerHoja(CONFIG.HOJAS.LOG_ERRORES);
    hoja.appendRow([
      new Date(),
      nombreFuncion,
      String(error && error.message ? error.message : error),
      usuario,
      JSON.stringify(datosRelevantes || {})
    ]);
  } catch (errorInterno) {
    // Si ni siquiera se puede loguear, no propagar el fallo al usuario.
  }
}
