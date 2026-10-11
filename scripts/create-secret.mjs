import { randomBytes } from 'node:crypto';
import process from 'node:process';
// Stampare solo una chiave nuova, mai leggere o mostrare segreti già configurati.
process.stdout.write(randomBytes(32).toString('base64') + '\n');
