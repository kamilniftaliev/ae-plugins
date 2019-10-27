const {
  log,
  clearLayerProp,
  getComp,
  ProgressBar,
} = require('./common')

let camera
const times = {
  transition: 1,
  zoom: 1,
  wiggle: 2.5,
}
const config = {
  angle: 100,
  focusedAngle: 50,
  focusedPositionZ: -350,
}
let ui
let posHistory
let comps
let cameraMarkers
let rovingTimes
const { path } = File($.fileName)
const inputSize = [0, 0, 40, 22]
const textSize = [0, 0, 100, 22]

function buildUI() {
  resetVariables()
  
  const panel = win.add('panel', undefined, 'Camera', { borderStyle: 'black' })

  panel.orientation = 'row'
  panel.leftCol = panel.add('group')
  panel.leftCol.orientation = 'column'

  panel.leftCol.add('statictext', textSize, 'Camera configuration')

  panel.leftColRow = panel.leftCol.add('group')
  panel.leftColRow.orientation = 'row'
  panel.rightCol = panel.add('group')
  panel.col1 = panel.leftColRow.add('group')
  panel.col2 = panel.leftColRow.add('group')
  panel.col3 = panel.rightCol.add('group')
  panel.col1.orientation = 'column'
  panel.col1.alignChildren = 'right'
  panel.col2.orientation = 'column'
  panel.col2.alignChildren = 'left'
  
  panel.col3.orientation = 'column'
  panel.col3.alignChildren = 'fill'

  panel.col1.add('statictext', textSize, 'Transition duration')

  ui.transition = panel.col2.add('edittext', inputSize, times.transition)

  panel.col1.add('statictext', textSize, 'Zoom duration')
  ui.zoom = panel.col2.add('edittext', inputSize, times.zoom)

  panel.col1.add('statictext', textSize, 'Wiggle duration')
  ui.wiggle = panel.col2.add('edittext', inputSize, times.wiggle)

  panel.col1.add('statictext', textSize, 'Angle range')
  ui.angle = panel.col2.add('edittext', inputSize, config.angle)

  panel.col1.add('statictext', textSize, 'From cursor position')
  ui.fromCursorPosition = panel.col2.add('checkbox', undefined, config.fromCursorPosition)

  panel.col3.add('statictext', undefined, 'Add New Marker').justify = 'center'
  
  const mainCompLayers = getComp('Main')
  const mainCompLayerNames = []
  if (mainCompLayers) {
    for (let li = 1; li <= mainCompLayers.numLayers; li++) {
      const { name, hasVideo } = mainCompLayers.layers[li]
      if (hasVideo) mainCompLayerNames.push(name)
    }
  }

  ui.newMarkerLayerGroup = panel.col3.add('group')
  ui.newMarkerLayer = ui.newMarkerLayerGroup.add('dropdownlist', undefined, mainCompLayerNames)
  ui.newMarkerLayer.helpTip = 'Layer to move to'
  ui.newMarkerLayer.selection = mainCompLayerNames[2]
  const eyeIcon = File(`./icons/eye.png`)
  ui.focusBtn = ui.newMarkerLayerGroup.add('iconbutton', undefined, eyeIcon, { style: 'toolbutton', toggle: true })
  ui.focusBtn.helpTip = 'Focus'

  const { focusedPositionZ, focusedAngle } = config
  ui.focusPositionZText = panel.col3.add('statictext', undefined, `Z position on focus: ${focusedPositionZ}`)
  ui.focusPositionZText.justify = 'center'
  ui.focusPositionZ = panel.col3.add('slider', undefined, focusedPositionZ, focusedPositionZ - 500, -50)
  ui.focusPositionZ.onChanging = function () {
    ui.focusPositionZText.text = `Z position on focus: ${parseInt(this.value, 10)}`
  }
  
  ui.focusedAngleText = panel.col3.add('statictext', undefined, `Focused angle: ${focusedAngle}`)
  ui.focusedAngleText.justify = 'center'
  ui.focusedAngle = panel.col3.add('slider', undefined, focusedAngle, focusedAngle - 400, focusedAngle + 400)
  ui.focusedAngle.onChanging = function () {
    ui.focusedAngleText.text = `Focused angle: ${parseInt(this.value, 10)}`
  }

  ui.addMarkerBtn = panel.col3.add('button', undefined, 'Add Marker')

  function addCameraMarker() {
    try {
      const { activeItem } = app.project
      if (!activeItem) return log('Open a composition')

      const camera = activeItem.layer('Camera')
      if (!camera) return log('Layer "Camera" wasn\'t found')

      const { text: compName } = ui.newMarkerLayer.selection
      const newMarkerObj = {}
      newMarkerObj.comp = compName
      if (ui.focusBtn.value) {
        newMarkerObj.z = parseInt(ui.focusPositionZ.value, 10)
        newMarkerObj.focus = 1
      }
      
      const newMarker = new MarkerValue(JSON.stringify(newMarkerObj))
      newMarker.label = getComp('Main').layer(compName).label
      camera.property('marker').setValueAtTime(activeItem.time, newMarker)
      ui.focusBtn.value = false
    } catch (e) { log(e) }

    return null
  }

  ui.addMarkerBtn.onClick = addCameraMarker

  ui.setCameraPoints = panel.leftCol.add('button', undefined, 'Set camera points')
  ui.setCameraPoints.onClick = function apply() {
    // try {
      times.transition = parseFloat(ui.transition.text)
      times.zoom = parseFloat(ui.zoom.text)
      times.wiggle = parseFloat(ui.wiggle.text)
      config.angle = parseInt(ui.angle.text, 10)
      config.fromCursorPosition = ui.fromCursorPosition.value
      config.cursorPosition = config.fromCursorPosition ? app.project.activeItem.time : 0
      
      win.progress = ProgressBar({ title: 'Setting camera points' })
      setCameraPoints()
    // } catch (e) {
    //   log(e)
    // }
  }

  panel.hide()
  
  return panel
}

function addRoving(time) {
  rovingTimes.push(camera.property('position').nearestKeyIndex(time))
}

function getCompPosition(layerName) {
  return comps.main.layer(layerName).property('position').value
}

function saveCameraPosition({
  time,
  smooth = true,
  easeIn = true,
  easeOut = true,
}) {
  camera.property('Point Of Interest').addKey(time)
  camera.property('Position').addKey(time)

  smoothen('Point Of Interest')
  smoothen('Position')

  function smoothen(propName) {
    smoothenProperty({
      prop: camera.property(propName),
      time,
      smooth,
      easeIn,
      easeOut,
    })
  }
}

function setCameraFocus({
  time,
  pointOfInterest,
  smooth,
  easeIn,
  easeOut,
}) {
  const prop = camera.property('Point Of Interest')
  prop.setValueAtTime(time, pointOfInterest)
  
  smoothenProperty({
    prop,
    time,
    smooth,
    easeIn,
    easeOut,
  })
}

function setCameraPosition({
  time,
  position,
  smooth,
  easeIn,
  easeOut,
}) {
  const prop = camera.property('Position')
  prop.setValueAtTime(time, position)

  smoothenProperty({
    prop,
    time,
    smooth,
    easeIn,
    easeOut,
  })
}

function smoothenProperty({
  prop,
  time,
  smooth,
  easeIn,
  easeOut,
}) {
  const keyIndex = prop.nearestKeyIndex(time)
  if (keyIndex === 1 || keyIndex > prop.numKeys) return

  const speedIn = smooth ? 33.33 : 0.1
  const speedOut = smooth ? 33.33 : 0.1
  const influenceIn = easeIn ? 33.33 : 0.1
  const influenceOut = easeOut ? 33.33 : 0.1
  const { BEZIER, LINEAR } = KeyframeInterpolationType
  const easeInInterpolation = easeIn ? BEZIER : LINEAR
  const easeOutInterpolation = easeOut ? BEZIER : LINEAR
  
  setAnim(prop, keyIndex, smooth)

  const easeInKeyFrame = new KeyframeEase(speedIn, influenceIn)
  const easeOutKeyFrame = new KeyframeEase(speedOut, influenceOut)
  prop.setTemporalEaseAtKey(keyIndex, [easeInKeyFrame], [easeOutKeyFrame])

  prop.setInterpolationTypeAtKey(keyIndex, easeInInterpolation, easeOutInterpolation)
}

function setAnim(prop, keyIndex, val) {
  prop.setSpatialAutoBezierAtKey(keyIndex, val)
  prop.setTemporalAutoBezierAtKey(keyIndex, val)
  prop.setSpatialContinuousAtKey(keyIndex, val)
  prop.setTemporalContinuousAtKey(keyIndex, val)
}

const oppositeSides = {
  'right-top': 'left-bottom',
  'right-bottom': 'left-top',
}

function isOpposite(first, second) {
  return oppositeSides[first] === second || oppositeSides[second] === first
}

function generateAngle(arr) {
  const x = generateRandomNumber() >= 0.5 ? 'right' : 'left'
  const y = generateRandomNumber() >= 0.5 ? 'top' : 'bottom'
  const newPos = `${x}-${y}`

  if (arr.toString().indexOf(newPos) !== -1 || isOpposite(newPos, arr[0])) return generateAngle(arr)

  return { x, y }
}

function getRandomAngle(pos, angle = config.angle) {
  const positions = {
    right: pos[0] + angle,
    left: pos[0] - angle,
    top: pos[1] + angle,
    bottom: pos[1] - angle,
  }

  const lastPos = posHistory[posHistory.length - 1]
  const penultPos = posHistory[posHistory.length - 2]
  const { x, y } = generateAngle([lastPos, penultPos])
  const newPosition = [positions[x], positions[y], pos[2]]

  posHistory.push(`${x}-${y}`)
  return newPosition
}

function cameraOnComp({
  comp,
  time,
  value,
  skipFocus,
  skipZoom,
  positionZ,
  angle,
  smooth = false,
  easeIn = false,
  easeOut = false,
}) {
  if (!comp) {
    alert(`Wrong comp: ${comp}`)
    return null
  }
  const compPosition = value || comp.property('position').valueAtTime(time, true)

  if (!skipFocus) {
    setCameraFocus({
      time,
      pointOfInterest: compPosition,
      smooth,
      easeIn,
      easeOut,
    })
  }

  const position = getRandomAngle(compPosition, angle)
  if (!skipZoom) position[2] -= camera.property('zoom').value + 300

  if (positionZ) position[2] += positionZ

  setCameraPosition({
    time,
    position,
    smooth,
    easeIn,
    easeOut,
  })

  return compPosition
}

function getMarker(index) {
  const { comment, duration } = cameraMarkers.keyValue(index)
  eval(`var json = ${comment}`)
  const { comp: name, focus, z: positionZ } = json
  const comp = comps.main.layer(name)

  if (!comp) {
    log(`Can't find comp named ${name} inside comps.main. Comment is: ${comment}`)
    return null
  }
  
  return {
    name,
    focus,
    positionZ,
    comp,
    time: cameraMarkers.keyTime(index),
    compPosition: getCompPosition(name),
    comment,
    duration,
  }
}

function setTransitionBetweenComps(firstMarkerIndex) {
  const { comp, compPosition, name } = getMarker(firstMarkerIndex)
  const nextMarker = getNextMarker(firstMarkerIndex)
  if (!nextMarker) return

  // If it's same comp, do nothing
  if (nextMarker.name === name) return

  const transitionStartTime = nextMarker.time - times.transition
  const betweenComps = compPosition
  betweenComps[0] = (compPosition[0] + nextMarker.compPosition[0]) / 2
  betweenComps[1] = (compPosition[1] + nextMarker.compPosition[1]) / 2

  cameraOnComp({
    comp,
    time: transitionStartTime,
    easeOut: true,
  })

  const middleTime = transitionStartTime + (times.transition / 2)

  cameraOnComp({
    comp,
    time: middleTime,
    value: betweenComps,
    positionZ: -300,
    smooth: true,
  })
  addRoving(middleTime)
}

function getNextMarker(i) {
  return i < cameraMarkers.numKeys ? getMarker(i + 1) : null
}

function wiggle(i) {
  const { name, time, comp } = getMarker(i)
  
  const nextMarker = getNextMarker(i)
  const nextMarkerTime = nextMarker ? nextMarker.time : comps.main.duration

  const duration = nextMarkerTime - time
  if (duration > times.wiggle * 2) {
    const wiggleCount = parseInt(duration / times.wiggle, 10)
    for (let index = 1; index < wiggleCount; index++) {
      const nextPosTime = time + (index * times.wiggle)
      cameraOnComp({
        comp,
        time: nextPosTime,
        skipFocus: true,
        smooth: true,
      })
      addRoving(nextPosTime)
    }
  }
}

function getFocusPosition({
  time,
  comp: targetComp,
  focusPoint,
}) {
  const keyTime = time - targetComp.startTime
  const focusPosition = focusPoint.valueAtTime(keyTime, true)

  const compPosition = getCompPosition(targetComp.name)
  x = compPosition[0] - (targetComp.width / 2) + focusPosition[0]
  y = compPosition[1] - (targetComp.height / 2) + focusPosition[1]
  z = compPosition[2]

  return [x, y, z]
}

function focusToComp(index) {
  const { cursorPosition } = config
  const curMarker = getMarker(index)

  const nextMarker = getNextMarker(index)
  if (!nextMarker || !curMarker) return
  const {
    time,
    duration,
    name,
    comment,
    comp: markerComp,
    positionZ,
    compPosition,
  } = curMarker

  const startTime = time
  const endTime = nextMarker.time
  const comp = getComp(name)
  
  if (!comp) return log(`Didn't find composition named "${name}"`)

  const areaStart = startTime - times.zoom
  saveCameraPosition({
    time: areaStart,
    easeIn: false,
    easeOut: true,
  })
  const focusPoint = comp.layer('Focus Point').property('position')

  const args = {
    comp: markerComp,
    time: startTime,
    skipZoom: true,
    positionZ: positionZ || config.focusedPositionZ,
    angle: config.focusedAngle,
    smooth: false,
    easeIn: false,
    easeOut: false,
    focusPoint,
  }

  args.value = getFocusPosition(args)

  cameraOnComp(args)
  addFocusMove(args.time)

  const isTopAngle = generateRandomNumber() > 0.5
  const isLeftAngle = generateRandomNumber() > 0.5

  const compLayerStartTime = comps.main.layer(name).startTime
  const { frameRate } = comps.main

  for (let i = 1; i <= focusPoint.numKeys; i++) {
    const keyTime = parseInt((focusPoint.keyTime(i) + compLayerStartTime) * frameRate, 10) / frameRate
    
    if (keyTime < startTime || keyTime > endTime) continue
    
    args.time = keyTime
    args.pointOfInterest = getFocusPosition(args)

    
    args.position = []
    const xAngle = config.angle * 0.75
    const yAngle = config.angle * 0.5
    args.position[0] = isLeftAngle ? args.pointOfInterest[0] + xAngle : args.pointOfInterest[0] - xAngle
    args.position[1] = isTopAngle ? args.pointOfInterest[1] + yAngle : args.pointOfInterest[1] - yAngle
    args.position[2] = compPosition[2] + args.positionZ
    
    setCameraPosition(args)
    setCameraFocus(args)

    addFocusMove(args.time)

    // If it's last key then zoom out
    if (
      (
        (i < focusPoint.numKeys && focusPoint.keyTime(i + 1) > endTime)
        || i === focusPoint.numKeys
      )
      && endTime > keyTime + times.zoom * 2
    ) {
      args.easeIn = true
      args.easeOut = true
      args.time = keyTime + times.zoom
      cameraOnComp(args)

      const clearingProps = {
        layer: camera,
      }
      clearLayerProp({ ...clearingProps })
      clearLayerProp({ ...clearingProps, propName: 'Point Of Interest' })

      const marker = cameraMarkers.keyValue(index)
      marker.comment = `{ "comp": "${name}", "generated": 1 }`
      cameraMarkers.setValueAtTime(args.time, marker)
      // wiggle(cameraMarkers.nearestKeyIndex(args.time))
    }
  }

  const focusExpression = 'var b = Math.abs(transform.position[2] / 3); b > 300 ? 0 : b'
  camera.property('blurLevel').expression = focusExpression
  camera.property('aperture').expression = focusExpression
}

function addFocusMove(time) {
  const position = camera.property('position')
  const pointOfInterest = camera.property('Point Of Interest')
  const positionKey = position.nearestKeyIndex(time)
  const interestKey = pointOfInterest.nearestKeyIndex(time)
  const interestTime = pointOfInterest.keyTime(interestKey)

  const easeInKeyFrame = new KeyframeEase(0, 33.33)
  const easeOutKeyFrame = new KeyframeEase(0, 33.33)
  position.setTemporalEaseAtKey(positionKey, [easeInKeyFrame], [easeOutKeyFrame])
  position.setTemporalContinuousAtKey(positionKey, true)

  if (interestTime === time) {
    pointOfInterest.setTemporalEaseAtKey(interestKey, [easeInKeyFrame], [easeOutKeyFrame])
    pointOfInterest.setTemporalContinuousAtKey(interestKey, true)
  }
}

function smoothenWiggles() {
  win.progress.up(90)
  
  rovingTimes.map((key) => {
    const position = camera.property('position')
    if (key > position.numKeys) return
    const keyTime = position.keyTime(key)
    const pointOfInterest = camera.property('Point Of Interest')
    const interestKey = pointOfInterest.nearestKeyIndex(keyTime)
    const interestTime = pointOfInterest.keyTime(interestKey)
    
    setSmoothPoint(position, key)

    if (interestTime === keyTime) setSmoothPoint(pointOfInterest, interestKey)
  })

  win.progress.up(100)
}

function setSmoothPoint(prop, key, rove = true) {
  const { BEZIER } = KeyframeInterpolationType

  prop.setInterpolationTypeAtKey(key, BEZIER)
  prop.setTemporalEaseAtKey(key, [new KeyframeEase(0.1, 0.1)])
  if (rove) {
    prop.setRovingAtKey(key, true)
  }
  setAnim(prop, key, true)
}

function resetVariables() {
  ui = {}
  posHistory = []
  comps = {}
  rovingTimes = []
}

function resetCamera() {
  camera = comps.main.layer('Camera')
  camera.selected = true
  camera.applyPreset(File(`${path}/presets/camera/camera-options.ffx`))
  camera.selected = false

  clearLayerProp({ layer: camera })
  clearLayerProp({ layer: camera, propName: 'Point Of Interest' })
  
  cameraMarkers = camera.property('marker')

  for (let i = 1; i <= cameraMarkers.numKeys; i++) {
    const { comment } = cameraMarkers.keyValue(i)
    eval(`var json = ${comment}`)

    if (json.generated) cameraMarkers.removeKey(i)
  }

  // log(cameraMarkers.keyValue(3))
}

function setCameraPoints() {
  comps.main = getComp('Main')
  if (!comps.main) return

  app.beginUndoGroup('Camera')

  resetCamera()

  win.progress.up(10)

  for (let i = 1; i <= cameraMarkers.numKeys; i++) {
    const marker = getMarker(i)
    if (!marker || marker.time < config.cursorPosition) continue;

    // If need to focus on a composition area
    if (marker.focus) {
      focusToComp(i)
    } else {
      // Main point at marker
      marker.easeIn = true
      marker.easeOut = true
      cameraOnComp(marker)

      wiggle(i)
    }
    setTransitionBetweenComps(i)
  }

  smoothenWiggles()

  app.endUndoGroup()
}

exports.ui = buildUI;
