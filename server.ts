import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import type {
  CoreValue,
  DirectoryEntry,
  DocumentCategory,
  DocumentModuleType,
  LeaderboardEntry,
  SSLGDocument,
  TransmittalEvent,
  UserAccount,
  UserRole,
} from './src/types.ts';
import {
  compilePeriodicBinderPdf,
  compileYearEndHardcopyArchivePdf,
  stampSignatureOnDocumentPdf,
} from './server/pdfService.ts';
import {
  loadOrSeedDatabase,
  saveDatabase,
  UPLOADS_DIR,
  type DatabaseState,
} from './server/store.ts';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const TOKEN_SECRET = process.env.SESSION_SECRET || 'sslg-records-secret-key-2026';

let db: DatabaseState;

function signToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  if (sig !== expected) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as { userId?: string };
    return parsed.userId || null;
  } catch {
    return null;
  }
}

function sanitizeUser(u: UserAccount): Omit<UserAccount, 'password'> {
  const { password: _pw, ...rest } = u;
  return rest;
}

function getRequestUser(req: express.Request): UserAccount | null {
  const authHeader = req.headers.authorization;
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
  const token = headerToken || queryToken;
  const userId = verifyToken(token);
  if (!userId) return null;
  const user = db.users.find((u) => u.id === userId && u.active);
  return user || null;
}

function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const user = getRequestUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  (req as express.Request & { currentUser: UserAccount }).currentUser = user;
  next();
}

function getActorUser(req: express.Request): UserAccount {
  return (req as express.Request & { currentUser: UserAccount }).currentUser;
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

function formatControlNumber(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(4, '0')}`;
}

function issueNextControlNumber(docType: DocumentModuleType): string {
  if (docType === 'accomplishment') {
    const num = formatControlNumber(
      db.settings.accomplishmentPrefix,
      db.settings.accomplishmentNextSequence
    );
    db.settings.accomplishmentNextSequence += 1;
    return num;
  }
  const num = formatControlNumber(
    db.settings.generalPrefix,
    db.settings.generalNextSequence
  );
  db.settings.generalNextSequence += 1;
  return num;
}

async function startServer() {
  db = await loadOrSeedDatabase();

  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', schoolYear: db.settings.schoolYear });
  });

  // --- AUTH ---
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: 'Username/email and password are required.' });
      return;
    }
    const found = db.users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );
    if (!found) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }
    if (!found.active) {
      res.status(403).json({ error: 'This account has been deactivated by the SSLG President (Admin).' });
      return;
    }
    const token = signToken(found.id);
    res.json({
      token,
      user: sanitizeUser(found),
      settings: db.settings,
    });
  });

  app.get('/api/auth/me', requireAuth, (req, res) => {
    const user = getActorUser(req);
    res.json({ user: sanitizeUser(user), settings: db.settings });
  });

  // Update own profile picture
  app.patch('/api/auth/me/avatar', requireAuth, (req, res) => {
    const actor = getActorUser(req);
    const { avatarDataUrl } = req.body as { avatarDataUrl?: string | null };

    if (avatarDataUrl === null || avatarDataUrl === '') {
      actor.avatarDataUrl = null;
      saveDatabase(db);
      res.json(sanitizeUser(actor));
      return;
    }

    if (
      typeof avatarDataUrl !== 'string' ||
      !/^data:image\/(png|jpeg|jpg|webp);base64,/.test(avatarDataUrl) ||
      avatarDataUrl.length > 2 * 1024 * 1024
    ) {
      res.status(400).json({ error: 'Please upload a valid PNG, JPG, or WEBP profile image (under 2MB).' });
      return;
    }

    actor.avatarDataUrl = avatarDataUrl;
    saveDatabase(db);
    res.json(sanitizeUser(actor));
  });

  // --- LEADERBOARD & DIRECTORY ---
  app.get('/api/leaderboard', requireAuth, (_req, res) => {
    const entries: LeaderboardEntry[] = db.users
      .filter((u) => u.active)
      .map((u) => {
        const userDocs = db.documents.filter((d) => d.submittedByUserId === u.id);
        const ongoingCount = userDocs.filter((d) => d.currentStage < 5).length;
        const completedCount = userDocs.filter((d) => d.currentStage === 5).length;
        const generalCount = userDocs.filter((d) => d.docType === 'general').length;
        const accomplishmentCount = userDocs.filter((d) => d.docType === 'accomplishment').length;
        return {
          userId: u.id,
          fullName: u.fullName,
          positionOrClub: u.positionOrClub,
          role: u.role,
          department: u.department,
          avatarDataUrl: u.avatarDataUrl ?? null,
          totalPassed: userDocs.length,
          ongoingCount,
          completedCount,
          generalCount,
          accomplishmentCount,
        };
      })
      .sort((a, b) => {
        if (b.totalPassed !== a.totalPassed) return b.totalPassed - a.totalPassed;
        if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount;
        return a.fullName.localeCompare(b.fullName);
      });

    res.json(entries);
  });

  app.get('/api/directory', requireAuth, (_req, res) => {
    const entries: DirectoryEntry[] = db.users
      .filter((u) => u.active)
      .map((u) => {
        const userDocs = db.documents.filter(
          (d) =>
            d.submittedByUserId === u.id ||
            d.organizationName.toLowerCase() === u.positionOrClub.toLowerCase()
        );
        const ongoingCount = userDocs.filter((d) => d.currentStage < 5).length;
        const completedCount = userDocs.filter((d) => d.currentStage === 5).length;
        const generalCount = userDocs.filter((d) => d.docType === 'general').length;
        const accomplishmentCount = userDocs.filter((d) => d.docType === 'accomplishment').length;
        const sortedDates = userDocs.map((d) => d.documentDate).sort().reverse();
        return {
          userId: u.id,
          fullName: u.fullName,
          email: u.email,
          positionOrClub: u.positionOrClub,
          role: u.role,
          department: u.department,
          avatarDataUrl: u.avatarDataUrl ?? null,
          totalPassed: userDocs.length,
          ongoingCount,
          completedCount,
          generalCount,
          accomplishmentCount,
          latestDocumentDate: sortedDates[0] || null,
        };
      })
      .sort((a, b) => {
        if (a.role === 'organization' && b.role !== 'organization') return -1;
        if (a.role !== 'organization' && b.role === 'organization') return 1;
        return b.totalPassed - a.totalPassed || a.positionOrClub.localeCompare(b.positionOrClub);
      });

    res.json(entries);
  });

  // --- SETTINGS (Admin: SSLG President) ---
  app.get('/api/settings', requireAuth, (_req, res) => {
    res.json(db.settings);
  });

  app.patch('/api/settings', requireAuth, (req, res) => {
    const actor = getActorUser(req);
    if (actor.role !== 'admin') {
      res.status(403).json({ error: 'Only the SSLG President (Admin) can update system settings.' });
      return;
    }
    const {
      organizationHeader,
      schoolYear,
      generalPrefix,
      generalNextSequence,
      accomplishmentPrefix,
      accomplishmentNextSequence,
    } = req.body as Partial<typeof db.settings>;

    if (organizationHeader?.trim()) db.settings.organizationHeader = organizationHeader.trim();
    if (schoolYear?.trim()) db.settings.schoolYear = schoolYear.trim();
    if (generalPrefix?.trim()) db.settings.generalPrefix = generalPrefix.trim();
    if (typeof generalNextSequence === 'number' && generalNextSequence >= 1) {
      db.settings.generalNextSequence = Math.floor(generalNextSequence);
    }
    if (accomplishmentPrefix?.trim()) db.settings.accomplishmentPrefix = accomplishmentPrefix.trim();
    if (typeof accomplishmentNextSequence === 'number' && accomplishmentNextSequence >= 1) {
      db.settings.accomplishmentNextSequence = Math.floor(accomplishmentNextSequence);
    }
    saveDatabase(db);
    res.json(db.settings);
  });

  // --- USERS (Admin: SSLG President creates, edits, and deletes accounts) ---
  app.get('/api/users', requireAuth, (req, res) => {
    const actor = getActorUser(req);
    if (actor.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required.' });
      return;
    }
    res.json(db.users.map(sanitizeUser));
  });

  app.post('/api/users', requireAuth, (req, res) => {
    const actor = getActorUser(req);
    if (actor.role !== 'admin') {
      res.status(403).json({ error: 'Only the SSLG President (Admin) can create accounts.' });
      return;
    }
    const { email, password, fullName, role, positionOrClub, department } = req.body as {
      email?: string;
      password?: string;
      fullName?: string;
      role?: UserRole;
      positionOrClub?: string;
      department?: string;
    };
    if (!email || !password || !fullName || !role || !positionOrClub) {
      res.status(400).json({ error: 'Please fill out all required account fields.' });
      return;
    }
    const exists = db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (exists) {
      res.status(409).json({ error: 'An account with this username/email already exists.' });
      return;
    }
    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      email: email.trim().toLowerCase(),
      password,
      fullName: fullName.trim(),
      role,
      positionOrClub: positionOrClub.trim(),
      department: department?.trim() || 'Student Governance',
      active: true,
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    saveDatabase(db);
    res.status(201).json(sanitizeUser(newUser));
  });

  app.patch('/api/users/:id', requireAuth, (req, res) => {
    const actor = getActorUser(req);
    if (actor.role !== 'admin') {
      res.status(403).json({ error: 'Only the SSLG President (Admin) can modify accounts.' });
      return;
    }
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    const { fullName, email, role, positionOrClub, department, active, password } =
      req.body as Partial<UserAccount>;
    if (fullName?.trim()) target.fullName = fullName.trim();
    if (email?.trim()) {
      const normalized = email.trim().toLowerCase();
      const dup = db.users.some((u) => u.id !== target.id && u.email.toLowerCase() === normalized);
      if (dup) {
        res.status(409).json({ error: 'Another account already uses this email.' });
        return;
      }
      target.email = normalized;
    }
    if (role) target.role = role;
    if (positionOrClub?.trim()) target.positionOrClub = positionOrClub.trim();
    if (department?.trim()) target.department = department.trim();
    if (typeof active === 'boolean') target.active = active;
    if (password && password.trim().length >= 4) target.password = password.trim();
    saveDatabase(db);
    res.json(sanitizeUser(target));
  });

  app.delete('/api/users/:id', requireAuth, (req, res) => {
    const actor = getActorUser(req);
    if (actor.role !== 'admin') {
      res.status(403).json({ error: 'Only the SSLG President (Admin) can delete accounts.' });
      return;
    }
    if (req.params.id === actor.id) {
      res.status(400).json({ error: 'You cannot delete your own active Admin account.' });
      return;
    }
    const index = db.users.findIndex((u) => u.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    db.users.splice(index, 1);
    saveDatabase(db);
    res.json({ deleted: true, id: req.params.id });
  });

  // --- DOCUMENTS ---
  app.get('/api/documents', requireAuth, (req, res) => {
    const actor = getActorUser(req);
    let docs = [...db.documents];
    if (actor.role === 'organization') {
      docs = docs.filter(
        (d) =>
          d.submittedByUserId === actor.id ||
          d.organizationName.toLowerCase() === actor.positionOrClub.toLowerCase()
      );
    }
    docs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(docs);
  });

  // Stage 1: Author Submission (Upload prepared PDF/DOCX/Image)
  app.post('/api/documents', requireAuth, upload.single('file'), (req, res) => {
    const actor = getActorUser(req);
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Please upload your prepared document file (PDF, DOCX, or Image).' });
      return;
    }

    const { docType, title, category, coreValue, documentDate, purpose, organizationOverride } =
      req.body as {
        docType?: DocumentModuleType;
        title?: string;
        category?: DocumentCategory;
        coreValue?: CoreValue;
        documentDate?: string;
        purpose?: string;
        organizationOverride?: string;
      };

    if (!title?.trim() || !category || !documentDate) {
      res.status(400).json({ error: 'Document Title, Category, and Date are required.' });
      return;
    }

    const resolvedDocType: DocumentModuleType =
      docType === 'accomplishment' ? 'accomplishment' : 'general';
    const validCoreValues: CoreValue[] = [
      'Maka-Diyos',
      'Maka-Tao',
      'Maka-Kalikasan',
      'Makabansa',
    ];
    const resolvedCoreValue: CoreValue | null =
      resolvedDocType === 'accomplishment'
        ? coreValue && validCoreValues.includes(coreValue)
          ? coreValue
          : 'Maka-Tao'
        : null;

    const now = new Date().toISOString();
    const orgName =
      actor.role === 'organization'
        ? actor.positionOrClub
        : organizationOverride?.trim() || actor.positionOrClub;

    const stage1Event: TransmittalEvent = {
      id: `tr-${Date.now()}`,
      stage: 1,
      stepLabel: 'Stage 1: Uploaded by Author',
      action: 'Submitted',
      actorUserId: actor.id,
      actorName: actor.fullName,
      actorPosition: orgName,
      timestamp: now,
      remarks: purpose?.trim() || 'Prepared file uploaded; awaiting SSLG Officer E-Signature.',
    };

    const newDoc: SSLGDocument = {
      id: `doc-${Date.now()}`,
      docType: resolvedDocType,
      controlNumber: null,
      title: title.trim(),
      category,
      coreValue: resolvedCoreValue,
      documentDate,
      purpose: purpose?.trim() || 'Submitted for SSLG review and e-signature.',
      submittedByUserId: actor.id,
      authorName: actor.fullName,
      organizationName: orgName,
      fileName: file.originalname,
      fileMimeType: file.mimetype,
      filePath: file.filename,
      signedFilePath: null,
      fileSize: file.size,
      currentStage: 1,
      stageLabel: 'Stage 1: Author Submitted',
      printedAt: null,
      printedByName: null,
      transmittalHistory: [stage1Event],
      signatures: [],
      hardcopyScan: null,
      createdAt: now,
      updatedAt: now,
    };

    db.documents.unshift(newDoc);
    saveDatabase(db);
    res.status(201).json(newDoc);
  });

  // Delete uploaded file / record (Author can delete their own uploaded file; Admin can delete any)
  app.delete('/api/documents/:id', requireAuth, (req, res) => {
    const actor = getActorUser(req);
    const idx = db.documents.findIndex((d) => d.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Document record not found.' });
      return;
    }
    const doc = db.documents[idx];
    const isOwner =
      doc.submittedByUserId === actor.id ||
      doc.organizationName.toLowerCase() === actor.positionOrClub.toLowerCase();

    if (actor.role !== 'admin' && !isOwner) {
      res.status(403).json({ error: 'You can only delete files that you uploaded.' });
      return;
    }

    // Remove associated uploaded files if present
    for (const rel of [doc.filePath, doc.signedFilePath, doc.hardcopyScan?.filePath]) {
      if (rel) {
        const fp = path.join(UPLOADS_DIR, path.basename(rel));
        if (fs.existsSync(fp)) {
          try {
            fs.unlinkSync(fp);
          } catch {
            // ignore unlink errors
          }
        }
      }
    }

    db.documents.splice(idx, 1);
    saveDatabase(db);
    res.json({ deleted: true, id: req.params.id });
  });

  // Receive / Move Stage 1 -> Stage 2 (For E-Signature Review)
  app.post('/api/documents/:id/receive-esign', requireAuth, (req, res) => {
    const actor = getActorUser(req);
    if (actor.role === 'organization') {
      res.status(403).json({ error: 'Only SSLG Officers or the SSLG President can receive documents for e-signature.' });
      return;
    }
    const doc = db.documents.find((d) => d.id === req.params.id);
    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }
    const now = new Date().toISOString();
    doc.currentStage = 2;
    doc.stageLabel = 'Stage 2: For E-Signature';
    doc.transmittalHistory.push({
      id: `tr-${Date.now()}`,
      stage: 2,
      stepLabel: 'Stage 2: Received for E-Signature',
      action: 'Received for E-Sign',
      actorUserId: actor.id,
      actorName: actor.fullName,
      actorPosition: actor.positionOrClub,
      timestamp: now,
      remarks: `Received by ${actor.fullName} (${actor.positionOrClub}) for electronic signature.`,
    });
    doc.updatedAt = now;
    saveDatabase(db);
    res.json(doc);
  });

  // Stage 2 -> Stage 3: Apply E-Signature & Automatically Generate Control Number + Unlock Eartag
  app.post('/api/documents/:id/esign', requireAuth, async (req, res) => {
    const actor = getActorUser(req);
    if (actor.role === 'organization') {
      res.status(403).json({ error: 'Only authorized SSLG Officers or the SSLG President can e-sign documents.' });
      return;
    }
    const doc = db.documents.find((d) => d.id === req.params.id);
    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }
    const { signatureDataUrl, remarks } = req.body as {
      signatureDataUrl?: string;
      remarks?: string;
    };

    if (!signatureDataUrl || !signatureDataUrl.startsWith('data:image/png')) {
      res.status(400).json({ error: 'Please draw or upload a valid PNG signature.' });
      return;
    }

    const now = new Date().toISOString();

    // Auto-issue sequential Control Number if not yet assigned
    let newlyIssuedControl = false;
    if (!doc.controlNumber) {
      doc.controlNumber = issueNextControlNumber(doc.docType);
      newlyIssuedControl = true;
    }

    const currentFileRel = doc.signedFilePath || doc.filePath;
    const sourcePath = path.join(UPLOADS_DIR, path.basename(currentFileRel));

    if (fs.existsSync(sourcePath)) {
      const stampedBytes = await stampSignatureOnDocumentPdf({
        sourcePath,
        mimeType: doc.signedFilePath ? 'application/pdf' : doc.fileMimeType,
        doc,
        controlNumber: doc.controlNumber,
        signatureDataUrl,
        signerName: actor.fullName,
        signerPosition: actor.positionOrClub,
        signedAt: now,
      });
      if (stampedBytes) {
        const stampedName = `SIGNED_${doc.controlNumber}_${Date.now()}.pdf`;
        fs.writeFileSync(path.join(UPLOADS_DIR, stampedName), stampedBytes);
        doc.signedFilePath = stampedName;
      }
    }

    doc.signatures.push({
      id: `sig-${Date.now()}`,
      signerUserId: actor.id,
      signerName: actor.fullName,
      signerPosition: actor.positionOrClub,
      signatureDataUrl,
      signedAt: now,
    });

    doc.transmittalHistory.push({
      id: `tr-es-${Date.now()}`,
      stage: 2,
      stepLabel: `Stage 2: Electronically Signed by ${actor.positionOrClub}`,
      action: 'E-Signed',
      actorUserId: actor.id,
      actorName: actor.fullName,
      actorPosition: actor.positionOrClub,
      timestamp: now,
      remarks:
        remarks?.trim() ||
        `Electronically signed and approved by ${actor.fullName} (${actor.positionOrClub}).`,
    });

    if (newlyIssuedControl) {
      doc.transmittalHistory.push({
        id: `tr-cn-${Date.now() + 1}`,
        stage: 3,
        stepLabel: `Stage 3: Control Number ${doc.controlNumber} Issued`,
        action: 'Control Number Issued',
        actorUserId: actor.id,
        actorName: actor.fullName,
        actorPosition: actor.positionOrClub,
        timestamp: now,
        remarks: `Sequential Control Number ${doc.controlNumber} logged in register. Eartag unlocked for printing.`,
      });
    }

    if (doc.currentStage < 3) {
      doc.currentStage = 3;
      doc.stageLabel = 'Stage 3: Control No. & Eartag Ready';
    }
    doc.updatedAt = now;
    saveDatabase(db);
    res.json(doc);
  });

  // Admin: Manually edit or assign Control Number
  app.patch('/api/documents/:id/control-number', requireAuth, (req, res) => {
    const actor = getActorUser(req);
    if (actor.role !== 'admin') {
      res.status(403).json({ error: 'Only the SSLG President (Admin) can assign or edit control numbers.' });
      return;
    }
    const doc = db.documents.find((d) => d.id === req.params.id);
    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }
    const { controlNumber } = req.body as { controlNumber?: string };
    if (!controlNumber?.trim()) {
      res.status(400).json({ error: 'Control number cannot be empty.' });
      return;
    }
    const duplicate = db.documents.some(
      (d) =>
        d.id !== doc.id &&
        d.controlNumber &&
        d.controlNumber.toLowerCase() === controlNumber.trim().toLowerCase()
    );
    if (duplicate) {
      res.status(409).json({ error: 'Another record already uses this control number.' });
      return;
    }
    doc.controlNumber = controlNumber.trim();
    if (doc.currentStage < 3) {
      doc.currentStage = 3;
      doc.stageLabel = 'Stage 3: Control No. & Eartag Ready';
    }
    doc.updatedAt = new Date().toISOString();
    saveDatabase(db);
    res.json(doc);
  });

  // Stage 4: File Printing (Physical Production)
  app.post('/api/documents/:id/mark-printed', requireAuth, (req, res) => {
    const actor = getActorUser(req);
    const doc = db.documents.find((d) => d.id === req.params.id);
    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }
    if (doc.currentStage < 3) {
      res.status(400).json({ error: 'Document must be E-Signed and issued a Control Number (Stage 3) before printing.' });
      return;
    }
    const { remarks } = req.body as { remarks?: string };
    const now = new Date().toISOString();
    doc.printedAt = now;
    doc.printedByName = actor.fullName;
    if (doc.currentStage < 4) {
      doc.currentStage = 4;
      doc.stageLabel = 'Stage 4: Printed for Routing';
    }
    doc.transmittalHistory.push({
      id: `tr-${Date.now()}`,
      stage: 4,
      stepLabel: 'Stage 4: Physical Document & Eartag Printed',
      action: 'Marked Printed',
      actorUserId: actor.id,
      actorName: actor.fullName,
      actorPosition: actor.positionOrClub,
      timestamp: now,
      remarks:
        remarks?.trim() ||
        `Signed document and Eartag (${doc.controlNumber}) printed for physical dry-seal / hardcopy routing.`,
    });
    doc.updatedAt = now;
    saveDatabase(db);
    res.json(doc);
  });

  // Stage 5: Upload Scanned Printed / Approved Copy -> Marks 100% Completed & Archived
  app.post('/api/documents/:id/hardcopy-scan', requireAuth, upload.single('file'), (req, res) => {
    const actor = getActorUser(req);
    const doc = db.documents.find((d) => d.id === req.params.id);
    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }
    if (doc.currentStage < 3) {
      res.status(400).json({ error: 'Document must complete E-Signature & Control Number issuance before archiving the scanned hardcopy.' });
      return;
    }
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Please select a scanned PDF or photo (JPG/PNG).' });
      return;
    }
    const { wetInkSignatories, notes } = req.body as {
      wetInkSignatories?: string;
      notes?: string;
    };
    const now = new Date().toISOString();
    if (!doc.printedAt) {
      doc.printedAt = now;
      doc.printedByName = actor.fullName;
    }
    doc.hardcopyScan = {
      scanId: `scan-${Date.now()}`,
      fileName: file.originalname,
      fileMimeType: file.mimetype,
      filePath: file.filename,
      uploadedByUserId: actor.id,
      uploadedByName: actor.fullName,
      uploadedAt: now,
      wetInkSignatories: wetInkSignatories?.trim() || 'SSLG President & Officers',
      notes: notes?.trim() || 'Final printed and approved copy scanned and archived.',
    };
    doc.currentStage = 5;
    doc.stageLabel = 'Stage 5: Completed & Archived';
    doc.transmittalHistory.push({
      id: `tr-${Date.now()}`,
      stage: 5,
      stepLabel: 'Stage 5: Final Printed Copy Scanned & Archived (100% Complete)',
      action: 'Hardcopy Scan Uploaded',
      actorUserId: actor.id,
      actorName: actor.fullName,
      actorPosition: actor.positionOrClub,
      timestamp: now,
      remarks:
        notes?.trim() ||
        `Scanned final physical copy uploaded (${wetInkSignatories || 'Verified'}). Sent to Signed Hardcopy Scans archive.`,
    });
    doc.updatedAt = now;
    saveDatabase(db);
    res.json(doc);
  });

  // Download or preview document file
  app.get('/api/documents/:id/file', requireAuth, (req, res) => {
    const doc = db.documents.find((d) => d.id === req.params.id);
    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }
    const wantOriginal = req.query.original === 'true';
    const wantDownload = req.query.download === 'true';
    const rel = !wantOriginal && doc.signedFilePath ? doc.signedFilePath : doc.filePath;
    const fullPath = path.join(UPLOADS_DIR, path.basename(rel));
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'Stored document file not found.' });
      return;
    }
    const downloadName =
      !wantOriginal && doc.signedFilePath
        ? `${doc.controlNumber || doc.id}_Signed.pdf`
        : doc.fileName;
    if (wantDownload) {
      res.download(fullPath, downloadName);
    } else {
      if (rel.toLowerCase().endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
      } else if (doc.fileMimeType) {
        res.setHeader('Content-Type', doc.fileMimeType);
      }
      res.setHeader('Content-Disposition', `inline; filename="${downloadName}"`);
      res.sendFile(fullPath);
    }
  });

  app.get('/api/documents/:id/hardcopy-file', requireAuth, (req, res) => {
    const doc = db.documents.find((d) => d.id === req.params.id);
    if (!doc || !doc.hardcopyScan) {
      res.status(404).json({ error: 'Hardcopy scan not found.' });
      return;
    }
    const fullPath = path.join(UPLOADS_DIR, path.basename(doc.hardcopyScan.filePath));
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'Hardcopy scan file missing on disk.' });
      return;
    }
    if (req.query.download === 'true') {
      res.download(fullPath, `${doc.controlNumber || doc.id}_HardcopyScan_${doc.hardcopyScan.fileName}`);
    } else {
      if (doc.hardcopyScan.fileMimeType) {
        res.setHeader('Content-Type', doc.hardcopyScan.fileMimeType);
      }
      res.sendFile(fullPath);
    }
  });

  // --- COMPILATIONS PDF ---
  app.get('/api/compilations/pdf', requireAuth, async (req, res) => {
    const actor = getActorUser(req);
    const periodType = (req.query.periodType as string) || 'annual';
    const year = (req.query.year as string) || '2026';
    const month = (req.query.month as string) || '11';
    const quarter = (req.query.quarter as string) || 'Q4';
    const category = (req.query.category as string) || 'ALL';
    const coreValue = (req.query.coreValue as string) || 'ALL';
    const docType = (req.query.docType as string) || 'ALL';

    let docs = [...db.documents];
    if (actor.role === 'organization') {
      docs = docs.filter(
        (d) =>
          d.submittedByUserId === actor.id ||
          d.organizationName.toLowerCase() === actor.positionOrClub.toLowerCase()
      );
    }

    docs = docs.filter((d) => {
      if (docType !== 'ALL' && d.docType !== docType) return false;
      if (category !== 'ALL' && d.category !== category) return false;
      if (coreValue !== 'ALL' && d.coreValue !== coreValue) return false;
      const [y, m] = d.documentDate.split('-');
      if (y !== year) return false;
      const monthNum = Number(m);
      if (periodType === 'monthly') return monthNum === Number(month);
      if (periodType === 'quarterly') return `Q${Math.ceil(monthNum / 3)}` === quarter;
      return true;
    });

    docs.sort((a, b) => (a.controlNumber || 'ZZZ').localeCompare(b.controlNumber || 'ZZZ'));

    let periodLabel = `Annual ${year}`;
    if (periodType === 'monthly') {
      const monthName = new Date(Number(year), Number(month) - 1, 1).toLocaleString('en-US', {
        month: 'long',
      });
      periodLabel = `${monthName} ${year}`;
    } else if (periodType === 'quarterly') {
      periodLabel = `${quarter} ${year}`;
    }

    const pdfBytes = await compilePeriodicBinderPdf({
      documents: docs,
      uploadsDir: UPLOADS_DIR,
      organizationHeader: db.settings.organizationHeader,
      schoolYear: db.settings.schoolYear,
      periodLabel,
      categoryLabel: category === 'ALL' ? 'All Categories' : category,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="SSLG_Compilation_${periodLabel.replace(/\s+/g, '_')}.pdf"`
    );
    res.send(Buffer.from(pdfBytes));
  });

  // --- 1-CLICK YEAR-END HARDCOPY ARCHIVE PDF ---
  app.get('/api/hardcopy-archive/compile-pdf', requireAuth, async (req, res) => {
    const actor = getActorUser(req);
    let docs = [...db.documents];
    if (actor.role === 'organization') {
      docs = docs.filter(
        (d) =>
          d.submittedByUserId === actor.id ||
          d.organizationName.toLowerCase() === actor.positionOrClub.toLowerCase()
      );
    }

    const pdfBytes = await compileYearEndHardcopyArchivePdf({
      documents: docs,
      uploadsDir: UPLOADS_DIR,
      organizationHeader: db.settings.organizationHeader,
      schoolYear: db.settings.schoolYear,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="SSLG_YearEnd_Hardcopy_Archive_${db.settings.schoolYear}.pdf"`
    );
    res.send(Buffer.from(pdfBytes));
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
