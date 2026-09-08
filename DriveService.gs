/**
 * DriveService.gs
 * Manejo de documentos subidos (ej. carné/vacunas de mascotas) hacia Drive.
 */

var TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Guarda un documento codificado en base64 dentro de la carpeta correspondiente
 * en Drive. No hace público el archivo, solo queda accesible a quien tenga
 * permiso sobre el Drive del administrador.
 * @param {string} base64 - Contenido en base64 (sin el prefijo data:...;base64,)
 * @param {string} nombreArchivo
 * @param {string} tipoMime
 * @param {string} idUnidad
 * @param {string} subcarpeta - Ej: 'MASCOTAS'
 * @returns {string} URL del archivo guardado
 */
function guardarDocumentoDriveInterno(base64, nombreArchivo, tipoMime, idUnidad, subcarpeta) {
  if (!base64) {
    throw new Error('No se recibió contenido de archivo.');
  }

  // Tamaño aproximado en bytes a partir de la longitud del string base64.
  var tamanoAproximado = Math.floor((base64.length * 3) / 4);
  if (tamanoAproximado > TAMANO_MAXIMO_BYTES) {
    throw new Error('El archivo supera el tamaño máximo permitido de 5MB.');
  }

  var raiz = obtenerOCrearCarpeta(CONFIG.CARPETA_RAIZ_DRIVE, DriveApp.getRootFolder());
  var copropiedad = obtenerOCrearCarpeta(CONFIG.CARPETA_COPROPIEDAD_DRIVE, raiz);
  var censo = obtenerOCrearCarpeta(CONFIG.CARPETA_CENSO_DRIVE, copropiedad);
  var carpetaSub = obtenerOCrearCarpeta(subcarpeta || CONFIG.CARPETA_MASCOTAS_DRIVE, censo);
  var carpetaUnidad = obtenerOCrearCarpeta(idUnidad, carpetaSub);

  var bytes = Utilities.base64Decode(base64);
  var blob = Utilities.newBlob(bytes, tipoMime, nombreArchivo);
  var archivo = carpetaUnidad.createFile(blob);

  registrarAuditoria('CARGAR_DOCUMENTO', 'DRIVE', idUnidad, 'Documento cargado: ' + nombreArchivo);

  return archivo.getUrl();
}

/**
 * Obtiene una subcarpeta por nombre dentro de una carpeta padre, o la crea si no existe.
 */
function obtenerOCrearCarpeta(nombre, carpetaPadre) {
  var iterador = carpetaPadre.getFoldersByName(nombre);
  if (iterador.hasNext()) {
    return iterador.next();
  }
  return carpetaPadre.createFolder(nombre);
}
