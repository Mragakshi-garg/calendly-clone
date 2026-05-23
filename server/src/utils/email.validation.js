// ============================================================
// FILE: server/src/utils/email.js
//
// WHAT THIS FILE DOES:
//   Layer 1 — Regex: catches obvious junk (no @, no TLD, spaces)
//   Layer 2 — DNS MX check: confirms the DOMAIN can receive mail
//   Layer 3 — SMTP RCPT TO probe: confirms the MAILBOX exists
//             (works on most providers — Yahoo, Outlook, custom)
//             Gmail BLOCKS this probe, so gmail.com falls back
//             to a known-domain allowlist (it's a real provider)
//   Layer 4 — Known disposable domain blocklist (10min mail etc.)
//
// HONEST LIMITATION:
//   Gmail, Google Workspace, and a few others reject SMTP probes
//   for privacy. For those, we trust the domain (gmail.com IS
//   real) but cannot verify the specific inbox without sending
//   an OTP — which is overkill for a scheduling app.
//   This is exactly how tools like Hunter.io / ZeroBounce work.
// ============================================================

const dns  = require('dns').promises;
const net  = require('net');

// ── Layer 4: Known disposable / throwaway email domains ──────
// Add more as needed. These pass MX checks but are spam inboxes.
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com',
  'throwam.com', 'sharklasers.com', 'guerrillamailblock.com',
  'grr.la', 'guerrillamail.info', 'spam4.me', 'trashmail.com',
  'trashmail.me', 'trashmail.net', 'dispostable.com',
  'yopmail.com', 'yopmail.fr', '10minutemail.com',
  '10minutemail.net', 'temp-mail.org', 'fakeinbox.com',
  'maildrop.cc', 'spamgourmet.com', 'spamgourmet.net',
  'spamgourmet.org', 'mytemp.email', 'getnada.com',
  'inboxbear.com', 'discardmail.com', 'spamthisplease.com',
  'mailnull.com', 'spambog.com', 'spamfree24.org',
]);

// ── Providers that block SMTP probes (privacy policy) ────────
// For these we trust the domain check — cannot verify inbox.
const PROBE_BLOCKED_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.co.in', 'yahoo.co.uk',
  'ymail.com', 'rocketmail.com',
]);

// ── Layer 1: Regex format check ──────────────────────────────
function isValidFormat(email) {
  // RFC-5321 compatible — practical subset
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/.test(email);
}

// ── Layer 2: DNS MX record check ─────────────────────────────
async function hasMxRecords(domain) {
  try {
    const records = await dns.resolveMx(domain);
    return records && records.length > 0;
  } catch {
    return false;
  }
}

// ── Layer 3: SMTP RCPT TO probe ──────────────────────────────
// Opens a real SMTP connection to the mail server and asks
// "does this mailbox exist?" without sending an email.
// Returns: 'exists' | 'not_exists' | 'unknown'
function smtpProbe(mxHost, email) {
  return new Promise((resolve) => {
    const socket = net.createConnection(25, mxHost);
    let step = 0;
    let response = '';
    let resolved = false;

    const finish = (result) => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(result);
      }
    };

    // Timeout — if server is slow/blocking, assume unknown
    const timer = setTimeout(() => finish('unknown'), 8000);

    socket.on('data', (data) => {
      response = data.toString();

      if (step === 0 && response.startsWith('220')) {
        // Server greeted us — send HELO
        socket.write('HELO schedulr.verify\r\n');
        step = 1;

      } else if (step === 1 && response.startsWith('250')) {
        // HELO accepted — send MAIL FROM (fake sender)
        socket.write('MAIL FROM:<verify@schedulr.verify>\r\n');
        step = 2;

      } else if (step === 2 && response.startsWith('250')) {
        // MAIL FROM accepted — ask about the recipient
        socket.write(`RCPT TO:<${email}>\r\n`);
        step = 3;

      } else if (step === 3) {
        clearTimeout(timer);
        if (response.startsWith('250') || response.startsWith('251')) {
          // 250/251 = mailbox exists
          finish('exists');
        } else if (response.startsWith('550') || response.startsWith('551') ||
                   response.startsWith('552') || response.startsWith('553') ||
                   response.startsWith('554')) {
          // 55x = user does not exist
          finish('not_exists');
        } else {
          // 4xx = temporary failure, 452 = too many recipients etc.
          // Treat as unknown (don't block the booking)
          finish('unknown');
        }
      }
    });

    socket.on('error', () => { clearTimeout(timer); finish('unknown'); });
    socket.on('timeout', () => { clearTimeout(timer); finish('unknown'); });
  });
}

// ── Master validation function ────────────────────────────────
// Returns { valid: boolean, reason?: string, email?: string }
async function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Email is required.' };
  }

  const trimmed = email.trim().toLowerCase();

  // Layer 1 — format
  if (!isValidFormat(trimmed)) {
    return { valid: false, reason: 'Invalid email format. Use something like john@gmail.com' };
  }

  const domain = trimmed.split('@')[1];

  // Layer 4 — disposable domain check (fast, no network)
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, reason: 'Disposable email addresses are not allowed.' };
  }

  // Layer 2 — DNS MX check
  const mxExists = await hasMxRecords(domain);
  if (!mxExists) {
    return { valid: false, reason: `The domain "${domain}" cannot receive emails. Check for typos.` };
  }

  // Layer 3 — SMTP probe (skip for known probe-blocked providers)
  if (!PROBE_BLOCKED_DOMAINS.has(domain)) {
    try {
      // Get the MX host with highest priority (lowest preference number)
      const mxRecords = await dns.resolveMx(domain);
      mxRecords.sort((a, b) => a.priority - b.priority);
      const mxHost = mxRecords[0].exchange;

      const probeResult = await smtpProbe(mxHost, trimmed);

      if (probeResult === 'not_exists') {
        return {
          valid: false,
          reason: `No mailbox found for "${trimmed}". Double-check the address.`,
        };
      }
      // 'exists' or 'unknown' — both proceed
    } catch {
      // Network error during probe — don't block booking
    }
  }
  // For gmail.com etc. — domain is real, we trust the user

  return { valid: true, email: trimmed };
}

module.exports = { validateEmail };