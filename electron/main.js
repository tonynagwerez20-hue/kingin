const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pyProc = null;

function startPython() {
  const isDev = !app.isPackaged;
  const fs = require('fs');
  
  let script;
  if (isDev) {
    script = path.join(__dirname, '..', 'kingin_api.py');
  } else {
    // In production, the file is in resources/app/
    const possiblePaths = [
      path.join(process.resourcesPath, 'app', 'kingin_api.py'),
      path.join(app.getAppPath(), 'kingin_api.py'),
      path.join(__dirname, '..', 'kingin_api.py'),
    ];
    
    script = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
  }

  console.log(`[Main] Starting Python backend. Script: ${script}`);
  
  if (!fs.existsSync(script)) {
    console.error(`[Main] CRITICAL: Backend script not found at ${script}`);
  }

  // Try 'python', then 'python3' as fallback
  const spawnOptions = { stdio: 'inherit', shell: true };
  
  try {
    pyProc = spawn('python', [script], spawnOptions);
    
    pyProc.on('error', (err) => {
      console.warn('[Main] Failed to start with "python", trying "python3"...');
      pyProc = spawn('python3', [script], spawnOptions);
      
      pyProc.on('error', (err2) => {
        console.error('[Main] CRITICAL: Failed to start Python backend with both "python" and "python3":', err2);
      });
    });

    pyProc.on('exit', (code) => {
      console.log(`[Main] Python backend exited with code ${code}`);
    });
  } catch (err) {
    console.error('[Main] Unexpected error during backend spawn:', err);
  }
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
