import QRCode from "qrcode";
import { appUrl } from "./urls";

/*
 * QR codes for the printed card.
 *
 * The code encodes /q/{shortCode}, never the slug: a card hung in a hallway
 * cannot be reprinted, so it must survive renames, slug changes and domains.
 * Error correction "M" survives a scuffed or partly covered print while
 * keeping the modules large enough to scan from a distance.
 */

export const qrTarget = (shortCode: string): string => appUrl(`/q/${shortCode}`);

const COLORS = { dark: "#000000", light: "#ffffff" };

export function qrSvg(shortCode: string): Promise<string> {
  return QRCode.toString(qrTarget(shortCode), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    color: COLORS,
  });
}

export function qrPng(shortCode: string): Promise<Buffer> {
  // 1200px prints sharply at 10 cm and above.
  return QRCode.toBuffer(qrTarget(shortCode), {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 1200,
    color: COLORS,
  });
}
