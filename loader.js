const path = require('path')
const { exec } = require('child_process')
const fsExtra = require('fs-extra')

const pluginMainFile = '/Tutorial.jsx'
const pluginsFolder = path.resolve(__dirname, './dist')
const scriptsPath = `${process.env.AE_PATH}Scripts/ScriptUI Panels`

fsExtra.copy(pluginsFolder, scriptsPath).catch(console.error)

exec(`"%AE_PATH%afterfx.exe" -ro -debug ${scriptsPath}${pluginMainFile}`)
