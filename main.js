const path = require('path');
const { app, BrowserWindow } = require('electron');
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

let mainWindow = null;
let server = null;

function startNextServer() {
  return new Promise((resolve, reject) => {
    const dev = false;
    const nextApp = next({ dev, dir: __dirname });
    const handle = nextApp.getRequestHandler();

    nextApp.prepare().then(() => {
      server = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
      });

      // Listen on localhost only (127.0.0.1) for local security
      server.listen(3000, '127.0.0.1', (err) => {
        if (err) {
          console.error("NextJS Server failed to listen:", err);
          reject(err);
          return;
        }
        console.log('> NextJS Server ready on http://127.0.0.1:3000');
        resolve();
      });
    }).catch(err => {
      console.error("NextJS app prepare failed:", err);
      reject(err);
    });
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

  mainWindow.loadURL('http://127.0.0.1:3000');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  console.log("App ready. Initializing Next.js server...");
  try {
    await startNextServer();
    console.log("Next.js server started. Creating window...");
    createWindow();
  } catch (err) {
    console.error("Failed to start server on ready:", err);
    // Show error in a dialog so user knows what went wrong
    const { dialog } = require('electron');
    dialog.showErrorBox(
      "Erreur de démarrage",
      "Impossible de lancer le serveur local de l'application : " + err.message
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (server) {
    server.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (server) {
    server.close();
  }
});
