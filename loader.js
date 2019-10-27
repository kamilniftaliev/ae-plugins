const path = require('path')
const { exec } = require('child_process')

const file = path.resolve(__dirname, './dist')
exec(`xcopy "${file}" "C:\\ae" /e /y`)
exec(`%afterfx% -ro -debug ${file}/Plugins.jsx`)
