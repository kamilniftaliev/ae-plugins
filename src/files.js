const { log, scaleExpression, getComp } = require('./common')

const config = {
  iconSize: 700,
  iconSpace: 400,
  topMargin: 500,
  fontSize: 48,
  iconScaleTime: 0.25,
  lineDrawTime: 0.5,
  coloredStrokeWidth: 15,
  coloredStrokeSpace: 30,
  fileNameStroke: 10,

  colors: {
    html: [0.89, 0.30, 0.14],
    css: [0.14, 0.30, 0.89],
    js: [0.96, 0.87, 0.11],
    folder: [50, 255, 0],
  },
}
const btn = {}
const input = {}
const filesHistory = []
let win;
let FilesComp;

function buildUI(self) {
  const {
    iconSize,
    topMargin,
    iconScaleTime,
    lineDrawTime,
  } = config
  win = (self instanceof Panel) ? self : new Window('palette', 'Files', undefined, { resizeable: true })

  win.iconSize = win.add('group')
  win.iconSize.add('staticText', undefined, 'Icon Size')
  input.iconSize = win.iconSize.add('edittext', [0, 0, 50, 20], iconSize)

  win.topMargin = win.add('group')
  win.topMargin.add('staticText', undefined, 'First item`s Top Margin')
  input.topMargin = win.topMargin.add('edittext', [0, 0, 50, 20], topMargin)

  win.iconScaleTime = win.add('group')
  win.iconScaleTime.add('staticText', undefined, 'An Icon`s scale time')
  input.iconScaleTime = win.iconScaleTime.add('edittext', [0, 0, 50, 20], iconScaleTime)
  
  win.lineDrawTime = win.add('group')
  win.lineDrawTime.add('staticText', undefined, 'A line`s draw time')
  input.lineDrawTime = win.lineDrawTime.add('edittext', [0, 0, 50, 20], lineDrawTime)

  // win.points = win.add('group')
  // var startPointFile = File('./icons/startPoint.png')
  // iconButtons.startPoint = win.points.add('iconbutton', [0, 0, 20, 20], startPointFile, { style: 'toolbutton', toggle: true })

  win.buildFiles = win.add('group')
  btn.buildFiles = win.buildFiles.add('button', undefined, 'Build files')
  btn.buildFiles.onClick = () => {
    config.iconSize = parseInt(input.iconSize.text, 10)
    config.iconSpace = config.iconSize * 2
    config.topMargin = parseInt(input.topMargin.text, 10)
    config.iconScaleTime = parseFloat(input.iconScaleTime.text)
    config.lineDrawTime = parseFloat(input.lineDrawTime.text)
    config.coloredStrokeWidth = parseInt(config.iconSize / 13, 10)
    config.coloredStrokeSpace = config.coloredStrokeWidth * 2
    config.fileNameStroke = parseInt(config.iconSize / 20, 10)

    resetFilesComp()
    buildFiles()
  }

  win.layout.layout(true)
  
  if (win !== self) win.show()
}

function centerAnchor(layer) {
  const {
    width: anchorWidth,
    height: anchorHeight,
    left: anchorLeft,
    top: anchorTop,
  } = layer.sourceRectAtTime(0, false)

  const anchorCenter = [anchorWidth / 2 + anchorLeft, anchorHeight / 2  + anchorTop]
  layer.property('anchorPoint').setValue(anchorCenter)
}

let allChildrenCount = 0
function getAllChildrenCount(children) {
  children.map(({ children }) => {
    allChildrenCount++
    if (children) getAllChildrenCount(children)
  })
}

function clearFilesComp() {
  for (let i = 1; i <= FilesComp.numLayers; i++) {
    const layer = FilesComp.layer(i)
    if (layer.name !== 'json') {
      layer.remove()
      i--
    }
  }
}

function resetFilesComp() {
  if (!FilesComp) FilesComp = getComp('Files')
  FilesComp.layer('json').selected = true
  clearFilesComp()
}

function applyLinePath({
  layer,
  shape,
  pathName,
  startTime = 0,
  width = 5,
  color = [255, 255, 255],
  opacity = 100,
  time,
  existed,
}) {
  const { lineDrawTime } = config
  if (existed) {
    layer.Contents(pathName).content('ADBE Vector Shape - Group')('ADBE Vector Shape').addKey(time)
    startTime = time + lineDrawTime
  }
  layer.Contents(pathName).content('ADBE Vector Shape - Group')('ADBE Vector Shape').setValueAtTime(startTime, shape)
  if (existed) return
  layer.Contents(pathName).content('ADBE Vector Filter - Trim')('ADBE Vector Trim End').setValueAtTime(startTime, 0)
  layer.Contents(pathName).content('ADBE Vector Filter - Trim')('ADBE Vector Trim End').setValueAtTime(startTime + lineDrawTime, 100)
  layer.Contents(pathName).content('ADBE Vector Graphic - Stroke')('ADBE Vector Stroke Width').setValueAtTime(startTime, width)
  layer.Contents(pathName).content('ADBE Vector Graphic - Stroke')('ADBE Vector Stroke Opacity').setValueAtTime(startTime, opacity)
  layer.Contents(pathName).content('ADBE Vector Graphic - Stroke')('ADBE Vector Stroke Color').setValueAtTime(startTime, color)
}

function drawShape({
  name,
  x,
  y,
  type,
  index,
  layer,
}, parent, time) {
  if (!parent) return

  const {
    iconSize,
    iconSpace,
    colors,
    lineDrawTime,
    coloredStrokeWidth,
    coloredStrokeSpace,
  } = config
  const { startTime, existed } = layer

  const rowItemsCount = parent.children.length
  const parentScaleEndTime = parent.layer.startTime + config.iconScaleTime
  const layerName = `${name} - shape`
  const shapePathLayer = FilesComp.layer(layerName) || FilesComp.layers.addShape()

  if (!existed) {
    shapePathLayer.startTime = startTime + parentScaleEndTime
    shapePathLayer.name = layerName
    shapePathLayer.applyPreset(File('./src/presets/files/shape.ffx'))
  }

  const weakLineShape = new Shape()
  if (rowItemsCount === 1) {
    weakLineShape.vertices = [[0, -y + iconSize * 1.3], [0, -iconSize * 1.5]]
  } else {
    const rowWidth = (rowItemsCount - 1) * coloredStrokeSpace
    const fromX = -((FilesComp.width / 2) - parent.x) - rowWidth + index * (coloredStrokeSpace * 2)
    const fromY = -((FilesComp.height / 2) - parent.y) + iconSize - 50
    const toX = -((FilesComp.width / 2) - x)
    const toY = -((FilesComp.height / 2) - y)
    const middleY = ((fromY + toY) / 2) * 1.3
    weakLineShape.vertices = [
      [fromX, fromY],
      [fromX, middleY],
      [toX, middleY],
      [toX, toY],
    ]
  }
  weakLineShape.closed = false;

  const coloredLineStartTime = shapePathLayer.startTime + lineDrawTime
  const saturationStart = coloredLineStartTime + lineDrawTime * 0.8

  const colorBalance = layer.Effects.addProperty('Color Balance (HLS)')
  colorBalance.property('saturation').setValueAtTime(saturationStart, -100)
  colorBalance.property('saturation').setValueAtTime(saturationStart + 0.5, 100)

  applyLinePath({
    layer: shapePathLayer,
    shape: weakLineShape,
    pathName: 'Weak Line',
    opacity: 50,
    startTime: shapePathLayer.startTime,
    width: coloredStrokeWidth / 2,
    existed,
    time,
  })
  applyLinePath({
    layer: shapePathLayer,
    shape: weakLineShape,
    pathName: 'Colored Line',
    color: colors[type],
    startTime: coloredLineStartTime,
    existed,
    width: coloredStrokeWidth,
    time,
  })
  applyLinePath({
    layer: shapePathLayer,
    shape: weakLineShape,
    pathName: 'Shadowing Line',
    color: colors[type],
    opacity: 10,
    startTime: coloredLineStartTime,
    existed,
    width: coloredStrokeWidth * 4,
    time,
  })
  shapePathLayer.moveToEnd()
}

function writeFileName({
  name,
  layer,
  x,
  y,
  startTime,
}, time) {
  const {
    iconScaleTime,
    lineDrawTime,
    iconSize,
    fileNameStroke,
  } = config
  const { existed } = layer
  const fileNameY = y + iconSize * 0.8
  const layerName = `${name} - title`
  const fileNameLayer = FilesComp.layer(layerName) || FilesComp.layers.addText(name)

  if (!existed) {
    const scaleStartTime = layer.startTime + fileNameLayer.startTime + lineDrawTime
    const scaleEndTime = scaleStartTime + iconScaleTime
    fileNameLayer.applyPreset(File('./src/presets/files/filename.ffx'))
    fileNameLayer.startTime = layer.startTime
    fileNameLayer.name = layerName
    fileNameLayer.fillColor = [0, 0, 0]
    fileNameLayer.property('Layer Styles').property('Stroke').property('Size').setValue(fileNameStroke)
    
    const scale = (70 / (iconSize / 20)) * 100
    // log(scale)
    centerAnchor(fileNameLayer)
    fileNameLayer.property('scale').setValueAtTime(scaleStartTime, [0, 0])
    fileNameLayer.property('scale').setValueAtTime(scaleEndTime, [scale, scale])
  }

  if (existed) fileNameLayer.property('position').addKey(time)
  fileNameLayer.property('position').setValueAtTime(startTime, [x, fileNameY])
}

function drawIcon({ fileLayer, startTime, icon }) {
  const {
    iconSize,
    iconScaleTime,
    lineDrawTime,
    fileNameStroke,
  } = config
  const scale = (iconSize / icon.width) * 100

  fileLayer.sizes = fileLayer.sourceRectAtTime(0, false)
  const scaleStartTime = startTime + lineDrawTime
  const scaleEndTime = scaleStartTime + iconScaleTime
  const fileIconScale = fileLayer.property('scale')
  fileIconScale.setValueAtTime(scaleStartTime, [0, 0])
  fileIconScale.setValueAtTime(scaleEndTime, [scale, scale])
  fileIconScale.expression = scaleExpression
  fileLayer.property('Layer Styles').property('Stroke').property('Size').setValue(fileNameStroke)
}

function getPosition({
  child: { layer: { existed }},
  isFirstKey,
  parent,
  index,
  time,
}) {
  const {
    iconScaleTime,
    lineDrawTime,
    iconSize,
    topMargin,
    iconSpace,
  } = config

  const horizontalCenter = FilesComp.width / 2
  let x = horizontalCenter
  let y = topMargin
  let startTime = time
  if (existed) startTime += lineDrawTime

  if (parent) {
    const rowItemsCount = parent.children.length

    // If didn't existed and it's not first "JSON" key
    if (!existed && isFirstKey) startTime += parent.layer.startTime + iconScaleTime + lineDrawTime

    const parentPosition = parent.layer.property('position').valueAtTime(startTime, true)
    y += parentPosition[1] + iconSpace
    x = parentPosition[0]
    if (rowItemsCount > 1) {
      const startPoint = -(rowItemsCount - 1) * iconSize
      const spaceWidth = index * iconSpace
      x += startPoint + spaceWidth
    }
  }

  return { x, y, startTime }
}

function parseFiles({
  row,
  parent,
  time,
  isFirstKey,
}) {
  row.map((child, index) => {
    const { name } = child
    
    const beforeUsedLayer = FilesComp.layer(name)
    const existed = !!beforeUsedLayer
    const type = name.lastIndexOf('.') === -1 ? 'folder' : name.slice(name.lastIndexOf('.') + 1)
    const icon = getComp(`${type}.psd`)
    const fileLayer = beforeUsedLayer || FilesComp.layers.add(icon)
    fileLayer.existed = existed
    child.layer = fileLayer
    child.index = index

    const { x, y, startTime } = getPosition({
      child,
      parent,
      index,
      time,
      isFirstKey,
    })

    child.x = x
    child.y = y
    child.type = type
    child.startTime = startTime
    if (!existed) {
      child.layer.startTime = startTime
      child.layer.name = name
    }

    if (existed) fileLayer.property('position').addKey(time)
    fileLayer.property('position').setValueAtTime(startTime, [x, y])
    if (!existed) {
      fileLayer.applyPreset(File('./src/presets/files/icon.ffx'))
      drawIcon({ icon, startTime, fileLayer })
    }
    writeFileName(child, time)
    drawShape(child, parent, time)

    if (child.children) {
      parseFiles({
        row: child.children,
        parent: child,
        time,
        isFirstKey,
      })
    }
  })
}

function buildFiles() {
  FilesComp.layer(1).selected = false
  const jsons = FilesComp.layer('json').text.sourceText
  let files;
  for (let i = 1; i <= jsons.numKeys; i++) {
    const json = jsons.keyValue(i).text
    const time = jsons.keyTime(i)

    eval(`files = ${json}`)
    filesHistory.push(parseFiles({
      row: files,
      time,
      isFirstKey: i === 1,
    }))
  }
}

// (() => {
  // buildUI(this)
  // resetFilesComp()
  // buildFiles()
// })()

// [
//   {
//     name: 'shitcode',
//     children: [
//       {
//         name: '1111111.html',
//       },
//       {
//         name: '88888888.css',
//       },
//       {
//         name: '88888888.js',
//       },
//     ]
//   },
// ]