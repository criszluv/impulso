const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const address = 'http://localhost:5180/';
function inspect() {
  return new Promise(resolve => {
    const request = http.get('http://127.0.0.1:5180/', response => {
      let body = '';
      response.on('data', chunk => body += chunk);
      response.on('end', () => resolve(body.includes('Impulso') ? 'impulso' : 'other'));
    });
    request.setTimeout(1500, () => request.destroy());
    request.on('error', () => resolve('offline'));
  });
}
async function main() {
  let status = await inspect();
  if (status === 'other') throw new Error('El puerto local 5180 esta ocupado por otra aplicacion. Cierra esa aplicacion e intenta nuevamente.');
  if (status === 'offline') {
    const log = fs.openSync(path.join(os.tmpdir(), 'impulso-launcher.log'), 'a');
    const child = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5180', '--strictPort'], { cwd: root, detached: true, windowsHide: true, stdio: ['ignore', log, log] });
    child.unref();
    fs.closeSync(log);
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      status = await inspect();
      if (status !== 'offline') break;
    }
  }
  if (status !== 'impulso') throw new Error('No pudimos abrir Impulso. Revisa el archivo impulso-launcher.log en la carpeta temporal de Windows.');
  const opener = spawn('cmd.exe', ['/c', 'start', '', address], { detached: true, windowsHide: true, stdio: 'ignore' });
  opener.unref();
  console.log('Impulso esta listo en '+address+' Puedes cerrar esta ventana.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
