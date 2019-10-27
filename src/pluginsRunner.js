const pluginCommand = app.findMenuCommandId('Plugins.jsx')
if (pluginCommand) {
  if (typeof app.pluginsPanel === 'object') {
    try {
      if (app.pluginsPanel.visible) {
        app.executeCommand(pluginCommand)
        app.executeCommand(pluginCommand)
      }
    } catch (e) {
      app.executeCommand(pluginCommand)
      app.executeCommand(pluginCommand)
    }
  } else {
    app.executeCommand(pluginCommand)
  }
} else if (app.project.items.length) {
  alert('Copy "DIST" folder to After Effects "Script UI" folder')
}
