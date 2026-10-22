import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import { env } from "../config/env.js";
import { AppError } from "../middlewares/errorHandler.js";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

const MIME_EXTENSIONS = new Map<string, string>([
  ["application/pdf", ".pdf"],
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".docx",
  ],
]);

export const uploadDirectory = path.resolve(process.cwd(), env.uploadDir);

async function ensureUploadDirectory() {
  await mkdir(uploadDirectory, { recursive: true });
}

export const documentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      void ensureUploadDirectory().then(
        () => callback(null, uploadDirectory),
        (error: unknown) =>
          callback(
            error instanceof Error
              ? error
              : new Error("Impossible de créer le répertoire de stockage."),
            uploadDirectory,
          ),
      );
    },
    filename: (_req, file, callback) => {
      const extension = MIME_EXTENSIONS.get(file.mimetype);
      if (!extension) {
        callback(
          new AppError(
            "Format de fichier non autorisé.",
            400,
            "UNSUPPORTED_FILE_TYPE",
          ),
          "",
        );
        return;
      }
      callback(null, `${randomUUID()}${extension}`);
    },
  }),
  limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!MIME_EXTENSIONS.has(file.mimetype)) {
      callback(
        new AppError(
          "Format accepté : PDF, JPEG, PNG ou DOCX.",
          400,
          "UNSUPPORTED_FILE_TYPE",
        ),
      );
      return;
    }
    callback(null, true);
  },
});

export function resolveStoredFile(storageKey: string): string {
  if (!/^[0-9a-f-]{36}\.(pdf|jpg|png|docx)$/i.test(storageKey)) {
    throw new AppError("Fichier d’archive introuvable.", 404, "DOCUMENT_FILE_NOT_FOUND");
  }
  const filePath = path.resolve(uploadDirectory, storageKey);
  if (!filePath.startsWith(`${uploadDirectory}${path.sep}`)) {
    throw new AppError("Fichier d’archive introuvable.", 404, "DOCUMENT_FILE_NOT_FOUND");
  }
  return filePath;
}

export async function verifyFileSignature(filePath: string, mimeType: string) {
  const file = await readFile(filePath);
  const valid =
    (mimeType === "application/pdf" &&
      file.subarray(0, 5).toString("ascii") === "%PDF-") ||
    (mimeType === "image/jpeg" &&
      file[0] === 0xff &&
      file[1] === 0xd8 &&
      file[2] === 0xff) ||
    (mimeType === "image/png" &&
      file.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      )) ||
    (mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
      file[0] === 0x50 &&
      file[1] === 0x4b);
  if (!valid) {
    throw new AppError(
      "Le contenu du fichier ne correspond pas à son format déclaré.",
      400,
      "INVALID_FILE_CONTENT",
    );
  }
}

export async function removeStoredFile(storageKey: string) {
  await unlink(resolveStoredFile(storageKey));
}

export function mimeTypeForStorageKey(storageKey: string): string {
  const extension = path.extname(storageKey).toLowerCase();
  const match = [...MIME_EXTENSIONS].find(([, ext]) => ext === extension);
  if (!match) {
    throw new AppError("Type de fichier d’archive invalide.", 404, "DOCUMENT_FILE_NOT_FOUND");
  }
  return match[0];
}
