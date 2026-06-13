const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, dialog } = require('electron');
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

let mainWindow = null;
let server = null;
let logPath = null;

// Initialize logging folder and file
try {
  const userDataPath = app.getPath('userData');
  logPath = path.join(userDataPath, 'app.log');
  fs.writeFileSync(logPath, `${new Date().toISOString()} - Application started\n`);
} catch (e) {
  console.error("Failed to initialize log file", e);
}

function log(msg) {
  const line = `${new Date().toISOString()} - ${msg}`;
  console.log(line);
  if (logPath) {
    try {
      fs.appendFileSync(logPath, line + '\n');
    } catch (e) {}
  }
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    log("Starting Next.js initialization...");
    const dev = false;
    const nextApp = next({ dev, dir: __dirname });
    const handle = nextApp.getRequestHandler();

    // Set a safety timeout to prevent infinite hanging
    const timeout = setTimeout(() => {
      log("Next.js server prepare timeout reached (15s). Resolving anyway to open window.");
      resolve();
    }, 15000);

    log("Calling nextApp.prepare()...");
    nextApp.prepare().then(() => {
      log("Next.js prepare completed successfully.");
      server = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
      });

      server.on('error', (err) => {
        log(`HTTP Server error occurred: ${err.message}`);
        clearTimeout(timeout);
        reject(err);
      });

      log("Listening on http://127.0.0.1:3000...");
      server.listen(3000, '127.0.0.1', () => {
        log("HTTP Server is listening successfully.");
        clearTimeout(timeout);
        resolve();
      });
    }).catch(err => {
      log(`Next.js prepare failed: ${err.message}`);
      clearTimeout(timeout);
      reject(err);
    });
  });
}

function createWindow() {
  log("Creating BrowserWindow...");
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

  log("Loading URL http://127.0.0.1:3000...");
  mainWindow.loadURL('http://127.0.0.1:3000');

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log(`Window failed to load page: ${errorDescription} (${errorCode})`);
  });

  mainWindow.on('closed', () => {
    log("BrowserWindow closed.");
    mainWindow = null;
  });
}

app.on('ready', async () => {
  log("Electron app ready event received.");
  try {
    await startNextServer();
    log("Server start routine finished. Creating window...");
    createWindow();
  } catch (err) {
    log(`Critical server launch error: ${err.message}`);
    dialog.showErrorBox(
      "Erreur de démarrage",
      "Impossible de lancer le serveur local de l'application : " + err.message
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  log("All windows closed.");
  if (server) {
    log("Closing HTTP server...");
    server.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  log("Application quitting.");
  if (server) {
    server.close();
  }
});
