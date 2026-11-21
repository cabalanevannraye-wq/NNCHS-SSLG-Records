import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };
import type { SSLGDocument } from './src/types.ts';
import {
  compilePeriodicBinderPdf,
  compileYearEndHardcopyArchivePdf,
  stampSignatureOnDocumentPdf,
} from './server/pdfService.ts';
import { loadOrSeedDatabase, UPLOADS_DIR } from './server/store.ts';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

interface VerifiedTokenUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  expiresAt: number;
}

const tokenCache = new Map<string, VerifiedTokenUser>();

async function verifyFirebaseIdToken(idToken: string | undefined): Promise<VerifiedTokenUser | null> {
  if (!idToken || idToken.length < 20) return null;

  const cacheKey = crypto.createHash('sha256').update(idToken).digest('hex');
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      users?: Array<{
        localId?: string;
        email?: string;
        emailVerified?: boolean;
        disabled?: boolean;
      }>;
    };
    const user = payload.users?.[0];
    const userEmail = (user?.email || '').toLowerCase();
    const isSyntheticUsername = userEmail.endsWith('@accounts.sslgnnchs26.site');
    if (
      !user ||
      !user.localId ||
      !userEmail ||
      user.disabled ||
      (user.emailVerified !== true && !isSyntheticUsername)
    ) {
      return null;
    }

    const verified: VerifiedTokenUser = {
      uid: user.localId,
      email: userEmail,
      emailVerified: Boolean(user.emailVerified),
      expiresAt: Date.now() + 60_000,
    };

    if (tokenCache.size > 500) {
      tokenCache.clear();
    }
    tokenCache.set(cacheKey, verified);
    return verified;
  } catch {
    return null;
  }
}

async function requireFirebaseAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
  const queryToken = typeof req.query.token === 'string' ? req.query.token.trim() : undefined;
  const token = headerToken || queryToken;

  const verified = await verifyFirebaseIdToken(token);
  if (!verified) {
    res.status(401).json({ error: 'Firebase authentication required. Please sign in with Google.' });
    return;
  }

  (req as express.Request & { firebaseUser: VerifiedTokenUser }).firebaseUser = verified;
  next();
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

function inferMimeType(filename: string, fallback = 'application/octet-stream'): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (lower.endsWith('.doc')) return 'application/msword';
  return fallback;
}

function isAllowedOrigin(origin: string): boolean {
  const normalized = origin.trim().replace(/\/+$/, '').toLowerCase();
  if (!normalized) return false;

  const exactAllowed = new Set<string>([
    'https://sslgnnchs26.site',
    'https://www.sslgnnchs26.site',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://0.0.0.0:3000',
  ]);

  if (process.env.APP_URL) {
    exactAllowed.add(process.env.APP_URL.trim().replace(/\/+$/, '').toLowerCase());
  }
  if (process.env.ALLOWED_ORIGINS) {
    for (const item of process.env.ALLOWED_ORIGINS.split(',')) {
      const clean = item.trim().replace(/\/+$/, '').toLowerCase();
      if (clean) exactAllowed.add(clean);
    }
  }

  if (exactAllowed.has(normalized)) return true;

  try {
    const parsed = new URL(normalized);
    if (
      parsed.protocol === 'https:' &&
      (parsed.hostname.endsWith('.sslgnnchs26.site') || parsed.hostname.endsWith('.pages.dev'))
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

async function startServer() {
  // Ensure sample uploaded PDF files exist on disk in data/uploads/
  await loadOrSeedDatabase();

  const app = express();
  app.set('trust proxy', 1);

  // Cloudflare & cross-origin popup headers + CORS for sslgnnchs26.site / Pages
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    const origin = req.headers.origin;
    if (origin && isAllowedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', projectId: firebaseConfig.projectId, dynamicBackend: true });
  });

  // Upload a prepared document or Stage 5 scanned hardcopy
  app.post('/api/files/upload', requireFirebaseAuth, upload.single('file'), (req, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Please select a file to upload.' });
      return;
    }
    res.status(201).json({
      filePath: file.filename,
      fileName: file.originalname,
      fileMimeType: file.mimetype || inferMimeType(file.originalname),
      fileSize: file.size,
    });
  });

  // Stamp electronic signature onto a PDF or image/DOCX certificate
  app.post('/api/files/stamp-signature', requireFirebaseAuth, async (req, res) => {
    const { doc, controlNumber, signatureDataUrl, signerName, signerPosition, signedAt } =
      req.body as {
        doc?: SSLGDocument;
        controlNumber?: string;
        signatureDataUrl?: string;
        signerName?: string;
        signerPosition?: string;
        signedAt?: string;
      };

    if (!doc || !controlNumber || !signatureDataUrl || !signerName || !signerPosition) {
      res.status(400).json({ error: 'Missing required signature stamping parameters.' });
      return;
    }

    if (!signatureDataUrl.startsWith('data:image/png')) {
      res.status(400).json({ error: 'Signature must be a valid PNG data URL.' });
      return;
    }

    const currentFileRel = doc.signedFilePath || doc.filePath;
    const sourcePath = path.join(UPLOADS_DIR, path.basename(currentFileRel));
    if (!fs.existsSync(sourcePath)) {
      res.json({ signedFilePath: doc.signedFilePath ?? null });
      return;
    }

    const stampedBytes = await stampSignatureOnDocumentPdf({
      sourcePath,
      mimeType: doc.signedFilePath ? 'application/pdf' : doc.fileMimeType,
      doc,
      controlNumber,
      signatureDataUrl,
      signerName,
      signerPosition,
      signedAt: signedAt || new Date().toISOString(),
    });

    if (!stampedBytes) {
      res.json({ signedFilePath: doc.signedFilePath ?? null });
      return;
    }

    const safeControl = controlNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const stampedName = `SIGNED_${safeControl}_${Date.now()}.pdf`;
    fs.writeFileSync(path.join(UPLOADS_DIR, stampedName), stampedBytes);
    res.json({ signedFilePath: stampedName });
  });

  // Delete stored file(s) from disk when a record is deleted
  app.post('/api/files/delete', requireFirebaseAuth, (req, res) => {
    const { paths } = req.body as { paths?: Array<string | null | undefined> };
    if (!Array.isArray(paths)) {
      res.status(400).json({ error: 'Expected paths array.' });
      return;
    }
    let deletedCount = 0;
    for (const rel of paths) {
      if (!rel || typeof rel !== 'string') continue;
      const safeFile = path.basename(rel);
      const fp = path.join(UPLOADS_DIR, safeFile);
      if (fs.existsSync(fp)) {
        try {
          fs.unlinkSync(fp);
          deletedCount += 1;
        } catch {
          // ignore unlink errors
        }
      }
    }
    res.json({ deletedCount });
  });

  // Authenticated file preview & download
  app.get('/api/files/:filename', requireFirebaseAuth, (req, res) => {
    const rawParam = Array.isArray(req.params.filename)
      ? req.params.filename[0]
      : req.params.filename;
    const safeFile = path.basename(rawParam || '');
    if (!safeFile) {
      res.status(400).json({ error: 'Invalid filename.' });
      return;
    }
    const fullPath = path.join(UPLOADS_DIR, safeFile);
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'Stored document file not found.' });
      return;
    }

    const downloadName =
      typeof req.query.name === 'string' && req.query.name.trim()
        ? req.query.name.trim().replace(/[\r\n"]/g, '_')
        : safeFile;
    const wantDownload = req.query.download === 'true';

    if (wantDownload) {
      res.download(fullPath, downloadName);
      return;
    }

    const mimeType = inferMimeType(safeFile);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${downloadName}"`);
    res.sendFile(fullPath);
  });

  // Compile periodic PDF binder from Firestore documents
  app.post('/api/pdf/compile-binder', requireFirebaseAuth, async (req, res) => {
    const { documents, organizationHeader, schoolYear, periodLabel, categoryLabel } = req.body as {
      documents?: SSLGDocument[];
      organizationHeader?: string;
      schoolYear?: string;
      periodLabel?: string;
      categoryLabel?: string;
    };

    const docs = Array.isArray(documents) ? documents : [];
    const safePeriod = periodLabel || 'Annual';

    const pdfBytes = await compilePeriodicBinderPdf({
      documents: docs,
      uploadsDir: UPLOADS_DIR,
      organizationHeader: organizationHeader || 'NNCHS · Supreme Secondary Learner Government',
      schoolYear: schoolYear || '2026-2027',
      periodLabel: safePeriod,
      categoryLabel: categoryLabel || 'All Categories',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="SSLG_Compilation_${safePeriod.replace(/\s+/g, '_')}.pdf"`
    );
    res.send(Buffer.from(pdfBytes));
  });

  // Compile 1-click Year-End Hardcopy Archive PDF book from Stage 5 documents
  app.post('/api/pdf/compile-year-end', requireFirebaseAuth, async (req, res) => {
    const { documents, organizationHeader, schoolYear } = req.body as {
      documents?: SSLGDocument[];
      organizationHeader?: string;
      schoolYear?: string;
    };

    const docs = Array.isArray(documents) ? documents : [];
    const sy = schoolYear || '2026-2027';

    const pdfBytes = await compileYearEndHardcopyArchivePdf({
      documents: docs,
      uploadsDir: UPLOADS_DIR,
      organizationHeader: organizationHeader || 'NNCHS · Supreme Secondary Learner Government',
      schoolYear: sy,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="SSLG_YearEnd_Hardcopy_Archive_${sy}.pdf"`
    );
    res.send(Buffer.from(pdfBytes));
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SSLG Records server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SSLG server:', err);
  process.exit(1);
});
