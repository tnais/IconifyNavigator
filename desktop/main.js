const { app, BrowserWindow, shell } = require('electron');
const fs = require('fs');
const path = require('path');

function resolveAngularIndexPath() {
  const candidates = [
    path.join(__dirname, '..', 'dist', 'iconifynavigator', 'browser', 'index.html'),
    path.join(__dirname, '..', 'dist', 'iconifynavigator', 'index.html')
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const angularIndexPath = resolveAngularIndexPath();
  if (!angularIndexPath) {
    mainWindow.loadURL('data:text/plain,Angular build output not found. Run npm run build first.');
    return;
  }

  mainWindow.loadFile(angularIndexPath);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
