import crypto from 'crypto';
import mongoose from 'mongoose';
import Case from '../models/Case.js';

export const authenticate = async (req, res, next) => {
  try {
    const caseId = req.params.id;

    // 1. Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid case ID format.',
        code: 'INVALID_CASE_ID',
      });
    }

    // 2. Extract X-Session-Token header
    const token = req.headers['x-session-token'];

    // 3. Validate presence and format
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Session token required.',
        code: 'MISSING_SESSION_TOKEN',
      });
    }

    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({
        success: false,
        error: 'Malformed session token format.',
        code: 'MALFORMED_SESSION_TOKEN',
      });
    }

    // 4. Retrieve case document excluding solution and including sessionTokenHash
    const caseDoc = await Case.findById(caseId).select('-solution +sessionTokenHash');
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        error: 'Case not found.',
        code: 'CASE_NOT_FOUND',
      });
    }

    // 5. Compute SHA-256 digest of incoming raw token
    const incomingHash = crypto.createHash('sha256').update(token).digest('hex');

    // 6. Constant-time comparison
    const incomingBuf = Buffer.from(incomingHash, 'hex');
    const storedBuf = Buffer.from(caseDoc.sessionTokenHash, 'hex');

    const isMatch =
      incomingBuf.length === storedBuf.length &&
      crypto.timingSafeEqual(incomingBuf, storedBuf);

    if (!isMatch) {
      return res.status(403).json({
        success: false,
        error: 'Invalid session token.',
        code: 'INVALID_SESSION_TOKEN',
      });
    }

    // 7. Mutating route check on completed cases
    const isMutating = req.method === 'POST';
    if (isMutating && caseDoc.status === 'completed') {
      return res.status(403).json({
        success: false,
        error: 'This case is already completed.',
        code: 'CASE_ALREADY_COMPLETED',
      });
    }

    // 8. Attach sanitized plain object to req.case
    const sanitizedObj = caseDoc.toObject();
    delete sanitizedObj.sessionTokenHash;
    delete sanitizedObj.solution;

    req.case = sanitizedObj;
    req.caseDoc = caseDoc;

    next();
  } catch (error) {
    next(error);
  }
};

export default authenticate;
