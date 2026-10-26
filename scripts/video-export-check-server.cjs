// Local-only browser integration harness; no project sessions or user media are read.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const modules = path.join(root, 'node_modules', 'mediabunny', 'dist', 'modules');
const port = Number(process.env.EXPORT_CHECK_PORT || 3102);
function compile(file) {
  return ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText.replace(/from ["']mediabunny["']/g, 'from "/mediabunny/src/index.js"');
}
function page() {
  const bundle = fs.readFileSync(path.join(root, 'node_modules', 'mediabunny', 'dist', 'bundles', 'mediabunny.min.cjs'), 'utf8');
  const video = compile('lib/videoExport.ts').replace(/^import[\s\S]*?from "\/mediabunny\/src\/index.js";\s*/, '').replace(/^export /gm, '');
  const narration = compile('lib/narration.ts').replace(/^export /gm, '');
  const code = `const module = { exports: {} };\n${bundle}\nconst { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, Quality, WebMOutputFormat, canEncodeAudio, canEncodeVideo, AudioBufferSink } = module.exports;\n${video}\n${narration}`.replace(/<\/script/gi, '<\\/script');
  return fs.readFileSync(path.join(__dirname, 'video-export-check.html'), 'utf8').replace('// TEST_MODULES', code);
}
http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  response.setHeader('Cache-Control', 'no-store');
  try {
    if (pathname === '/') { response.setHeader('Content-Type', 'text/html'); response.end(page()); }
    else if (pathname === '/videoExport.js' || pathname === '/narration.js') {
      response.setHeader('Content-Type', 'text/javascript'); response.end(compile(`lib/${pathname.slice(1, -3)}.ts`));
    } else if (pathname.startsWith('/mediabunny/')) {
      const file = path.resolve(modules, pathname.slice('/mediabunny/'.length));
      const relative = path.relative(modules, file);
      if (relative.startsWith('..') || path.isAbsolute(relative) || !file.endsWith('.js')) { response.writeHead(403); response.end(); return; }
      response.setHeader('Content-Type', 'text/javascript'); response.end(fs.readFileSync(file));
    } else { response.writeHead(404); response.end(); }
  } catch (error) { console.error(pathname, error.message); response.writeHead(500); response.end(error.message); }
}).listen(port, '127.0.0.1', () => console.log(`Export check: http://127.0.0.1:${port}`));
