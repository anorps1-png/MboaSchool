const { spawn } = require('child_process');
const path = require('path');
const { app, BrowserWindow } = require('electron');

let nextProcess = null;
let mainWindow = null;

function startNextServer() {
  return new Promise((resolve) => {
    // Determine the next command path
    const nextCmd = process.platform === 'win32' ? 'next.cmd' : 'next';
    const nextBin = path.join(__dirname, 'node_modules', '.bin', nextCmd);
    
    console.log("Starting Next.js server from:", nextBin);
    
    // Spawn the next start process
    nextProcess = spawn(nextBin, ['start', '-p', '3000'], {
      cwd: __dirname,
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    });

    nextProcess.stdout.on('data', (data) => {
      console.log(`[NextJS Output]: ${data}`);
      if (data.toString().includes('Ready') || data.toString().includes('started')) {
        resolve();
      }
    });

    nextProcess.stderr.on('data', (data) => {
      console.error(`[NextJS Error]: ${data}`);
    });

    // Fallback: resolve after 6 seconds just in case
    setTimeout(resolve, 6000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    title: "MboaSchool - Gestion Scolaire",
    autoHideMenuBar: true
  });

  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  console.log("App ready. Spawning Next.js...");
  await startNextServer();
  console.log("Next.js started. Creating window...");
  createWindow();
});

app.on('window-all-closed', () => {
  if (nextProcess) {
    nextProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (nextProcess) {
    nextProcess.kill();
  }
});
