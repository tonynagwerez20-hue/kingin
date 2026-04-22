const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const LOG_PATH = 'C:\\kingin_debug.log';
function logToDisk(msg) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}\n`;
    try { fs.appendFileSync(LOG_PATH, line); } catch (e) {
        try { fs.appendFileSync(path.join(app.getPath('userData'), 'kingin_debug.log'), line); } catch (e2) {}
    }
}

let mainWindow;
let pyProc = null;

function startPython() {
    logToDisk('--- STARTING BACKEND ---');
    const isDev = !app.isPackaged;
    const script = isDev 
        ? path.join(__dirname, '..', 'kingin_api.py') 
        : path.join(process.resourcesPath, 'kingin_api.py');

    const spawnArgs = [script];
    const spawnOpts = { 
        stdio: 'pipe', 
        cwd: path.dirname(script) 
    };

    const trySpawn = (cmd) => {
        logToDisk(`Attempting spawn: ${cmd} ${script}`);
        const proc = spawn(cmd, spawnArgs, spawnOpts);
        proc.stdout.on('data', (data) => logToDisk(`[PYTHON STDOUT] ${data.toString().trim()}`));
        proc.stderr.on('data', (data) => logToDisk(`[PYTHON STDERR] ${data.toString().trim()}`));
        proc.on('error', (err) => {
            logToDisk(`[SPAWN ERROR] ${cmd} failed: ${err.message}`);
            if (cmd === 'python') trySpawn('python3');
            else if (cmd === 'python3') trySpawn('py');
        });
        proc.on('exit', (code) => logToDisk(`[PYTHON EXIT] Code: ${code}`));
        return proc;
    };
    pyProc = trySpawn('python');
}

app.whenReady().then(() => {
    startPython();
    ipcMain.handle('api-request', async (event, args) => {
        return new Promise((resolve) => {
            const { method, url, data } = args;
            const options = {
                hostname: '127.0.0.1', port: 8088,
                path: url.startsWith('/api') ? url : `/api${url}`,
                method: method.toUpperCase(),
                headers: { 'Content-Type': 'application/json', 'X-Control-Token': 'replit-local-control' }
            };
            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', (c) => body += c);
                res.on('end', () => {
                    try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
                    catch (e) { resolve({ status: res.statusCode, data: body }); }
                });
            });
            req.on('error', (e) => resolve({ status: 500, error: e.message }));
            if (data) req.write(JSON.stringify(data));
            req.end();
        });
    });

    mainWindow = new BrowserWindow({
        width: 1280, height: 800,
        backgroundColor: "#080B12",
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    if (!app.isPackaged) { mainWindow.loadURL('http://localhost:5173'); }
    else { mainWindow.loadFile(path.join(__dirname, '..', 'kingin-vite', 'dist', 'index.html')); }
});

app.on('window-all-closed', () => { if (pyProc) pyProc.kill(); app.quit(); });
