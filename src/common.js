app.project.expressionEngine = 'javascript-1.0'

function log(obj, inputType) {
  const keys = ['name', 'label', 'value', 'text']
  let keysStr = ''
  const w = new Window('dialog', 'LOG', undefined, { resizeable: true })
  w.orientation = 'row'
  w.alignChildren = 'top'

  if (obj) {
    if (Array.isArray(obj)) {
      obj.map((val, index) => keysStr += `${index}: ${val}\n`)
    } else if (typeof obj === 'object' && obj !== null) {
      keys.map((key) => {
        if (obj.hasOwnProperty(key)) keysStr += `${key}: ${obj[key]}\n`
      }, '')
      
      keysStr += `typeof: ${typeof obj}\n`
      keysStr += `Object: ${obj}\n`
      keysStr += `Size: ${Object.keys(obj).length}\n`
      keysStr += '\nItem Properties:\n'

      Object.keys(obj).map((key) => {
        try {
          if (ignoreThisKey(obj, key) || !obj.hasOwnProperty(key)) return true
          let value = obj[key]
          if (typeof value === 'function') value = `${key}()`

          keysStr += `${key}: ${value}\n`
        } catch (e) {
          alert(`Error in key: ${key}`)
        }
      })
    }
  }
      
  const textValue = keysStr || obj
  const lineCount = typeof textValue === 'string' ? textValue.split('\n').length + 1 : 3

  const lineHeight = 20
  let height = lineCount * lineHeight
  if (height > 500) height = 500

  const input = inputType || (height < 500 ? 'statictext' : 'edittext')

  const text = w.add(input, undefined, textValue, { multiline: true, scrolling: true })
  text.active = false
  text.size = {
    width: 400,
    height,
  }

  w.show()

  return w
}

function ignoreThisKey(obj, key) {
  return (
    (obj instanceof Panel && key === 'justify')
    || (key === 'maxValue' && !obj.hasMax)
    || (key === 'minValue' && !obj.hasMin)
    || (key === 'separationFollower' && !obj.isSeparationFollower)
    || (key === 'separationLeader' && !obj.isSeparationLeader)
    || (key === 'separationDimension' && !obj.isSeparationLeader)
  )
}

exports.scaleExpression = `
n = 0;
if (numKeys > 0) {
  n = nearestKey(time).index;
  if (key(n).time > time) {
    n--;
  }
}
if (n == 0) {
  t = 0;
} else {
  t = time - key(n).time;
}
if (n > 0 && t < 1) {
  v = velocityAtTime(key(n).time - thisComp.frameDuration/10);
  amp = 0.05;
  freq = 2;
  decay = 5;
  value + v*amp*Math.sin(freq*t*2*Math.PI)/Math.exp(decay*t);
} else {
  value;
}
`

exports.clearLayerProp = function clearLayerProp({
  layer,
  propName = 'Position',
  fromTime = 0,
  toTime = 0,
  cursorPos = 0,
  duplications = false,
  latestKeyToo = false,
}) {
  const layerProp = layer.property(propName)

  if (latestKeyToo) layerProp.removeKey(layerProp.numKeys)
  
  for (let i = layerProp.numKeys; i > 0; i--) {
    const keyTime = layerProp.keyTime(i)
    let removeKey = false
    if (keyTime < cursorPos) continue
    
    if (fromTime && toTime) {
      removeKey = keyTime >= fromTime && keyTime <= toTime
    } else if (duplications) {
      if (i === 1) continue

      const prevVal = layerProp.keyValue(i - 1)
      const curVal = layerProp.keyValue(i)

      if (i === layerProp.numKeys) {
        removeKey = prevVal === curVal
      } else {
        const nextVal = layerProp.keyValue(i + 1)
        removeKey = prevVal === curVal && curVal === nextVal
      }
    } else {
      removeKey = true
    }

    if (removeKey) layerProp.removeKey(i)
  }
}

exports.getComp = function getComp(name) {
  const { items } = app.project
  for (let i = 1; i <= items.length; i++) {
    if (items[i].name === name) return items[i]
  }

  return null
}

exports.clearSelection = function clearSelection(comp) {
  comp.selectedLayers.map(layer => layer.selected = false)
}

function err(string) {
  log(string)
}
// app.onError = err

exports.log = log

exports.markers = [
  {
    name: 'HTML',
    label: 1, // Red
  },
  {
    name: 'CSS',
    label: 8, // Blue
  },
  {
    name: 'JS',
    label: 2, // Yellow
  },
  {
    name: 'Code',
    label: 14, // Cyan
  },
  {
    name: 'Browser',
    label: 9, // Green
  },
  {
    name: 'iPhone',
    label: 1,
  },
  {
    name: 'Android',
    label: 1,
  },
  {
    name: 'Code 2',
    label: 1,
  },
  {
    name: 'Code 3',
    label: 1,
  },
  {
    name: 'Code 4',
    label: 1,
  },
  {
    name: 'Demo 1',
    label: 1,
  },
  {
    name: 'Demo 2',
    label: 1,
  },
  {
    name: 'Demo 3',
    label: 1,
  },
  {
    name: 'Demo 4',
    label: 1,
  },
  {
    name: 'Demo 5',
    label: 1,
  },
]

exports.getPropertyBackup = function getPropertyBackup(prop) {
  const propBackup = {
    times: [],
    values: [],
  }

  if (!prop.numKeys) return propBackup

  for (let i = 1; i <= prop.numKeys; i++) {
    propBackup.times.push(prop.keyTime(i))
    propBackup.values.push(prop.keyValue(i))
  }

  return propBackup
}

exports.showWindow = function showWindow() {
  if (win instanceof Window) win.show()
}

exports.ProgressBar = function ProgressBar({
  title = 'Progress',
  prependElements,
  appendElements,
}) {
  const w = new Window('palette', 'Progress Bar')
  w.active = true
  w.orientation = 'stack'
  w.alignChildren = 'top'

  let group = w.add('group')
  group.orientation = 'column'
  group.name = 'progressbar'
  group.alignment = 'fill'
  if (prependElements) group = prependElements(group)
  
  const titleElement = group.add('statictext', undefined, title)
  titleElement.alignment = 'fill'
  titleElement.justify = 'center'
  const descriptionElement = group.add('statictext', undefined, '')
  descriptionElement.alignment = 'fill'
  descriptionElement.justify = 'center'
  const bar = group.add('progressbar', undefined, 0, 100)
  bar.alignment = 'fill'
  bar.preferredSize = [250, 10]

  if (appendElements) group = appendElements(group)

  function up(count = 1) {
    if (!count) {
      w.center()
      w.show()
    }
    bar.value = parseInt(count, 10)

    titleElement.text = `${title} - (${bar.value}%)`

    if (bar.value > 99) {      
      w.visible = false
      w.hide()
      w.close()
      win.progress.w.visible = false
      win.progress.w.hide()
      win.progress.w.close()
    }
  }

  function description(text) {
    descriptionElement.text = text
  }

  up(0)

  w.layout.layout(true)

  return {
    bar,
    up,
    description,
    w,
  }
}

// function tests() {
//   comps.codeTracking = app.project.items.addComp('Code Tracking', codeFootage.width, codeFootage.height, codeFootage.pixelAspect, codeFootage.duration, codeFootage.frameRate)
//   var higherCode = comps.codeTracking.layers.add(codeFootage)
//   var lowerCode = higherCode.duplicate()
//   lowerCode.moveAfter(higherCode)
//   higherCode.blendingMode = BlendingMode.DIFFERENCE

//   higherCode.name = 'Higher Code'
//   lowerCode.name = 'Lower Code'
  
//   var adjustmentLayer = comps.codeTracking.layers.addNull()
//   adjustmentLayer.name = 'Changes Tracker'
//   adjustmentLayer.adjustmentLayer = true
//   var exposure = adjustmentLayer.Effects.addProperty('Exposure')
//   exposure.property('Exposure').setValue(100)
//   exposure.property('Gamma').setValue(10)

//   var glow = adjustmentLayer.Effects.addProperty('Glow')
//   glow.property('Glow Threshold').setValue(100)
//   glow.property('Glow Radius').setValue(50)
//   glow.property('Glow Intensity').setValue(50)
//   glow.property('Glow Colors').setValue('A & B Colors')
//   glow.property('Color B').setValue('#ffffff')
// }