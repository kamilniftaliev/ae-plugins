const { log } = require('./common')

const btn = {}

function buildUI(init) {
  btn.load = app.pluginsPanel.add('button', undefined, 'Load Tutorial Plugin')
  // btn.load.alignment = 'bottom'

  btn.load.onClick = init

  btn.load.hide()
  
  return btn.load
}

exports.ui = buildUI;