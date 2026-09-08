/**
 * DashboardService.gs
 * Cálculo de indicadores agregados del censo para el panel administrativo.
 */

/**
 * Arma el objeto de dashboard recorriendo todas las hojas relevantes.
 */
function obtenerDashboard() {
  var unidades = obtenerFilasComoObjetos(CONFIG.HOJAS.UNIDADES);
  var personas = obtenerFilasComoObjetos(CONFIG.HOJAS.PERSONAS);
  var residentes = obtenerFilasComoObjetos(CONFIG.HOJAS.RESIDENTES);
  var vehiculos = obtenerFilasComoObjetos(CONFIG.HOJAS.VEHICULOS);
  var bicicletas = obtenerFilasComoObjetos(CONFIG.HOJAS.BICICLETAS);
  var mascotas = obtenerFilasComoObjetos(CONFIG.HOJAS.MASCOTAS);
  var autorizados = obtenerFilasComoObjetos(CONFIG.HOJAS.PERSONAS_AUTORIZADAS);
  var emergencias = obtenerFilasComoObjetos(CONFIG.HOJAS.EMERGENCIAS);

  var totalUnidades = unidades.length;
  var censadas = unidades.filter(function (u) { return u.ESTADO_REGISTRO === 'CENSADO'; }).length;
  var pendientes = totalUnidades - censadas;
  var ocupadas = unidades.filter(function (u) { return u.ESTADO_OCUPACION === 'OCUPADO'; }).length;
  var desocupadas = totalUnidades - ocupadas;

  var propietariosResidentes = personas.filter(function (p) {
    return p.TIPO_PERSONA === 'PROPIETARIO' && p.RELACION_INMUEBLE === 'RESIDE';
  }).length;
  var propietariosNoResidentes = personas.filter(function (p) {
    return p.TIPO_PERSONA === 'PROPIETARIO' && p.RELACION_INMUEBLE !== 'RESIDE';
  }).length;
  var arrendatarios = personas.filter(function (p) {
    return p.TIPO_PERSONA === 'ARRENDATARIO';
  }).length;

  var conteoVehiculosPorTipo = {};
  vehiculos.forEach(function (v) {
    var tipo = v.TIPO_VEHICULO || 'SIN_ESPECIFICAR';
    conteoVehiculosPorTipo[tipo] = (conteoVehiculosPorTipo[tipo] || 0) + 1;
  });

  var totalBicicletas = bicicletas.reduce(function (acumulado, b) {
    return acumulado + (parseInt(b.CANTIDAD, 10) || 0);
  }, 0);

  var mascotasPorEspecie = {};
  mascotas.forEach(function (m) {
    var especie = m.ESPECIE || 'SIN_ESPECIFICAR';
    mascotasPorEspecie[especie] = (mascotasPorEspecie[especie] || 0) + 1;
  });

  // Calidad promedio de censo
  var sumaCalidad = 0;
  unidades.forEach(function (u) {
    sumaCalidad += parseFloat(u.CALIDAD_CENSO) || 0;
  });
  var calidadPromedio = totalUnidades > 0 ? Math.round(sumaCalidad / totalUnidades) : 0;

  // Alertas: unidades sin propietario, sin residente, sin teléfono, sin correo
  var alertas = [];
  unidades.forEach(function (u) {
    if (u.ESTADO_REGISTRO !== 'CENSADO') return;
    var personasUnidad = personas.filter(function (p) { return p.ID_UNIDAD === u.ID_UNIDAD; });
    var tienePropietario = personasUnidad.some(function (p) { return p.TIPO_PERSONA === 'PROPIETARIO'; });
    var residentesUnidad = residentes.filter(function (r) { return r.ID_UNIDAD === u.ID_UNIDAD; });
    var tieneTelefono = personasUnidad.some(function (p) { return !!p.TELEFONO; });
    var tieneCorreo = personasUnidad.some(function (p) { return !!p.CORREO; });

    if (!tienePropietario) {
      alertas.push({ idUnidad: u.ID_UNIDAD, torre: u.TORRE, apartamento: u.APARTAMENTO, tipo: 'SIN_PROPIETARIO' });
    }
    if (residentesUnidad.length === 0) {
      alertas.push({ idUnidad: u.ID_UNIDAD, torre: u.TORRE, apartamento: u.APARTAMENTO, tipo: 'SIN_RESIDENTE' });
    }
    if (!tieneTelefono) {
      alertas.push({ idUnidad: u.ID_UNIDAD, torre: u.TORRE, apartamento: u.APARTAMENTO, tipo: 'SIN_TELEFONO' });
    }
    if (!tieneCorreo) {
      alertas.push({ idUnidad: u.ID_UNIDAD, torre: u.TORRE, apartamento: u.APARTAMENTO, tipo: 'SIN_CORREO' });
    }
  });

  vehiculos.forEach(function (v) {
    if (!v.PARQUEADERO) {
      var unidadV = unidades.filter(function (u) { return u.ID_UNIDAD === v.ID_UNIDAD; })[0];
      alertas.push({
        idUnidad: v.ID_UNIDAD,
        torre: unidadV ? unidadV.TORRE : '',
        apartamento: unidadV ? unidadV.APARTAMENTO : '',
        tipo: 'VEHICULO_SIN_PARQUEADERO'
      });
    }
  });

  return {
    totalUnidades: totalUnidades,
    censadas: censadas,
    pendientes: pendientes,
    ocupadas: ocupadas,
    desocupadas: desocupadas,
    propietariosResidentes: propietariosResidentes,
    propietariosNoResidentes: propietariosNoResidentes,
    arrendatarios: arrendatarios,
    totalResidentes: residentes.length,
    conteoVehiculosPorTipo: conteoVehiculosPorTipo,
    totalBicicletas: totalBicicletas,
    mascotasPorEspecie: mascotasPorEspecie,
    totalPersonasAutorizadas: autorizados.length,
    totalContactosEmergencia: emergencias.length,
    calidadPromedioCenso: calidadPromedio,
    alertas: alertas
  };
}

/**
 * Calcula el % de calidad del censo de una unidad específica (0-100).
 * Criterios: propietario, residente, teléfono, correo, vehículo bien registrado
 * (si declaró tener), contacto de emergencia.
 */
function calcularCalidadCenso(idUnidad) {
  var personas = obtenerFilasComoObjetos(CONFIG.HOJAS.PERSONAS).filter(function (p) {
    return p.ID_UNIDAD === idUnidad;
  });
  var residentes = obtenerFilasComoObjetos(CONFIG.HOJAS.RESIDENTES).filter(function (r) {
    return r.ID_UNIDAD === idUnidad;
  });
  var vehiculos = obtenerFilasComoObjetos(CONFIG.HOJAS.VEHICULOS).filter(function (v) {
    return v.ID_UNIDAD === idUnidad;
  });
  var emergencias = obtenerFilasComoObjetos(CONFIG.HOJAS.EMERGENCIAS).filter(function (e) {
    return e.ID_UNIDAD === idUnidad;
  });

  var criterios = [];
  criterios.push(personas.some(function (p) { return p.TIPO_PERSONA === 'PROPIETARIO'; }));
  criterios.push(residentes.length > 0);
  criterios.push(personas.some(function (p) { return !!p.TELEFONO; }));
  criterios.push(personas.some(function (p) { return !!p.CORREO; }));

  // Si hay vehículos, al menos uno debe tener placa, marca y parqueadero para contar como "bien registrado".
  if (vehiculos.length > 0) {
    criterios.push(vehiculos.some(function (v) {
      return !!v.PLACA && !!v.MARCA && !!v.PARQUEADERO;
    }));
  } else {
    criterios.push(true); // no aplica, no penaliza
  }

  criterios.push(emergencias.length > 0);

  var cumplidos = criterios.filter(function (c) { return c === true; }).length;
  return Math.round((cumplidos / criterios.length) * 100);
}
