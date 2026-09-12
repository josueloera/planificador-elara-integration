// Utilidad de exportación a Excel nativo (.xls / XML Spreadsheet) y CSV UTF-8
// Diseñado para compatibilidad inmediata con Microsoft Excel (Windows/Mac) sin requerir dependencias binarias pesadas.

const escapeXml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Descarga un archivo en el navegador
 */
const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Calcula la semana escolar relativa al ciclo educativo oficial
 */
export const calcularSemanaEscolar = (fechaStr) => {
  if (!fechaStr) return 'Semana 1';
  try {
    const parts = String(fechaStr).split('-');
    if (parts.length !== 3) return 'Semana 1';
    const anio = parseInt(parts[0], 10);
    const mes = parseInt(parts[1], 10);
    const dia = parseInt(parts[2], 10);
    
    // Ciclo escolar: si es agosto-diciembre (mes >= 8), el ciclo inició ese año. Si es enero-julio, inició el año previo.
    const anioInicio = mes >= 8 ? anio : anio - 1;
    const fechaBase = new Date(anioInicio, 7, 25); // 25 de Agosto
    const fechaActual = new Date(anio, mes - 1, dia);
    
    const diffMs = fechaActual - fechaBase;
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDias < 0) return 'Semana Previa';
    const numSemana = Math.floor(diffDias / 7) + 1;
    return `Semana ${Math.min(numSemana, 42)}`;
  } catch (e) {
    return 'Semana 1';
  }
};

/**
 * Genera un archivo Excel XML (.xls) de Asistencia con estilos completos
 */
export const exportarAsistenciaExcel = ({ grupoNombre, fechaInicio, fechaFin, resumenAlumnos = [], matrizDias = {}, fechasUnicas = [] }) => {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Titulo">
   <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#1A365D"/>
  </Style>
  <Style ss:ID="Subtitulo">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#4A5568"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#2B6CB0" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
   </Borders>
  </Style>
  <Style ss:ID="HeaderVerde">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#276749" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellNormal">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="BadgePresente">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#22543D"/>
   <Interior ss:Color="#C6F6D5" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9AE6B4"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9AE6B4"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9AE6B4"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9AE6B4"/>
   </Borders>
  </Style>
  <Style ss:ID="BadgeRetardo">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#744210"/>
   <Interior ss:Color="#FEFCBF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FAF089"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FAF089"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FAF089"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FAF089"/>
   </Borders>
  </Style>
  <Style ss:ID="BadgeFalta">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#742A2A"/>
   <Interior ss:Color="#FED7D7" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FEB2B2"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FEB2B2"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FEB2B2"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FEB2B2"/>
   </Borders>
  </Style>
  <Style ss:ID="BadgeJustificado">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#2A4365"/>
   <Interior ss:Color="#BEE3F8" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#90CDF4"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#90CDF4"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#90CDF4"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#90CDF4"/>
   </Borders>
  </Style>
 </Styles>

 <!-- HOJA 1: RESUMEN Y ESTADÍSTICAS -->
 <Worksheet ss:Name="Resumen Asistencias">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="40"/>
   <Column ss:Width="250"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="110"/>

   <Row ss:Height="25">
    <Cell ss:MergeAcross="7" ss:StyleID="Titulo"><Data ss:Type="String">REPORTE DE ASISTENCIA Y CONTROL QR - NEM</Data></Cell>
   </Row>
   <Row>
    <Cell ss:MergeAcross="7" ss:StyleID="Subtitulo"><Data ss:Type="String">Grupo: ${escapeXml(grupoNombre)} | Periodo: ${escapeXml(fechaInicio)} al ${escapeXml(fechaFin)}</Data></Cell>
   </Row>
   <Row ss:Height="10"/>

   <Row ss:Height="24">
    <Cell ss:StyleID="Header"><Data ss:Type="String">#</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Nombre del Alumno</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Días Reg.</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Asistencias</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Retardos</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Faltas</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Justificados</Data></Cell>
    <Cell ss:StyleID="HeaderVerde"><Data ss:Type="String">% Asistencia</Data></Cell>
   </Row>
`;

  resumenAlumnos.forEach((alu, idx) => {
    xml += `   <Row>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${escapeXml(alu.alumno_nombre)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${alu.total_dias || 0}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${alu.presentes || 0}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${alu.retardos || 0}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${alu.faltas || 0}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${alu.justificados || 0}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${(alu.porcentaje || 0).toFixed(1)}%</Data></Cell>
   </Row>
`;
  });

  xml += `  </Table>
 </Worksheet>

 <!-- HOJA 2: MATRIZ DÍA A DÍA -->
 <Worksheet ss:Name="Matriz Diaria">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="35"/>
   <Column ss:Width="230"/>
`;

  fechasUnicas.forEach(() => {
    xml += `   <Column ss:Width="75"/>\n`;
  });

  xml += `   <Row ss:Height="25">
    <Cell ss:MergeAcross="${fechasUnicas.length + 1}" ss:StyleID="Titulo"><Data ss:Type="String">MATRIZ DETALLADA DE ASISTENCIAS POR FECHA</Data></Cell>
   </Row>
   <Row>
    <Cell ss:MergeAcross="${fechasUnicas.length + 1}" ss:StyleID="Subtitulo"><Data ss:Type="String">Grupo: ${escapeXml(grupoNombre)} | Rango: ${escapeXml(fechaInicio)} al ${escapeXml(fechaFin)}</Data></Cell>
   </Row>
   <Row ss:Height="10"/>

   <Row ss:Height="24">
    <Cell ss:StyleID="Header"><Data ss:Type="String">#</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Alumno</Data></Cell>
`;

  fechasUnicas.forEach(f => {
    xml += `    <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(f)}</Data></Cell>\n`;
  });

  xml += `   </Row>\n`;

  resumenAlumnos.forEach((alu, idx) => {
    xml += `   <Row>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${escapeXml(alu.alumno_nombre)}</Data></Cell>
`;
    fechasUnicas.forEach(f => {
      const estado = (matrizDias[alu.alumno_id] && matrizDias[alu.alumno_id][f]) || '-';
      let style = 'CellCenter';
      let text = '-';
      if (estado === 'PRESENTE') { style = 'BadgePresente'; text = 'P'; }
      else if (estado === 'RETARDO') { style = 'BadgeRetardo'; text = 'R'; }
      else if (estado === 'FALTA') { style = 'BadgeFalta'; text = 'F'; }
      else if (estado === 'JUSTIFICADO') { style = 'BadgeJustificado'; text = 'J'; }
      xml += `    <Cell ss:StyleID="${style}"><Data ss:Type="String">${text}</Data></Cell>\n`;
    });
    xml += `   </Row>\n`;
  });

  xml += `  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const safeNombre = `Asistencia_${(grupoNombre || 'Grupo').replace(/\s+/g, '_')}_${fechaInicio}_a_${fechaFin}.xls`;
  triggerDownload(blob, safeNombre);
};

/**
 * Genera un archivo Excel XML (.xls) de Trabajos QR con Sábana / Matriz Completa de Calificaciones
 */
export const exportarTrabajosExcel = ({ grupoNombre, fechaInicio, fechaFin, campo, trabajos = [], resumenAlumnos = [] }) => {
  // 1. Extraer y ordenar trabajos únicos (Columnas de la Sábana)
  const mapaTareas = new Map();
  const tareasUnicas = [];
  const matrizCalificaciones = {}; // [alumno_id][taskKey] = valor

  (trabajos || []).forEach(t => {
    const nombre = (t.nombre_trabajo || 'Actividad').trim();
    const f = t.fecha || '';
    const cpo = t.campo || 'GENERAL';
    const key = `${nombre}___${f}___${cpo}`;

    if (!mapaTareas.has(key)) {
      const sem = calcularSemanaEscolar(f);
      const info = { key, nombre, fecha: f, campo: cpo, semana: sem };
      mapaTareas.set(key, info);
      tareasUnicas.push(info);
    }

    if (!matrizCalificaciones[t.alumno_id]) {
      matrizCalificaciones[t.alumno_id] = {};
    }
    const valNum = Number(t.valor);
    matrizCalificaciones[t.alumno_id][key] = !isNaN(valNum) ? valNum : t.valor;
  });

  // Ordenar tareas cronológicamente
  tareasUnicas.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Titulo">
   <Font ss:FontName="Calibri" ss:Size="15" ss:Bold="1" ss:Color="#1A365D"/>
  </Style>
  <Style ss:ID="Subtitulo">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#4A5568"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#2B6CB0" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A0AEC0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A0AEC0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A0AEC0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A0AEC0"/>
   </Borders>
  </Style>
  <Style ss:ID="HeaderMeta">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#3182CE" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
   </Borders>
  </Style>
  <Style ss:ID="HeaderVerde">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#22543D" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A0AEC0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A0AEC0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A0AEC0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A0AEC0"/>
   </Borders>
  </Style>
  <Style ss:ID="FilaPromedio">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1A202C"/>
   <Interior ss:Color="#EDF2F7" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#4A5568"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#4A5568"/>
   </Borders>
  </Style>
  <Style ss:ID="CellNormal">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CalificacionAlta">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#22543D"/>
   <Interior ss:Color="#C6F6D5" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9AE6B4"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9AE6B4"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9AE6B4"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9AE6B4"/>
   </Borders>
  </Style>
  <Style ss:ID="CalificacionMedia">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#744210"/>
   <Interior ss:Color="#FEFCBF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FAF089"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FAF089"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FAF089"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FAF089"/>
   </Borders>
  </Style>
  <Style ss:ID="CalificacionBaja">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#742A2A"/>
   <Interior ss:Color="#FED7D7" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FEB2B2"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FEB2B2"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FEB2B2"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FEB2B2"/>
   </Borders>
  </Style>
 </Styles>

 <!-- ======================================================== -->
 <!-- HOJA 1: SÁBANA / MATRIZ DE CALIFICACIONES COMPLETA       -->
 <!-- ======================================================== -->
 <Worksheet ss:Name="Sábana de Calificaciones">
  <Table ss:DefaultRowHeight="22">
   <Column ss:Width="35"/>
   <Column ss:Width="240"/>
`;

  tareasUnicas.forEach(() => {
    xml += `   <Column ss:Width="110"/>\n`;
  });
  xml += `   <Column ss:Width="90"/>\n`;
  xml += `   <Column ss:Width="90"/>\n`;

  const totalCols = tareasUnicas.length + 3;

  xml += `   <Row ss:Height="26">
    <Cell ss:MergeAcross="${totalCols}" ss:StyleID="Titulo"><Data ss:Type="String">SÁBANA DE TRABAJOS Y EVALUACIÓN CONTINUA - NEM</Data></Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:MergeAcross="${totalCols}" ss:StyleID="Subtitulo"><Data ss:Type="String">Grupo: ${escapeXml(grupoNombre)} | Periodo: ${escapeXml(fechaInicio)} al ${escapeXml(fechaFin)} | Filtro: ${escapeXml(campo || 'TODOS')}</Data></Cell>
   </Row>
   <Row ss:Height="8"/>

   <!-- FILA 1 DE ENCABEZADO: METADATOS (SEMANA Y CAMPO) -->
   <Row ss:Height="20">
    <Cell ss:StyleID="HeaderMeta"><Data ss:Type="String">#</Data></Cell>
    <Cell ss:StyleID="HeaderMeta"><Data ss:Type="String">DATOS DE LA ACTIVIDAD ➔</Data></Cell>
`;

  tareasUnicas.forEach(t => {
    xml += `    <Cell ss:StyleID="HeaderMeta"><Data ss:Type="String">${escapeXml(t.semana)} | ${escapeXml(t.campo)}</Data></Cell>\n`;
  });
  xml += `    <Cell ss:StyleID="HeaderMeta"><Data ss:Type="String">ENTREGAS</Data></Cell>\n`;
  xml += `    <Cell ss:StyleID="HeaderMeta"><Data ss:Type="String">FINAL</Data></Cell>\n`;
  xml += `   </Row>\n`;

  // FILA 2 DE ENCABEZADO: FECHA Y NOMBRE DEL TRABAJO
  xml += `   <Row ss:Height="28">
    <Cell ss:StyleID="Header"><Data ss:Type="String">Nº</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">ALUMNO</Data></Cell>
`;

  tareasUnicas.forEach(t => {
    xml += `    <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(t.nombre)}\n(${escapeXml(t.fecha)})</Data></Cell>\n`;
  });

  xml += `    <Cell ss:StyleID="HeaderVerde"><Data ss:Type="String">Trabajos\nEntregados</Data></Cell>
    <Cell ss:StyleID="HeaderVerde"><Data ss:Type="String">Promedio\nTrabajos</Data></Cell>
   </Row>
`;

  // FILAS DE ALUMNOS
  const sumasPorTarea = {};
  const cuentasPorTarea = {};

  resumenAlumnos.forEach((alu, idx) => {
    const notasAlumno = matrizCalificaciones[alu.alumno_id] || {};
    let entregados = 0;
    let sumaNotas = 0;

    xml += `   <Row>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${escapeXml(alu.alumno_nombre)}</Data></Cell>
`;

    tareasUnicas.forEach(t => {
      const nota = notasAlumno[t.key];
      if (nota !== undefined && nota !== null && nota !== '') {
        const nVal = Number(nota);
        if (!isNaN(nVal)) {
          entregados++;
          sumaNotas += nVal;
          sumasPorTarea[t.key] = (sumasPorTarea[t.key] || 0) + nVal;
          cuentasPorTarea[t.key] = (cuentasPorTarea[t.key] || 0) + 1;

          let st = 'CellCenter';
          if (nVal >= 8.5) st = 'CalificacionAlta';
          else if (nVal >= 6.0) st = 'CalificacionMedia';
          else st = 'CalificacionBaja';

          xml += `    <Cell ss:StyleID="${st}"><Data ss:Type="Number">${nVal}</Data></Cell>\n`;
        } else {
          xml += `    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(nota)}</Data></Cell>\n`;
        }
      } else {
        xml += `    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">-</Data></Cell>\n`;
      }
    });

    const promFinal = entregados > 0 ? (sumaNotas / entregados).toFixed(1) : '-';
    let stFinal = 'CellCenter';
    if (promFinal !== '-') {
      const pNum = Number(promFinal);
      if (pNum >= 8.5) stFinal = 'CalificacionAlta';
      else if (pNum >= 6.0) stFinal = 'CalificacionMedia';
      else stFinal = 'CalificacionBaja';
    }

    xml += `    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${entregados}</Data></Cell>
    <Cell ss:StyleID="${stFinal}"><Data ss:Type="${promFinal !== '-' ? 'Number' : 'String'}">${promFinal}</Data></Cell>
   </Row>
`;
  });

  // FILA FINAL: PROMEDIO GRUPAL POR TRABAJO
  xml += `   <Row ss:Height="24">
    <Cell ss:StyleID="FilaPromedio"><Data ss:Type="String">Σ</Data></Cell>
    <Cell ss:StyleID="FilaPromedio"><Data ss:Type="String">PROMEDIO GRUPAL</Data></Cell>
`;

  let sumaPromediosGlobal = 0;
  let tareasConNotas = 0;

  tareasUnicas.forEach(t => {
    const sum = sumasPorTarea[t.key] || 0;
    const cnt = cuentasPorTarea[t.key] || 0;
    if (cnt > 0) {
      const promTarea = (sum / cnt).toFixed(1);
      sumaPromediosGlobal += Number(promTarea);
      tareasConNotas++;
      xml += `    <Cell ss:StyleID="FilaPromedio"><Data ss:Type="Number">${promTarea}</Data></Cell>\n`;
    } else {
      xml += `    <Cell ss:StyleID="FilaPromedio"><Data ss:Type="String">-</Data></Cell>\n`;
    }
  });

  const promTotalGrupo = tareasConNotas > 0 ? (sumaPromediosGlobal / tareasConNotas).toFixed(1) : '-';
  xml += `    <Cell ss:StyleID="FilaPromedio"><Data ss:Type="String">${tareasUnicas.length} Act.</Data></Cell>
    <Cell ss:StyleID="FilaPromedio"><Data ss:Type="${promTotalGrupo !== '-' ? 'Number' : 'String'}">${promTotalGrupo}</Data></Cell>
   </Row>
  </Table>
 </Worksheet>

 <!-- ======================================================== -->
 <!-- HOJA 2: RESUMEN DE PROMEDIOS                             -->
 <!-- ======================================================== -->
 <Worksheet ss:Name="Resumen Alumnos">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="40"/>
   <Column ss:Width="260"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>

   <Row ss:Height="25">
    <Cell ss:MergeAcross="3" ss:StyleID="Titulo"><Data ss:Type="String">PROMEDIO DE TRABAJOS Y ACTIVIDADES QR - NEM</Data></Cell>
   </Row>
   <Row>
    <Cell ss:MergeAcross="3" ss:StyleID="Subtitulo"><Data ss:Type="String">Grupo: ${escapeXml(grupoNombre)} | Periodo: ${escapeXml(fechaInicio)} al ${escapeXml(fechaFin)} | Campo: ${escapeXml(campo || 'TODOS')}</Data></Cell>
   </Row>
   <Row ss:Height="10"/>

   <Row ss:Height="24">
    <Cell ss:StyleID="Header"><Data ss:Type="String">#</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Nombre del Alumno</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Total Trabajos</Data></Cell>
    <Cell ss:StyleID="HeaderVerde"><Data ss:Type="String">Promedio</Data></Cell>
   </Row>
`;

  resumenAlumnos.forEach((alu, idx) => {
    const prom = alu.promedio !== null && alu.promedio !== undefined ? Number(alu.promedio) : null;
    let styleProm = 'CellCenter';
    if (prom !== null) {
      if (prom >= 8.5) styleProm = 'CalificacionAlta';
      else if (prom >= 6.0) styleProm = 'CalificacionMedia';
      else styleProm = 'CalificacionBaja';
    }

    xml += `   <Row>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${escapeXml(alu.alumno_nombre)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${alu.total_trabajos || 0}</Data></Cell>
    <Cell ss:StyleID="${styleProm}"><Data ss:Type="${prom !== null ? 'Number' : 'String'}">${prom !== null ? prom.toFixed(1) : '-'}</Data></Cell>
   </Row>
`;
  });

  xml += `  </Table>
 </Worksheet>

 <!-- ======================================================== -->
 <!-- HOJA 3: BITÁCORA DETALLADA DE TRABAJOS                  -->
 <!-- ======================================================== -->
 <Worksheet ss:Name="Bitácora Completa">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="40"/>
   <Column ss:Width="90"/>
   <Column ss:Width="100"/>
   <Column ss:Width="220"/>
   <Column ss:Width="200"/>
   <Column ss:Width="150"/>
   <Column ss:Width="90"/>

   <Row ss:Height="25">
    <Cell ss:MergeAcross="6" ss:StyleID="Titulo"><Data ss:Type="String">BITÁCORA DETALLADA DE TRABAJOS REGISTRADOS</Data></Cell>
   </Row>
   <Row>
    <Cell ss:MergeAcross="6" ss:StyleID="Subtitulo"><Data ss:Type="String">Grupo: ${escapeXml(grupoNombre)} | Periodo: ${escapeXml(fechaInicio)} al ${escapeXml(fechaFin)}</Data></Cell>
   </Row>
   <Row ss:Height="10"/>

   <Row ss:Height="24">
    <Cell ss:StyleID="Header"><Data ss:Type="String">#</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Fecha</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Semana</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Alumno</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Actividad / Trabajo</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Campo Formativo</Data></Cell>
    <Cell ss:StyleID="HeaderVerde"><Data ss:Type="String">Calificación</Data></Cell>
   </Row>
`;

  trabajos.forEach((t, idx) => {
    const val = Number(t.valor);
    let valStyle = 'CellCenter';
    if (!isNaN(val)) {
      if (val >= 8.5) valStyle = 'CalificacionAlta';
      else if (val >= 6.0) valStyle = 'CalificacionMedia';
      else valStyle = 'CalificacionBaja';
    }
    const sem = calcularSemanaEscolar(t.fecha);

    xml += `   <Row>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(t.fecha)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(sem)}</Data></Cell>
    <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${escapeXml(t.alumno_nombre || '')}</Data></Cell>
    <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${escapeXml(t.nombre_trabajo)}</Data></Cell>
    <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${escapeXml(t.campo || 'GENERAL')}</Data></Cell>
    <Cell ss:StyleID="${valStyle}"><Data ss:Type="Number">${val}</Data></Cell>
   </Row>
`;
  });

  xml += `  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const safeNombre = `Sabana_Trabajos_${(grupoNombre || 'Grupo').replace(/\s+/g, '_')}_${fechaInicio}_a_${fechaFin}.xls`;
  triggerDownload(blob, safeNombre);
};

/**
 * Genera un archivo Excel XML (.xls) para el Evaluador de Porcentajes y Criterios
 */
export const exportarEvaluadorPorcentajesExcel = ({
  grupoNombre = '',
  grado = '',
  campoActual = 'GENERAL',
  fechaEval = '',
  criterios = [],
  alumnos = [],
  notas = {},
  calcularPromedio = null
}) => {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Titulo">
   <Font ss:FontName="Calibri" ss:Size="15" ss:Bold="1" ss:Color="#1A365D"/>
  </Style>
  <Style ss:ID="Subtitulo">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#4A5568"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#2C5282" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
   </Borders>
  </Style>
  <Style ss:ID="HeaderPuntos">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#319795" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
   </Borders>
  </Style>
  <Style ss:ID="HeaderVerde">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#22543D" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellNormal">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CalificacionAlta">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#22543D"/>
   <Interior ss:Color="#C6F6D5" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9AE6B4"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9AE6B4"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9AE6B4"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#9AE6B4"/>
   </Borders>
  </Style>
  <Style ss:ID="CalificacionMedia">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#744210"/>
   <Interior ss:Color="#FEFCBF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FAF089"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FAF089"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FAF089"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FAF089"/>
   </Borders>
  </Style>
  <Style ss:ID="CalificacionBaja">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#742A2A"/>
   <Interior ss:Color="#FED7D7" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FEB2B2"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FEB2B2"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FEB2B2"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FEB2B2"/>
   </Borders>
  </Style>
  <Style ss:ID="FilaPromedio">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1A202C"/>
   <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#4A5568"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#4A5568"/>
   </Borders>
  </Style>
 </Styles>

 <Worksheet ss:Name="Evaluación Formativa">
  <Table ss:DefaultRowHeight="22">
   <Column ss:Width="35"/>
   <Column ss:Width="250"/>
`;

  // Cada criterio tendrá dos columnas: Nota Base y Puntos Ponderados
  criterios.forEach(() => {
    xml += `   <Column ss:Width="110"/>\n`;
    xml += `   <Column ss:Width="85"/>\n`;
  });
  xml += `   <Column ss:Width="110"/>\n`;

  const mergeCount = (criterios.length * 2) + 2;

  xml += `   <Row ss:Height="26">
    <Cell ss:MergeAcross="${mergeCount}" ss:StyleID="Titulo"><Data ss:Type="String">EVALUADOR DE PORCENTAJES Y CRITERIOS - NEM</Data></Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:MergeAcross="${mergeCount}" ss:StyleID="Subtitulo"><Data ss:Type="String">Grado: ${escapeXml(grado)}º | Grupo: ${escapeXml(grupoNombre)} | Campo Formativo: ${escapeXml(campoActual)} | Fecha de Evaluación: ${escapeXml(fechaEval)}</Data></Cell>
   </Row>
   <Row ss:Height="8"/>

   <!-- FILA DE ENCABEZADOS DE CRITERIOS -->
   <Row ss:Height="30">
    <Cell ss:StyleID="Header"><Data ss:Type="String">#</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">NOMBRE DEL ALUMNO</Data></Cell>
`;

  criterios.forEach(c => {
    xml += `    <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(c.nombre)}\n(${c.porcentaje}%)</Data></Cell>\n`;
    xml += `    <Cell ss:StyleID="HeaderPuntos"><Data ss:Type="String">Puntos\nPond.</Data></Cell>\n`;
  });

  xml += `    <Cell ss:StyleID="HeaderVerde"><Data ss:Type="String">PROMEDIO\nFINAL (0-10)</Data></Cell>
   </Row>
`;

  // FILAS DE ALUMNOS
  const sumasNotasCriterio = {};
  const sumasPuntosCriterio = {};
  const cuentasCriterio = {};
  let sumaPromediosGrupales = 0;
  let totalAlumnosConPromedio = 0;

  alumnos.forEach((al, idx) => {
    xml += `   <Row>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${escapeXml(al.nombre)}</Data></Cell>
`;

    let sumaWeighted = 0;
    let totalPorcentaje = 0;

    criterios.forEach(c => {
      const valRaw = notas[`${al.id}-${c.id}`];
      const valNum = parseFloat(valRaw);
      const peso = parseFloat(c.porcentaje) || 0;

      if (!isNaN(valNum) && peso > 0) {
        const puntosAportados = (valNum * (peso / 100)).toFixed(2);
        sumaWeighted += valNum * peso;
        totalPorcentaje += peso;

        sumasNotasCriterio[c.id] = (sumasNotasCriterio[c.id] || 0) + valNum;
        sumasPuntosCriterio[c.id] = (sumasPuntosCriterio[c.id] || 0) + parseFloat(puntosAportados);
        cuentasCriterio[c.id] = (cuentasCriterio[c.id] || 0) + 1;

        let st = 'CellCenter';
        if (valNum >= 8.5) st = 'CalificacionAlta';
        else if (valNum >= 6.0) st = 'CalificacionMedia';
        else st = 'CalificacionBaja';

        xml += `    <Cell ss:StyleID="${st}"><Data ss:Type="Number">${valNum}</Data></Cell>\n`;
        xml += `    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${puntosAportados}</Data></Cell>\n`;
      } else {
        xml += `    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">-</Data></Cell>\n`;
        xml += `    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">-</Data></Cell>\n`;
      }
    });

    let prom = null;
    if (typeof calcularPromedio === 'function') {
      prom = calcularPromedio(al.id);
    } else if (totalPorcentaje > 0) {
      prom = (sumaWeighted / totalPorcentaje).toFixed(1);
    }

    let stProm = 'CellCenter';
    if (prom !== null && prom !== '-') {
      const pNum = parseFloat(prom);
      if (pNum >= 8.5) stProm = 'CalificacionAlta';
      else if (pNum >= 6.0) stProm = 'CalificacionMedia';
      else stProm = 'CalificacionBaja';
      sumaPromediosGrupales += pNum;
      totalAlumnosConPromedio++;
    }

    xml += `    <Cell ss:StyleID="${stProm}"><Data ss:Type="${prom !== null && prom !== '-' ? 'Number' : 'String'}">${prom !== null ? prom : '-'}</Data></Cell>
   </Row>
`;
  });

  // FILA FINAL: PROMEDIOS GENERALES DEL GRUPO
  xml += `   <Row ss:Height="24">
    <Cell ss:StyleID="FilaPromedio"><Data ss:Type="String">Σ</Data></Cell>
    <Cell ss:StyleID="FilaPromedio"><Data ss:Type="String">PROMEDIO GRUPAL</Data></Cell>
`;

  criterios.forEach(c => {
    const cuenta = cuentasCriterio[c.id] || 0;
    const sumaN = sumasNotasCriterio[c.id] || 0;
    const sumaP = sumasPuntosCriterio[c.id] || 0;

    if (cuenta > 0) {
      const promNota = (sumaN / cuenta).toFixed(1);
      const promPuntos = (sumaP / cuenta).toFixed(2);
      xml += `    <Cell ss:StyleID="FilaPromedio"><Data ss:Type="Number">${promNota}</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="FilaPromedio"><Data ss:Type="Number">${promPuntos}</Data></Cell>\n`;
    } else {
      xml += `    <Cell ss:StyleID="FilaPromedio"><Data ss:Type="String">-</Data></Cell>\n`;
      xml += `    <Cell ss:StyleID="FilaPromedio"><Data ss:Type="String">-</Data></Cell>\n`;
    }
  });

  const promGrupoTotal = totalAlumnosConPromedio > 0 ? (sumaPromediosGrupales / totalAlumnosConPromedio).toFixed(1) : '-';
  xml += `    <Cell ss:StyleID="FilaPromedio"><Data ss:Type="${promGrupoTotal !== '-' ? 'Number' : 'String'}">${promGrupoTotal}</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const safeNombre = `Evaluacion_Porcentajes_${(grupoNombre || 'Grupo').replace(/\s+/g, '_')}_${campoActual}_${fechaEval}.xls`;
  triggerDownload(blob, safeNombre);
};
