const { log } = require('./common');
const { ui: cameraUI } = require('./camera');
const { ui: cutterUI } = require('./cutter');
const { ui: audioUI } = require('./audio');

let win = new Window('palette', 'Tutorial', undefined, { resizeable: true });

if (that instanceof Panel) {
  win = that;
} else if (app.pluginsPanel instanceof Panel) {
  win = app.pluginsPanel;
}

if (win.menu) win.remove(win.menu);
if (win.pluginsContainer) win.remove(win.pluginsContainer);
app.pluginsPanel = win;

win.alignChildren = 'fill';

win.menu = win.add('group');
win.pluginsContainer = win.add('group');
if (!win.visiblePanel) win.visiblePanel = 'camera';

const panels = {
  camera: cameraUI(),
  audio: audioUI(),
  cutter: cutterUI(),
};

function showPanel(newPanelName = win.visiblePanel) {
  panels[win.visiblePanel].hide()
  const panel = panels[newPanelName];
  const winCenter = win.windowBounds.width / 2;

  // Panel positioning
  const panelWidth = panel.preferredSize[0];
  const width = panelWidth < 100 ? 400 : panelWidth;
  const panelPositionX = winCenter - width / 2;
  panel.location = [panelPositionX, 0];

  const menuWidth = win.menu.windowBounds.width / 6
  win.menu.location = [winCenter - menuWidth, 0];

  panel.show();
  win.visiblePanel = newPanelName;
}

function showWindow() {
  win.layout.layout(true);

  // Hide all other panels
  Object.keys(panels).forEach(p => panels[p].hide())

  if (win instanceof Window) win.show();
}

function renderMenu() {
  const winVerticalCenter = win.windowBounds.height / 7;
  win.menu.margins = [50, winVerticalCenter, 0, 10]

  win.menu.add('radiobutton', undefined, 'Camera');
  win.menu.add('radiobutton', undefined, 'Audio');
  win.menu.add('radiobutton', undefined, 'Cutter');
  win.menu.children.forEach((radio) => {
    const text = radio.text.toLowerCase();
    radio.value = text === win.visiblePanel;
    radio.onClick = function () {
      showPanel(text);
    };
  });
}

try {
  renderMenu();
  showWindow();
  showPanel();
} catch (e) {
  log(e);
}
