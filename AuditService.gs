/**
 * AuditService.gs
 * Registro de auditoría de acciones sobre el sistema.
 */

var ACCIONES_VALIDAS = ['CREAR', 'ACTUALIZAR', 'ELIMINAR', 'CONSULTAR', 'CARGAR_DOCUMENTO'];

/**
 * Registra una acción de auditoría en la hoja AUDITORIA.
 * @param {string} accion - CREAR | ACTUALIZAR | ELIMINAR | CONSULTAR | CARGAR_DOCUMENTO
 * @param {string} modulo
 * @param {string} idRegistro
 * @param {string} descripcion
 */
function registrarAuditoria(accion, modulo, idRegistro, descripcion) {
  var accionValida = ACCIONES_VALIDAS.indexOf(accion) !== -1 ? accion : 'CONSULTAR';
  var usuario = '';
  try {
    usuario = Session.getActiveUser().getEmail() || 'anónimo';
  } catch (e) {
    usuario = 'anónimo';
  }
  if (!usuario) usuario = 'anónimo';

  var id = generarId(CONFIG.PREFIJOS_ID.AUDITORIA);
  insertarFila(CONFIG.HOJAS.AUDITORIA, {
    ID_AUDITORIA: id,
    FECHA: new Date(),
    USUARIO: usuario,
    ACCION: accionValida,
    MODULO: modulo || '',
    ID_REGISTRO: idRegistro || '',
    DESCRIPCION: descripcion || ''
  });
  return id;
}

/**
 * Devuelve los últimos N registros de auditoría (más recientes primero).
 */
function obtenerAuditoria(limite) {
  var n = limite && limite > 0 ? limite : 100;
  var filas = obtenerFilasComoObjetos(CONFIG.HOJAS.AUDITORIA);
  return filas.slice(-n).reverse();
}
