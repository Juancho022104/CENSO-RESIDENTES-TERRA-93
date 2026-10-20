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

/**
 * Menú en la hoja de cálculo para ejecutar tareas de mantenimiento sin abrir el editor.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Censo Terra 93')
    .addItem('Generar / actualizar dashboard', 'generarDashboardEnHoja')
    .addSeparator()
    .addItem('Reparar hoja UNIDADES (una sola vez)', 'repararHojaUnidadesDesdeMenu')
    .addToUi();
}

function repararHojaUnidadesDesdeMenu() {
  var ui = SpreadsheetApp.getUi();
  var respuesta = ui.alert('Reparar UNIDADES',
    'Se reescribirá la hoja UNIDADES con los 16 encabezados originales. Haga primero una copia de la hoja. ¿Continuar?',
    ui.ButtonSet.YES_NO);
  if (respuesta === ui.Button.YES) {
    ui.alert(repararHojaUnidades());
  }
}

/**
 * Genera (o regenera) la hoja DASHBOARD con los indicadores y gráficos calculados
 * a partir de los datos ya registrados. Se ejecuta desde el menú "Censo Terra 93"
 * o desde el editor de Apps Script; solo la ve quien tenga acceso a la hoja.
 */
function generarDashboardEnHoja() {
  var d = obtenerDashboard();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('DASHBOARD') || ss.insertSheet('DASHBOARD');
  hoja.clear();
  hoja.getCharts().forEach(function (g) { hoja.removeChart(g); });

  var filas = [
    ['Indicador', 'Valor'],
    ['Unidades censadas', d.censadas],
    ['Unidades ocupadas', d.ocupadas],
    ['Unidades desocupadas', d.desocupadas],
    ['Propietarios que residen', d.propietariosResidentes],
    ['Propietarios que no residen', d.propietariosNoResidentes],
    ['Arrendatarios', d.arrendatarios],
    ['Total residentes', d.totalResidentes],
    ['Bicicletas', d.totalBicicletas],
    ['Personas autorizadas', d.totalPersonasAutorizadas],
    ['Contactos de emergencia', d.totalContactosEmergencia],
    ['Calidad promedio del censo (%)', d.calidadPromedioCenso]
  ];
  hoja.getRange(1, 1, filas.length, 2).setValues(filas);

  var vehiculos = [['Tipo de vehículo', 'Cantidad']].concat(
    Object.keys(d.conteoVehiculosPorTipo).map(function (k) { return [k, d.conteoVehiculosPorTipo[k]]; }));
  var mascotas = [['Especie de mascota', 'Cantidad']].concat(
    Object.keys(d.mascotasPorEspecie).map(function (k) { return [k, d.mascotasPorEspecie[k]]; }));
  hoja.getRange(1, 4, vehiculos.length, 2).setValues(vehiculos);
  hoja.getRange(1, 7, mascotas.length, 2).setValues(mascotas);

  var filaAlertas = Math.max(filas.length, vehiculos.length, mascotas.length) + 3;
  var alertas = [['Unidad', 'Apartamento', 'Alerta']].concat(
    d.alertas.map(function (a) { return [a.idUnidad, a.apartamento, a.tipo]; }));
  hoja.getRange(filaAlertas - 1, 1).setValue('Alertas de calidad de datos (' + d.alertas.length + ')').setFontWeight('bold');
  hoja.getRange(filaAlertas, 1, alertas.length, 3).setValues(alertas);

  [[1, 2, filas.length], [4, 2, vehiculos.length], [7, 2, mascotas.length]].forEach(function (t) {
    var enc = hoja.getRange(1, t[0], 1, t[1]);
    enc.setFontWeight('bold').setBackground('#0B3D2E').setFontColor('#FFFFFF');
  });
  hoja.getRange(filaAlertas, 1, 1, 3).setFontWeight('bold').setBackground('#0B3D2E').setFontColor('#FFFFFF');
  hoja.setColumnWidth(1, 240);
  hoja.autoResizeColumns(2, 8);

  hoja.insertChart(hoja.newChart().setChartType(Charts.ChartType.PIE)
    .addRange(hoja.getRange(3, 1, 2, 2)).setPosition(2, 10, 0, 0)
    .setOption('title', 'Ocupadas vs. desocupadas').build());
  if (vehiculos.length > 1) {
    hoja.insertChart(hoja.newChart().setChartType(Charts.ChartType.COLUMN)
      .addRange(hoja.getRange(1, 4, vehiculos.length, 2)).setPosition(18, 10, 0, 0)
      .setOption('title', 'Vehículos por tipo').build());
  }
  hoja.getRange(filaAlertas + alertas.length + 2, 1)
    .setValue('Actualizado: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'));
  return 'Dashboard generado.';
}
