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

  // Server-side CMS Admin Auth (scrypt + HMAC Bearer token, no hardcoded passwords)
  const adminAuthFile = path.join(path.resolve(process.cwd(), 'data'), 'admin-auth.json');
  const cmsTokenSecret = process.env.ADMIN_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');

  interface StoredAdminAuth {
    username: string;
    salt: string;
    hash: string;
    createdAt: string;
  }

  const readStoredAdminAuth = (): StoredAdminAuth | null => {
    try {
      if (!fs.existsSync(adminAuthFile)) return null;
      const raw = fs.readFileSync(adminAuthFile, 'utf8');
      const parsed = JSON.parse(raw) as Partial<StoredAdminAuth>;
      if (parsed.username && parsed.salt && parsed.hash) {
        return parsed as StoredAdminAuth;
      }
      return null;
    } catch {
      return null;
    }
  };

  const signCmsToken = (username: string): string => {
    const payload = Buffer.from(
      JSON.stringify({ sub: username, role: 'admin', exp: Date.now() + 12 * 60 * 60 * 1000 })
    ).toString('base64url');
    const sig = crypto.createHmac('sha256', cmsTokenSecret).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  };

  const verifyCmsToken = (token: string | undefined): { username: string } | null => {
    if (!token || !token.includes('.')) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, sigB64] = parts;
    if (!payloadB64 || !sigB64) return null;
    try {
      const expectedSig = crypto
        .createHmac('sha256', cmsTokenSecret)
        .update(payloadB64)
        .digest('base64url');
      const sigBuf = Buffer.from(sigB64);
      const expectedBuf = Buffer.from(expectedSig);
      if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return null;
      }
      const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
        sub?: string;
        role?: string;
        exp?: number;
      };
      if (!decoded.sub || decoded.role !== 'admin' || !decoded.exp || decoded.exp < Date.now()) {
        return null;
      }
      return { username: decoded.sub };
    } catch {
      return null;
    }
  };

  const requireCmsOrFirebaseAdmin = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const authHeader = req.headers.authorization;
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const cmsUser = verifyCmsToken(bearer);
    if (cmsUser) {
      (req as express.Request & { cmsAdmin?: { username: string } }).cmsAdmin = cmsUser;
      next();
      return;
    }
    const fbUser = await verifyFirebaseIdToken(bearer);
    if (fbUser) {
      (req as express.Request & { firebaseUser: VerifiedTokenUser }).firebaseUser = fbUser;
      next();
      return;
    }
    res.status(401).json({ error: 'Admin authentication required to publish portal updates.' });
  };

  app.get('/api/admin/status', (_req, res) => {
    const envConfigured = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim());
    const fileConfigured = Boolean(readStoredAdminAuth());
    res.json({
      backendAvailable: true,
      configured: envConfigured || fileConfigured,
      envManaged: envConfigured,
    });
  });

  app.post('/api/admin/claim', (req, res) => {
    const envPass = process.env.ADMIN_PASSCODE?.trim();
    if (envPass || readStoredAdminAuth()) {
      res.status(409).json({ error: 'Admin account is already configured.' });
      return;
    }
    const { username, password } = req.body as { username?: string; password?: string };
    const cleanUser = (username || '').trim().toLowerCase();
    if (!cleanUser || cleanUser.length < 3) {
      res.status(400).json({ error: 'Admin username must be at least 3 characters.' });
      return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ error: 'Admin password must be at least 6 characters.' });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    const record: StoredAdminAuth = {
      username: cleanUser,
      salt,
      hash,
      createdAt: new Date().toISOString(),
    };
    const dataDir = path.dirname(adminAuthFile);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(adminAuthFile, JSON.stringify(record, null, 2), 'utf8');

    const token = signCmsToken(cleanUser);
    res.status(201).json({ token, username: cleanUser });
  });

  app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body as { username?: string; password?: string };
    const cleanUser = (username || '').trim().toLowerCase();
    if (!cleanUser || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    const envPass = process.env.ADMIN_PASSCODE?.trim();
    if (envPass) {
      const envUser = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
      const userMatch =
        cleanUser.length === envUser.length &&
        crypto.timingSafeEqual(Buffer.from(cleanUser), Buffer.from(envUser));
      const a = crypto.createHash('sha256').update(password).digest();
      const b = crypto.createHash('sha256').update(envPass).digest();
      if (userMatch && crypto.timingSafeEqual(a, b)) {
        res.json({ token: signCmsToken(envUser), username: envUser });
        return;
      }
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    const stored = readStoredAdminAuth();
    if (!stored) {
      res.status(404).json({ error: 'No admin account configured yet.' });
      return;
    }

    const derived = crypto.scryptSync(password, stored.salt, 64);
    const expected = Buffer.from(stored.hash, 'hex');
    const valid =
      cleanUser === stored.username &&
      derived.length === expected.length &&
      crypto.timingSafeEqual(derived, expected);

    if (!valid) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    res.json({ token: signCmsToken(stored.username), username: stored.username });
  });

  app.post('/api/admin/change-credentials', requireCmsOrFirebaseAdmin, (req, res) => {
    if (process.env.ADMIN_PASSCODE?.trim()) {
      res.status(409).json({
        error: 'Credentials are locked to ADMIN_PASSCODE in server environment variables.',
      });
      return;
    }

    const { currentPassword, newUsername, newPassword } = req.body as {
      currentPassword?: string;
      newUsername?: string;
      newPassword?: string;
    };

    const cleanNewUser = (newUsername || '').trim().toLowerCase();
    if (!cleanNewUser || cleanNewUser.length < 3) {
      res.status(400).json({ error: 'New admin username must be at least 3 characters.' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters.' });
      return;
    }

    const stored = readStoredAdminAuth();
    const isFirebaseVerified = Boolean(
      (req as express.Request & { firebaseUser?: VerifiedTokenUser }).firebaseUser
    );
    if (stored && !isFirebaseVerified) {
      if (!currentPassword) {
        res.status(400).json({ error: 'Current password is required to update credentials.' });
        return;
      }
      const derived = crypto.scryptSync(currentPassword, stored.salt, 64);
      const expected = Buffer.from(stored.hash, 'hex');
      if (derived.length !== expected.length || !crypto.timingSafeEqual(derived, expected)) {
        res.status(401).json({ error: 'Current password is incorrect.' });
        return;
      }
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(newPassword, salt, 64).toString('hex');
    const updatedRecord: StoredAdminAuth = {
      username: cleanNewUser,
      salt,
      hash,
      createdAt: new Date().toISOString(),
    };
    const dataDir = path.dirname(adminAuthFile);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(adminAuthFile, JSON.stringify(updatedRecord, null, 2), 'utf8');

    res.json({
      token: signCmsToken(cleanNewUser),
      username: cleanNewUser,
    });
  });

  // Shared Multi-User Public Portal State (Published by Admin -> Seen by All Visitors)
  const portalStateFile = path.join(path.resolve(process.cwd(), 'data'), 'portal-state.json');

  interface StoredPortalEnvelope {
    state: Record<string, unknown>;
    updatedAt: string;
  }

  const readPortalEnvelope = (): StoredPortalEnvelope | null => {
    try {
      if (!fs.existsSync(portalStateFile)) return null;
      const raw = fs.readFileSync(portalStateFile, 'utf8');
      const parsed = JSON.parse(raw) as Partial<StoredPortalEnvelope>;
      if (parsed && parsed.state && typeof parsed.state === 'object' && !Array.isArray(parsed.state)) {
        return {
          state: parsed.state,
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  const writePortalEnvelope = (state: Record<string, unknown>): string => {
    const dataDir = path.dirname(portalStateFile);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const updatedAt = new Date().toISOString();
    const tmpFile = `${portalStateFile}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify({ state, updatedAt }, null, 2), 'utf8');
    fs.renameSync(tmpFile, portalStateFile);
    return updatedAt;
  };

  app.get('/api/portal/state', (_req, res) => {
    const envelope = readPortalEnvelope();
    if (!envelope) {
      res.json({ state: null, updatedAt: null });
      return;
    }
    res.json({ state: envelope.state, updatedAt: envelope.updatedAt });
  });

  app.post('/api/portal/state', requireCmsOrFirebaseAdmin, (req, res) => {
    const body = req.body as { state?: unknown };
    if (!body?.state || typeof body.state !== 'object' || Array.isArray(body.state)) {
      res.status(400).json({ error: 'Invalid portal state payload.' });
      return;
    }
    const updatedAt = writePortalEnvelope(body.state as Record<string, unknown>);
    res.json({ ok: true, updatedAt });
  });

  app.post('/api/portal/print-jobs', (req, res) => {
    const job = (req.body as { item?: Record<string, unknown> })?.item;
    if (
      !job ||
      typeof job !== 'object' ||
      typeof job.jobCode !== 'string' ||
      typeof job.studentName !== 'string' ||
      typeof job.fileName !== 'string'
    ) {
      res.status(400).json({ error: 'Invalid Free Printing submission payload.' });
      return;
    }
    const sanitizedJob: Record<string, unknown> = {
      ...job,
      id: typeof job.id === 'string' && job.id ? job.id : `prt-${Date.now()}`,
      status: 'Submitted',
    };
    const envelope = readPortalEnvelope();
    const currentState: Record<string, unknown> = envelope?.state ? { ...envelope.state } : {};
    const existing = Array.isArray(currentState.printJobs) ? currentState.printJobs : [];
    const deduped = existing.filter(
      (j) => !(j && typeof j === 'object' && (j as { id?: unknown }).id === sanitizedJob.id)
    );
    currentState.printJobs = [sanitizedJob, ...deduped];
    const updatedAt = writePortalEnvelope(currentState);
    res.status(201).json({ ok: true, updatedAt });
  });

  app.post('/api/portal/lost-found', (req, res) => {
    const item = (req.body as { item?: Record<string, unknown> })?.item;
    if (
      !item ||
      typeof item !== 'object' ||
      typeof item.itemName !== 'string' ||
      typeof item.lastSeen !== 'string'
    ) {
      res.status(400).json({ error: 'Invalid Lost & Found payload.' });
      return;
    }
    const sanitizedItem: Record<string, unknown> = {
      ...item,
      id: typeof item.id === 'string' && item.id ? item.id : `lf-${Date.now()}`,
      status: 'Open',
    };
    const envelope = readPortalEnvelope();
    const currentState: Record<string, unknown> = envelope?.state ? { ...envelope.state } : {};
    const existing = Array.isArray(currentState.lostFound) ? currentState.lostFound : [];
    const deduped = existing.filter(
      (i) => !(i && typeof i === 'object' && (i as { id?: unknown }).id === sanitizedItem.id)
    );
    currentState.lostFound = [sanitizedItem, ...deduped];
    const updatedAt = writePortalEnvelope(currentState);
    res.status(201).json({ ok: true, updatedAt });
  });

  app.post('/api/portal/tickets', (req, res) => {
    const ticket = (req.body as { item?: Record<string, unknown> })?.item;
    if (
      !ticket ||
      typeof ticket !== 'object' ||
      typeof ticket.ticketCode !== 'string' ||
      typeof ticket.subject !== 'string' ||
      typeof ticket.details !== 'string'
    ) {
      res.status(400).json({ error: 'Invalid report submission payload.' });
      return;
    }
    const sanitizedTicket: Record<string, unknown> = {
      ...ticket,
      id: typeof ticket.id === 'string' && ticket.id ? ticket.id : `tkt-${Date.now()}`,
      approvedForPublic: false,
      status: 'Pending Approval',
    };
    const envelope = readPortalEnvelope();
    const currentState: Record<string, unknown> = envelope?.state ? { ...envelope.state } : {};
    const existing = Array.isArray(currentState.tickets) ? currentState.tickets : [];
    const deduped = existing.filter(
      (t) => !(t && typeof t === 'object' && (t as { id?: unknown }).id === sanitizedTicket.id)
    );
    currentState.tickets = [sanitizedTicket, ...deduped];
    const updatedAt = writePortalEnvelope(currentState);
    res.status(201).json({ ok: true, updatedAt });
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
