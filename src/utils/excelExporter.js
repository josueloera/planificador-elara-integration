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
 * Genera un archivo Excel XML (.xls) con estilos completos
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
 * Genera un archivo Excel XML (.xls) de Trabajos QR
 */
export const exportarTrabajosExcel = ({ grupoNombre, fechaInicio, fechaFin, campo, trabajos = [], resumenAlumnos = [] }) => {
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
   <Interior ss:Color="#2C5282" ss:Pattern="Solid"/>
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
  </Style>
  <Style ss:ID="CalificacionMedia">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#744210"/>
   <Interior ss:Color="#FEFCBF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CalificacionBaja">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#742A2A"/>
   <Interior ss:Color="#FED7D7" ss:Pattern="Solid"/>
  </Style>
 </Styles>

 <!-- HOJA 1: RESUMEN DE PROMEDIOS -->
 <Worksheet ss:Name="Promedios Trabajos">
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
    <Cell ss:StyleID="${styleProm}"><Data ss:Type="String">${prom !== null ? prom.toFixed(1) : '-'}</Data></Cell>
   </Row>
`;
  });

  xml += `  </Table>
 </Worksheet>

 <!-- HOJA 2: BITÁCORA DETALLADA DE TRABAJOS -->
 <Worksheet ss:Name="Bitácora Completa">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="40"/>
   <Column ss:Width="90"/>
   <Column ss:Width="230"/>
   <Column ss:Width="200"/>
   <Column ss:Width="160"/>
   <Column ss:Width="90"/>

   <Row ss:Height="25">
    <Cell ss:MergeAcross="5" ss:StyleID="Titulo"><Data ss:Type="String">BITÁCORA DETALLADA DE TRABAJOS REGISTRADOS</Data></Cell>
   </Row>
   <Row>
    <Cell ss:MergeAcross="5" ss:StyleID="Subtitulo"><Data ss:Type="String">Grupo: ${escapeXml(grupoNombre)} | Periodo: ${escapeXml(fechaInicio)} al ${escapeXml(fechaFin)}</Data></Cell>
   </Row>
   <Row ss:Height="10"/>

   <Row ss:Height="24">
    <Cell ss:StyleID="Header"><Data ss:Type="String">#</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Fecha</Data></Cell>
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

    xml += `   <Row>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(t.fecha)}</Data></Cell>
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
  const safeNombre = `Trabajos_${(grupoNombre || 'Grupo').replace(/\s+/g, '_')}_${fechaInicio}_a_${fechaFin}.xls`;
  triggerDownload(blob, safeNombre);
};
