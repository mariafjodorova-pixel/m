// Local preview: node serve.mjs [dir=.] [--port 8080]   (Range requests supported, so videos play)
import { startServer, args } from './_lib.mjs';
const a = args();
const { url } = await startServer(a._[0] || '.', +(a.port || 8080));
console.log(`serving ${a._[0] || '.'} at ${url}  (Ctrl+C to stop)`);
