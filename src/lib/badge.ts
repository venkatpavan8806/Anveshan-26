import QRCode from "qrcode";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function qrDataUrl(data: string) {
  return QRCode.toDataURL(data, { margin: 1, width: 300 });
}

export interface BadgeInput {
  name: string;
  unique_code: string;
  teamName?: string | null;
}

// Prints badges in a 2-up column grid, one QR per badge, cut-line borders.
export async function buildBadgePdf(items: BadgeInput[]) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);

  const pageWidth = 595.28; // A4 pt
  const pageHeight = 841.89;
  const margin = 24;
  const cols = 2;
  const badgeW = (pageWidth - margin * 2) / cols;
  const badgeH = 170;
  const rowsPerPage = Math.floor((pageHeight - margin * 2) / badgeH);
  const perPage = cols * rowsPerPage;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let onPage = 0;

  for (let i = 0; i < items.length; i++) {
    if (onPage === perPage) {
      page = pdf.addPage([pageWidth, pageHeight]);
      onPage = 0;
    }

    const col = onPage % cols;
    const row = Math.floor(onPage / cols);
    const x = margin + col * badgeW;
    const y = pageHeight - margin - (row + 1) * badgeH;

    page.drawRectangle({
      x,
      y,
      width: badgeW,
      height: badgeH,
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 1,
    });

    const item = items[i];
    const qrPng = await QRCode.toBuffer(item.unique_code, { margin: 1, width: 240 });
    const qrImage = await pdf.embedPng(qrPng);
    const qrSize = 110;

    page.drawImage(qrImage, {
      x: x + (badgeW - qrSize) / 2,
      y: y + badgeH - qrSize - 14,
      width: qrSize,
      height: qrSize,
    });

    page.drawText("ANVESHAN", {
      x: x + 12,
      y: y + badgeH - 14,
      size: 9,
      font,
      color: rgb(0.31, 0.27, 0.9),
    });

    const nameSize = 12;
    const nameWidth = font.widthOfTextAtSize(item.name, nameSize);
    page.drawText(item.name, {
      x: x + (badgeW - nameWidth) / 2,
      y: y + 30,
      size: nameSize,
      font,
      color: rgb(0.06, 0.09, 0.16),
    });

    const codeText = item.unique_code + (item.teamName ? `  ·  ${item.teamName}` : "");
    const codeSize = 9;
    const codeWidth = fontRegular.widthOfTextAtSize(codeText, codeSize);
    page.drawText(codeText, {
      x: x + (badgeW - codeWidth) / 2,
      y: y + 16,
      size: codeSize,
      font: fontRegular,
      color: rgb(0.4, 0.44, 0.52),
    });

    onPage++;
  }

  return pdf.save();
}

export function downloadBytes(bytes: Uint8Array, filename: string, mime = "application/pdf") {
  const blob = new Blob([bytes as unknown as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
