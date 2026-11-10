export const quarterlyReportPdfCss = `
@page { size: Letter; margin: 14mm 13mm 16mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; color: #183149; font-family: Arial, Helvetica, sans-serif; font-size: 9pt; }
.quarterly-report { width: 100%; margin: 0; padding: 0; border: 0; border-radius: 0; background: #fff; color: #183149; font-family: Arial, Helvetica, sans-serif; }
.quarterly-report h2, .quarterly-report h3, .quarterly-report h4 { color: #174c5a; page-break-after: avoid; }
.quarterly-cover { margin: 0 0 7mm; padding: 9mm; color: #fff; background: #12384f; border: 1px solid #12384f; border-radius: 3mm; box-shadow: none; break-inside: avoid; }
.quarterly-kicker { font-size: 8pt; font-weight: bold; letter-spacing: 1.2pt; }
.quarterly-cover h2 { margin: 3mm 0; color: #fff; font-size: 20pt; }
.quarterly-cover p { margin: 0; font-size: 9pt; }
.quarterly-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; margin-top: 6mm; }
.quarterly-metrics div { min-width: 0; padding: 3mm; border: 1px solid #ffffff66; border-radius: 2mm; background: #ffffff18; }
.quarterly-metrics strong, .quarterly-metrics span { display: block; }
.quarterly-metrics strong { font-size: 11pt; overflow-wrap: anywhere; }
.quarterly-metrics span { margin-top: 1mm; font-size: 7.5pt; }
.quarterly-summary, .quarterly-student { margin: 0 0 6mm; padding: 0; border: 0; border-radius: 0; background: #fff; box-shadow: none; }
.quarterly-summary h3 { margin: 0 0 3mm; padding-bottom: 2mm; border-bottom: 2px solid #176c68; font-size: 13pt; }
.quarterly-report h4 { margin: 5mm 0 2mm; font-size: 10pt; }
.quarterly-report table { width: 100%; margin: 2mm 0 4mm; border-collapse: collapse; table-layout: fixed; font-size: 7.4pt; }
.quarterly-report thead { display: table-header-group; }
.quarterly-report tr { break-inside: avoid; page-break-inside: avoid; }
.quarterly-report th, .quarterly-report td { padding: 2mm; border: 0.5pt solid #cbd5df; vertical-align: top; white-space: pre-wrap; overflow-wrap: anywhere; }
.quarterly-report th { color: #164c55; background: #e8f1f2; font-weight: bold; text-align: left; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
.quarterly-student { break-before: page; page-break-before: always; }
.quarterly-student-heading { display: flex; align-items: center; gap: 5mm; margin: 0 0 4mm; padding: 0 0 3mm; border-bottom: 2px solid #176c68; break-inside: avoid; }
.quarterly-student-heading img { width: 25mm; height: 30mm; object-fit: cover; border: 1pt solid #cbd5df; border-radius: 2mm; }
.quarterly-student-heading h3 { margin: 1mm 0; font-size: 16pt; }
.quarterly-student-heading p { margin: 0; color: #526779; font-size: 9pt; }
.quarterly-photo-cell { width: 22mm; height: 27mm; object-fit: cover; vertical-align: top; }
.quarterly-load-note { padding: 3mm; border: 1px solid #d3a743; color: #805c10; background: #fff5dc; }
img { max-width: 100%; break-inside: avoid; page-break-inside: avoid; }
`;

export const quarterlyReportPdfFallbackCss = `
@page { size: Letter; margin: 14mm; }
body { font: 9pt Arial, Helvetica, sans-serif; color: #183149; }
.quarterly-report { width: 100%; color: #183149; }
.quarterly-report table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7.5pt; }
.quarterly-report th, .quarterly-report td { border: 1px solid #cbd5df; padding: 5px; overflow-wrap: anywhere; vertical-align: top; }
.quarterly-report th { background: #e8f1f2; color: #164c55; }
.quarterly-student { break-before: page; page-break-before: always; }
`;
