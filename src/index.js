// require('./files')
const { log, getComp } = require('./common')

const { ui: cameraUI } = require('./camera')
const { ui: cutterUI } = require('./cutter')
const { ui: audioUI } = require('./audio')

let visiblePanel = 'camera'
const width = 400

if (that instanceof Panel) {
  win = that
} else {
  // try {
  //   if (win && win instanceof Window) win.close()
  // } catch (e) {}
  // win = new Window('palette', title, undefined, {
  //   resizeable: true,
  // })
}
win.orientation = 'stack'
win.alignChildren = 'top'

try {
  const panels = {
    camera: cameraUI(),
    audio: audioUI(),
    cutter: cutterUI(),
  }

  function showPanel() {
    const panel = panels[win.visiblePanel]
    const x = (width - panel.preferredSize[0] - 30) / 2
    panel.location = [x, 70]
    panel.show()
  }

  try {
    if (win && win.visiblePanel) {
      ({ visiblePanel } = win)
    }
  } catch (e) {
    log(e)
  }

  win.visiblePanel = visiblePanel

  const radios = win.add('panel', undefined, 'What panel to show ?')
  // win.add('staticText', undefined, 'Footage')
  radios.orientation = 'row'
  radios.add('radiobutton', undefined, 'Camera')
  radios.add('radiobutton', undefined, 'Audio')
  radios.add('radiobutton', undefined, 'Cutter')
  // radios.add('radiobutton', undefined, 'Files')
  radios.children.map((radio) => {
    radio.onClick = function () {
      const { text } = this
      panels[win.visiblePanel].hide()
      win.visiblePanel = text.toLowerCase()
      showPanel()
    }
  })

  win.layout.layout(true)

  showPanel()

  app.pluginsPanel = win

  log(getComp('ui').layer('css').mask('Mask')('ADBE Mask Shape'))

  if (win instanceof Window) win.show()
} catch (e) { log(e) }