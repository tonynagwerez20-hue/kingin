const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pyProc = null;

function startPython() {
  const isDev = !app.isPackaged;
  console.log(`Starting Python backend (isDev: ${isDev})...`);
  
  let script;
  if (isDev) {
    script = path.join(__dirname, '..', 'kingin_api.py');
  } else {
    // In production, the file is in resources/app/
    script = path.join(process.resourcesPath, 'app', 'kingin_api.py');
    // Fallback if not in resources/app/
    if (!require('fs').existsSync(script)) {
       script = path.join(app.getAppPath(), 'kingin_api.py');
    }
  }

  console.log(`Script path: ${script}`);
  
  pyProc = spawn('python', [script], {
    stdio: 'inherit',
    shell: true
  });

  pyProc.on('error', (err) => {
    console.error('CRITICAL: Failed to start Python backend:', err);
  });

  pyProc.on('exit', (code) => {
    console.log(`Python backend exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "KingIn Institutional Trading System",
    backgroundColor: "#080B12",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'kingin-vite', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  startPython();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (pyProc) {
    console.log('Killing Python backend...');
    pyProc.kill();
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (pyProc) {
    pyProc.kill();
  }
});
