export const ALLOWED_PUBLIC_ERRORS = {
  VALIDATION_ERROR: { status: 400, message: 'Request validation failed.' },
  INVALID_CASE_ID: { status: 400, message: 'Invalid case ID format.' },
  INVALID_CLUE_ID: { status: 400, message: 'Invalid clue ID format.' },
  MALFORMED_SESSION_TOKEN: { status: 400, message: 'Malformed session token format.' },
  INVALID_SUSPECT_ID: { status: 400, message: 'Invalid suspect ID.' },
  CLUE_ALREADY_DISCOVERED: { status: 400, message: 'Clue already discovered.' },
  SEQUENTIAL_ORDER_VIOLATION: { status: 400, message: 'Discover previous clues first.' },
  NO_HINTS_REMAINING: { status: 400, message: 'No hints remaining.' },
  MISSING_SESSION_TOKEN: { status: 401, message: 'Session token required.' },
  INVALID_SESSION_TOKEN: { status: 403, message: 'Invalid session token.' },
  CASE_ALREADY_COMPLETED: { status: 403, message: 'This case is already completed.' },
  RESULT_NOT_AVAILABLE: { status: 403, message: 'Results not available until accusation is submitted.' },
  CASE_NOT_FOUND: { status: 404, message: 'Case not found.' },
  RATE_LIMIT_EXCEEDED: { status: 429, message: 'Too many requests. Please wait before trying again.' },
  AI_GENERATION_FAILED: { status: 502, message: 'Failed to generate a valid mystery. Please try again.' },
};

export const errorHandler = (err, req, res, next) => {
  // Redact secrets, keys, and tokens before logging server-side
  const rawLog = `${err.message || ''} ${err.stack || ''}`;
  const sanitizedLog = rawLog
    .replace(/AIza[0-9A-Za-z-_]{35}/g, 'AIza[REDACTED_API_KEY]')
    .replace(/[a-f0-9]{64}/gi, '[REDACTED_TOKEN]')
    .replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, 'mongodb://[REDACTED_URI]');

  console.error(`[${new Date().toISOString()}] ${sanitizedLog}`);

  // Enforce consistent HTTP status, machine code, and safe public message mapping
  let publicCode = 'INTERNAL_SERVER_ERROR';
  let publicMessage = 'Internal server error.';
  let status = 500;

  if (err.code && ALLOWED_PUBLIC_ERRORS[err.code]) {
    publicCode = err.code;
    publicMessage = ALLOWED_PUBLIC_ERRORS[err.code].message;
    status = ALLOWED_PUBLIC_ERRORS[err.code].status;
  } else {
    // Unknown or unallowlisted errors receive strictly generic safe messages.
    // Under NO circumstances is internal err.message reflected to the client.
    const rawStatus = err.statusCode || (typeof err.status === 'number' ? err.status : null);
    if (rawStatus === 400 || err.name === 'ZodError') {
      status = 400;
      publicCode = 'VALIDATION_ERROR';
      publicMessage = 'Request validation failed.';
    }
  }

  res.status(status).json({
    success: false,
    error: publicMessage,
    code: publicCode,
  });
};

export default errorHandler;
