import crypto from 'node:crypto';
import { config } from '../config.js';

// Versioned authenticated envelope; legacy unencrypted files remain readable.
const MAGIC = Buffer.from('JADARADOC1\0');
export function encryptDocument(bytes) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(config.encryptionKey, 'hex'), iv);
  cipher.setAAD(MAGIC);
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), encrypted]);
}
export function decryptDocument(bytes) {
  if (!bytes.subarray(0, MAGIC.length).equals(MAGIC)) return bytes;
  if (bytes.length < MAGIC.length + 28) throw new Error('invalid_document');
  const offset = MAGIC.length;
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(config.encryptionKey, 'hex'), bytes.subarray(offset, offset + 12));
  decipher.setAAD(MAGIC);
  decipher.setAuthTag(bytes.subarray(offset + 12, offset + 28));
  return Buffer.concat([decipher.update(bytes.subarray(offset + 28)), decipher.final()]);
}