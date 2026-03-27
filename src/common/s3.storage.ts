import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as path from 'path';

// ── Config ────────────────────────────────────────────────────────────────────

const SIGNED_URL_TTL_SECONDS = 300;

// Lazy singleton — created on first use so NestJS config has time to load .env
let _s3: S3Client | null = null;

const s3 = (): S3Client => {
  if (!_s3) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION;

    if (!accessKeyId || !secretAccessKey || !region) {
      throw new Error(
        'Missing AWS credentials. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_REGION in your .env file.',
      );
    }

    _s3 = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _s3;
};

const bucket = () => {
  const b = process.env.S3_BUCKET;
  if (!b) throw new Error('Missing S3_BUCKET env variable.');
  return b;
};

const normalizeBase = (url = '') => url.replace(/\/+$/, '');

// ── Path helpers ──────────────────────────────────────────────────────────────

const sanitizeFileName = (value: string) =>
  path.basename(String(value || 'file')).replace(/[^a-zA-Z0-9._-]/g, '_') || 'file';

const getFolderName = (mimetype = ''): string => {
  if (mimetype.startsWith('image/')) return 'images';
  if (mimetype.startsWith('video/')) return 'videos';
  if (mimetype === 'application/pdf') return 'pdfs';
  return 'others';
};

/**
 * Build the S3 key for a file.
 * Structure: {folder}/{timestamp}_{sanitizedFileName}
 * e.g. images/1714000000000_photo.jpg
 */
const buildKey = (mimetype: string, originalName: string): string => {
  const folder = getFolderName(mimetype);
  const safeFileName = sanitizeFileName(originalName);
  return `${folder}/${Date.now()}_${safeFileName}`;
};

// ── URL helpers ───────────────────────────────────────────────────────────────

const buildS3Url = (key: string): string => {
  const region = process.env.AWS_REGION!;
  const encoded = key.split('/').map(encodeURIComponent).join('/');
  return `https://${bucket()}.s3.${region}.amazonaws.com/${encoded}`;
};

const buildFileUrl = (key: string): string => {
  const cfBase = normalizeBase(process.env.CLOUDFRONT_URL || '');
  return cfBase ? `${cfBase}/${key}` : buildS3Url(key);
};

const extractKey = (fileKeyOrUrl: string): string => {
  if (!fileKeyOrUrl || !fileKeyOrUrl.startsWith('http')) return fileKeyOrUrl;

  const cfBase = normalizeBase(process.env.CLOUDFRONT_URL || '');
  if (cfBase && fileKeyOrUrl.startsWith(`${cfBase}/`)) {
    return decodeURIComponent(fileKeyOrUrl.slice(cfBase.length + 1));
  }

  try {
    const parsed = new URL(fileKeyOrUrl);
    return decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  } catch {
    return fileKeyOrUrl;
  }
};

const buildContentDisposition = (fileName: string, inline = true): string => {
  const type = inline ? 'inline' : 'attachment';
  return `${type}; filename="${sanitizeFileName(fileName)}"`;
};

// ── Public API ────────────────────────────────────────────────────────────────

export interface PresignedUploadResult {
  uploadUrl: string;
  fileUrl: string;
  key: string;
  headers: { 'Content-Type': string; 'Content-Disposition': string };
  expiresIn: number;
}

/**
 * Generate a pre-signed S3 PUT URL so the browser can upload directly to S3.
 * Call this from the upload-authorize endpoint.
 */
export async function createPresignedUpload(params: {
  fileName: string;
  fileType: string;
  inline?: boolean;
  expiresIn?: number;
}): Promise<PresignedUploadResult> {
  const { fileName, fileType, inline = true, expiresIn = SIGNED_URL_TTL_SECONDS } = params;

  const key = buildKey(fileType, fileName);
  const contentDisposition = buildContentDisposition(fileName, inline);

  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: fileType,
    ContentDisposition: contentDisposition,
  });

  const uploadUrl = await getSignedUrl(s3(), command, { expiresIn });

  return {
    uploadUrl,
    fileUrl: buildFileUrl(key),
    key,
    headers: {
      'Content-Type': fileType,
      'Content-Disposition': contentDisposition,
    },
    expiresIn,
  };
}

/**
 * Upload a file server-side (from a multer buffer).
 * Use this when the backend needs to process / generate the file itself.
 */
export async function uploadToS3(
  file: Express.Multer.File,
  options: { inline?: boolean } = {},
): Promise<{ key: string; fileUrl: string }> {
  const key = buildKey(file.mimetype, file.originalname);
  const contentDisposition = buildContentDisposition(file.originalname, options.inline ?? true);

  await s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentDisposition: contentDisposition,
    }),
  );

  return { key, fileUrl: buildFileUrl(key) };
}

/**
 * Upload a raw Buffer directly to S3 (e.g. a generated PDF).
 */
export async function uploadBufferToS3(
  buffer: Buffer,
  mimetype: string,
  originalName: string,
  options: { inline?: boolean } = {},
): Promise<{ key: string; fileUrl: string }> {
  const key = buildKey(mimetype, originalName);
  const contentDisposition = buildContentDisposition(originalName, options.inline ?? true);

  await s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      ContentDisposition: contentDisposition,
    }),
  );

  return { key, fileUrl: buildFileUrl(key) };
}

/**
 * Delete a file from S3 by its key or full CloudFront / S3 URL.
 * Safe to call with null / undefined — it will simply do nothing.
 */
export async function deleteFromS3(fileKeyOrUrl: string | null | undefined): Promise<void> {
  if (!fileKeyOrUrl) return;

  const key = extractKey(fileKeyOrUrl);
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  } catch (err: any) {
    console.error('S3 delete error:', err?.message);
  }
}
