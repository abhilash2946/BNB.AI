import html2pdf from 'html2pdf.js';

export const exportReportToPDF = (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;
  const opt = {
    margin: [0.5, 0.5, 0.5, 0.5],
    filename: `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' },
  };
  // html2pdf types are incomplete; using `as any` is safe here
  (html2pdf() as any).set(opt).from(element).save();
};
