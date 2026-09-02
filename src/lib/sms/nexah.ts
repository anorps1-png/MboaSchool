/**
 * Client pour l'API Bulk SMS de Nexah (nexah.net).
 *
 * Nexah fournit user/password/senderid une fois le compte commercial activé,
 * et transmet une documentation technique adaptée à chaque client (via leur
 * équipe technique + groupe WhatsApp de support). Les noms de paramètres et
 * le format de réponse ci-dessous suivent leur API "sendsms" documentée
 * publiquement — à reconfirmer avec la doc reçue de Nexah avant mise en
 * production, au cas où votre compte utilise une variante.
 */

const NEXAH_BASE_URL = process.env.NEXAH_API_URL || 'https://smsvas.com/bulk/public/index.php/api/v1';

export interface NexahRecipientResult {
  mobileno: string;
  messageid?: string;
  status: string;
  errorcode?: string;
  errordescription?: string;
}

export interface NexahSendResult {
  success: boolean;
  results: NexahRecipientResult[];
  raw: unknown;
}

/** Normalise un numéro camerounais vers le format attendu par Nexah (indicatif 237, sans '+'). */
function normalizeMobile(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('237')) return digits;
  if (digits.length === 9) return `237${digits}`;
  return digits;
}

export async function sendSms(mobiles: string[], message: string, senderId?: string): Promise<NexahSendResult> {
  const user = process.env.NEXAH_USER;
  const password = process.env.NEXAH_PASSWORD;
  const sender = senderId || process.env.NEXAH_SENDER_ID;

  if (!user || !password || !sender) {
    throw new Error('Configuration Nexah manquante : NEXAH_USER, NEXAH_PASSWORD et NEXAH_SENDER_ID doivent être renseignés.');
  }

  const normalizedMobiles = Array.from(new Set(mobiles.map(normalizeMobile).filter(m => m.length >= 11)));
  if (normalizedMobiles.length === 0) {
    throw new Error('Aucun numéro de téléphone valide à contacter.');
  }

  const params = new URLSearchParams({
    user,
    password,
    senderid: sender,
    sms: message,
    mobiles: normalizedMobiles.join(','),
  });

  const response = await fetch(`${NEXAH_BASE_URL}/sendsms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Nexah a répondu avec le statut HTTP ${response.status}`);
  }

  const data = await response.json();
  const list: any[] = Array.isArray(data) ? data : (data?.result ?? data?.data ?? [data]);

  const results: NexahRecipientResult[] = list.map((r: any) => ({
    mobileno: r.mobileno ?? r.mobile ?? '',
    messageid: r.messageid,
    status: r.status ?? (String(r.responsecode) === '1' ? 'Success' : 'Failure'),
    errorcode: r.errorcode,
    errordescription: r.errordescription,
  }));

  const success = results.length > 0 && results.every(
    r => String(r.status).toLowerCase().includes('success') || r.errorcode === '000'
  );

  return { success, results, raw: data };
}
