const {
  log,
  clearLayerProp,
  getComp,
  markers,
  getPropertyBackup,
  ProgressBar,
  clearSelection,
} = require('./common')

const ui = {}
let cutterComp
let videos
let backup
let targetVideo
let footage
let changesComp
let footageLayer
let footageName = 'code.mp4'
let recalculate = false
let recalculateFromBackup = false
let importedFile
const footageFreezeTime = 2
const { path } = File($.fileName)
let backupFile

function buildUI() {
  const panel = win.add('panel', undefined, 'Cutter', { borderStyle: 'black' })

  panel.topRow = panel.add('group')
  panel.orientation = 'row'
  panel.alignChildren = 'top'

  panel.col1 = panel.topRow.add('group')
  panel.col1.orientation = 'column'
  panel.col1.alignChildren = 'fill'

  panel.footage = panel.col1.add('group')
  panel.footage.add('staticText', undefined, 'Footage:')

  const itemNames = []
  const { items } = app.project
  
  for (let i = 1; i <= items.length; i++) {
    const { typeName, name, duration, hasVideo } = items[i]
    if (typeName === 'Footage' && hasVideo && duration > 0) {
      itemNames.push(name)
    }
  }
  
  ui.footageName = panel.footage.add('dropdownlist', undefined, itemNames)
  ui.footageName.selection = itemNames[0]

  panel.recalculate = panel.col1.add('group')
  ui.recalculate = panel.recalculate.add('checkbox', undefined, 'Recalculate')
  ui.recalculate.value = recalculate
  ui.recalculate.onClick = function onRecalculateChange() {
    const val = !!this.value
    ui.recalculateFromBackup.value = val
    if (val) ui.recalculateFromBackup.show()
    else ui.recalculateFromBackup.hide()
  }
  
  ui.recalculateFromBackup = panel.recalculate.add('checkbox', undefined, 'From Backup')
  ui.recalculateFromBackup.value = recalculate && recalculateFromBackup
  if (!recalculate) ui.recalculateFromBackup.hide()

  ui.cut = panel.col1.add('button', undefined, 'Cut')
  ui.cut.onClick = function cutFootage() {
    // try {
      footageName = ui.footageName.selection.text
      recalculate = ui.recalculate.value
      recalculateFromBackup = ui.recalculateFromBackup.value
      ui.recalculate.value = false
      ui.recalculateFromBackup.value = false
      start()
    // } catch (e) {
    //   log(e)
    // }
  }

  // ---------------------------------------- //
  // Marker row //
  // ---------------------------------------- //
  panel.newMaker = panel.col1.add('panel', undefined, 'Marker', { borderStyle: 'black' })
  panel.newMaker.orientation = 'row'

  ui.markers = panel.newMaker.add('dropdownlist', undefined, markers.map(({ name }) => name))
  ui.markers.selection = markers[0].name

  // // Add marker button
  // const focusIcon = File('./icons/eye.png')
  // ui.focusBtn = panel.newMaker.add('iconbutton', undefined, focusIcon, { style: 'toolbutton', toggle: true })
  // ui.focusBtn.helpTip = 'Focus'

  // Add marker button
  const addMarkerIcon = File('./icons/plus.png')
  ui.addMarkerBtn = panel.newMaker.add('iconbutton', undefined, addMarkerIcon, { style: 'toolbutton' })
  ui.addMarkerBtn.helpTip = 'Add Marker'

  // Skip button
  const skipIcon = File('./icons/skip.png')
  ui.skipBtn = panel.newMaker.add('iconbutton', undefined, skipIcon, { style: 'toolbutton' })
  ui.skipBtn.helpTip = 'Skip'
  
  function addMarker(defaultProps = {}) {
    const { activeItem } = app.project
    if (!activeItem) return log('Open a composition')

    const activeItemfootage = activeItem.layer('footage')
    if (!activeItemfootage) return log('Layer "footage" wasn\'t found')

    const { text: videoName } = ui.markers.selection
    const newMarkerObj = defaultProps
    const { skip } = newMarkerObj
    if (!skip) {
      newMarkerObj.video = videoName
      // if (ui.focusBtn.value) newMarkerObj.focus = 1
    }
    
    const markerLabel = markers.find(({ name }) => name === videoName).label
    const newMarker = new MarkerValue(JSON.stringify(newMarkerObj))
    newMarker.label = skip ? 15 : markerLabel
    activeItemfootage.property('marker').setValueAtTime(activeItem.time, newMarker)

    return null
  }

  ui.addMarkerBtn.onClick = addMarker
  ui.skipBtn.onClick = () => addMarker({ skip: true })

  // ---------------------------------------- //
  // Backup row //
  // ---------------------------------------- //
  panel.backup = panel.col1.add('panel', undefined, 'Backup', { borderStyle: 'black' })
  panel.backup.orientation = 'row'

  // Make backup button
  const makeBackupIcon = File('./icons/save.png')
  ui.makeBackupBtn = panel.backup.add('iconbutton', undefined, makeBackupIcon, { style: 'toolbutton' })
  ui.makeBackupBtn.helpTip = 'Make backup'
  ui.makeBackupBtn.onClick = makeBackup

  // Load backup button
  const loadBackupIcon = File('./icons/upload.png')
  ui.loadBackupBtn = panel.backup.add('iconbutton', undefined, loadBackupIcon, { style: 'toolbutton' })
  ui.loadBackupBtn.helpTip = 'Load backup'
  ui.loadBackupBtn.onClick = loadBackup

  panel.hide()

  return panel
}

function makeBackup(options = {}) {
  try {
    if (!cutterComp) cutterComp = getComp('Cutter')

    backup = {}
    backup.markers = getPropertyBackup(cutterComp.layer('footage').property('marker'))
    backup.updates = options.updates || getPropertyBackup(cutterComp.layer('footage').effect('Updated').Checkbox)
    if (!backup.markers) delete backup.markers
    if (backup.markers) backup.footages = getFootageBackup(backup.markers)

    if (options.keepOpen && importedFile) {
      backupFile = importedFile
    } else if (!backupFile) {
      backupFile = new File
      backupFile = backupFile.saveDlg('Saving backup location', 'JSON:*.json')
      if (!backupFile) return
    }
    
    backupFile.open('w')
    backupFile.encoding = 'UTF-8'
    backupFile.write(JSON.stringify(backup))

    if (options.keepOpen !== true) backupFile.close()
  } catch (e) {
    log(e)
  }
}

function getFootageBackup(markers) {
  const focusPoints = {}
  const timeRemaps = {}

  markers.values.map(({ comment }) => {
    eval(`var jsonComment = ${comment}`)
    const { video, skip } = jsonComment
    
    if (skip || focusPoints[video]) return
    const videoComp = getComp(video)
    if (!videoComp) return

    const position = videoComp.layer('Focus Point').property('position')
    if (position.numKeys) {
      focusPoints[video] = getPropertyBackup(position)
    }
    
    const timeRemap = videoComp.layer(video).property('timeRemap')
    if (timeRemap.numKeys) {
      timeRemaps[video] = getPropertyBackup(timeRemap)
    }
  })

  return { focusPoints, timeRemaps }
}

function loadBackup() {
  if (!cutterComp) cutterComp = getComp('Cutter')
  
  importedFile = new File
  importedFile = importedFile.openDlg('Saved backup location', 'JSON:*.json')
  if (!importedFile) return
  importedFile.open('r')
  let openedBackup
  try {
    openedBackup = JSON.parse(importedFile.read())
  } catch (e) {
    log(`Error while opening and parsing the file: ${e}`)
  }
  importedFile.close()

  if (!openedBackup) return

  backup = openedBackup

  const updatedEffect = cutterComp.layer('footage').effect('Updated').Checkbox
  updatedEffect.setValuesAtTimes(backup.updates.times, backup.updates.values)
  
  // recalculate = false
  ui.recalculate.value = false
  ui.recalculateFromBackup.value = false
}

function clearComp(comp, without) {
  for (let i = 1; i <= comp.numLayers; i++) {
    const layer = comp.layer(i)
    layer.selected = false
    if (!without || !without.find(name => name === layer.name)) {
      layer.remove()
      i--
    }
  }
}

// const changesLayerExpression = `
//   changesLayer = thisComp.layer('changes')
//   x = changesLayer.width / 2
//   y = changesLayer.height / 2
//   const [r1, g1, b1] = changesLayer.sampleImage([x / 2, y / 2]);
//   const [r2, g2, b2] = changesLayer.sampleImage([x / 2, y * 1.5]);
//   const [r3, g3, b3] = changesLayer.sampleImage([x * 1.5, y / 2]);
//   const [r4, g4, b4] = changesLayer.sampleImage([x * 1.5, y * 1.5]);
//   r1 && g1 && b1 && r2 && g2 && b2 && r3 && g3 && b3 && r4 && g4 && b4
// `;

function splitFootage() {
  let curFrame = 0
  const { source: { frameRate } } = footageLayer
  const videosName = Object.keys(videos)
  
  videosName.map((videoName, index) => {
    const video = videos[videoName]
    // const firstFrame = video[0]
    const newVideo = cutterComp.layers.add(footage)
    newVideo.name = videoName
    newVideo.timeRemapEnabled = true
    newVideo.startTime = 0 // firstFrame / frameRate
    newVideo.moveToEnd()
    const marker = markers.find(({ name }) => name === videoName)
    if (marker) newVideo.label = marker.label

    const { length: framesCount } = video
    const values = []
    const times = []
    for (let i = 0; i < framesCount; i++) {
      const frame = video[i]
      const prevFrame = video[i - 1]
      const indexTime = newVideo.startTime + (i / frameRate)
      if (prevFrame !== frame) curFrame++

      times.push(indexTime)
      values.push(frame / frameRate)
    }

    const timeRemap = newVideo.property('timeRemap')
    timeRemap.setValuesAtTimes(times, values)
    for (let i = 0; i < framesCount; i++) {
      timeRemap.setInterpolationTypeAtKey(i + 1, KeyframeInterpolationType.HOLD)
    }

    const perc = (index / videosName.length) * 100
    win.progress.up(perc)
    
    clearLayerProp({
      layer: newVideo,
      propName: 'timeRemap',
      duplications: true,
      latestKeyToo: true,
    })

    const nextIndex = index + 1
    if (videosName.length - nextIndex) {
      const nextPerc = perc + ((((nextIndex / videosName.length) * 100) - perc) / 2)
      win.progress.up(nextPerc)
    }
  })

  win.progress.up(100)
  win.progress.description('Finished !')
}

function cut() {
  win.progress = ProgressBar({ title: 'Splitting parts' })
  applyMarkersBackup()

  if (!footageLayer) return

  const { duration, frameRate } = footageLayer.source
  const frames = frameRate * duration

  const updatedCheckbox = footageLayer.effect('Updated').Checkbox
  for (let i = 2; i < frames; i++) {
    const time = i / frameRate

    const { comment } = footageLayer.property('marker').valueAtTime(time, true)
    let commentJSON = { skip: 0 }
    if (comment) {
      try {
        eval(`commentJSON = ${comment}`)
      } catch (err) {}
    }
    const { skip, video: videoName } = commentJSON

    if (skip) continue

    const updated = updatedCheckbox.valueAtTime(time, true)

    if (updated) {
      videos.all.push(i)

      if (!videoName) continue

      if (!videos[videoName]) videos[videoName] = []
      videos[videoName].push(i)

      Object.keys(videos).filter(name => name !== videoName && name !== 'all').map((name) => {
        const video = videos[name]
        video.push(video[video.length - 1])
      })
    }
  }

  win.progress.up(5)
  splitFootage()
  footageLayer.enabled = false
}

function createChangesComp() {
  changesComp = getComp('Changes')
  if (changesComp) return
  // || recalculateFromBackup
  
  changesComp = app.project.items.addComp('Changes', footage.width, footage.height, footage.pixelAspect, footage.duration, footage.frameRate)
  targetVideo = changesComp.layers.add(footage)
  targetVideo.name = 'target'
  const { frameRate } = targetVideo.source
  targetVideo.startTime = (-1 / frameRate)

  const changesLayer = targetVideo.duplicate()
  targetVideo.selected = false
  changesLayer.selected = true
  changesLayer.applyPreset(File(`${path}/presets/cutter/changes.ffx`))

  changesLayer.startTime = 0
  changesLayer.name = 'changes'
  clearLayerProp({
    layer: changesLayer,
    propName: 'marker',
  })
  changesLayer.moveBefore(targetVideo)
  changesLayer.enabled = true
  changesLayer.effect('Difference Matte').property('Difference Layer').setValue(2)
}

function convertExpressionToKeyframes() {
  const command = app.findMenuCommandId('Convert Expression to Keyframes')

  const updates = {
    times: [],
    values: [],
    duration: footageLayer.source.duration,
  }

  if (backup && backup.updates && backup.updates.times && backup.updates.times.length) {
    updates.times = backup.updates.times
    updates.values = backup.updates.values
  }

  const lastCheckedTime = updates.times[updates.times.length - 1]

  const step = 10
  const start = updates.times.length ? lastCheckedTime : 0
  const end = updates.duration
  let lastBackupPerc = 0
  const { Checkbox: updatedCheckbox } = footageLayer.effect('Updated')
  const saveEvery = updates.duration > 10 ? 1 : 5

  if (lastCheckedTime && lastCheckedTime >= end - 2) return

  updatedCheckbox.selected = true

  win.progress = ProgressBar({ title: 'Finding updated frames' })
  const perc = (start / end) * 100
  win.progress.up(perc)

  app.purge(PurgeTarget.ALL_CACHES)

  makeBackup({
    updates,
    keepOpen: true,
  })

  for (let i = start; i <= end; i += step) {
    const stepEnd = i + step
    footageLayer.inPoint = i > 0.2 ? i - 0.2 : i
    footageLayer.outPoint = stepEnd > end ? end : stepEnd

    const estimatedTime = end - footageLayer.outPoint
    const estimatedMin = parseInt(estimatedTime / 60, 10)
    const minutes = estimatedMin ? `${estimatedMin}m` : ''
    const estimatedSec = parseInt(estimatedTime - (estimatedMin * 60), 10)
    const seconds = estimatedSec ? `${estimatedSec}s` : ''
    win.progress.description(`Estimated time to analyze: ${minutes} ${seconds}`)

    updatedCheckbox.expressionEnabled = true
    app.executeCommand(command)
    const { times, values } = getPropertyBackup(updatedCheckbox)

    Array.prototype.push.apply(updates.times, times)
    Array.prototype.push.apply(updates.values, values)
    
    if (updates.times.length && updates.values.length) {
      updatedCheckbox.setValuesAtTimes(updates.times, updates.values)
    }
    
    const perc = (footageLayer.outPoint / end) * 100
    win.progress.up(perc)
    
    if (perc - lastBackupPerc >= saveEvery) {
      win.progress.description('Making backup...')
      makeBackup({
        updates,
        keepOpen: true,
      })
      lastBackupPerc = perc
    }
  }

  footageLayer.inPoint = 0
  win.progress.up(100)
  win.progress.description('Finished !')
  if (backupFile) backupFile.close()
}

function createCutterComp() {
  cutterComp = getComp('Cutter')

  if (cutterComp) {
    clearComp(cutterComp, ['footage'])
    footageLayer = cutterComp.layer('footage')
  } else {
    cutterComp = app.project.items.addComp('Cutter', footage.width, footage.height, footage.pixelAspect, footage.duration, footage.frameRate)
    footageLayer = cutterComp.layers.add(footage)
    footageLayer.name = 'footage'
    footageLayer.selected = true
    footageLayer.applyPreset(File(`${path}/presets/cutter/updated-checkbox.ffx`))
    
    // if (!recalculateFromBackup) {
    cutterComp.layers.add(changesComp).name = 'changes'
    // getComp('Changes').remove()
    // }
  }

  cutterComp.openInViewer()

  if (recalculateFromBackup) loadBackup()

  if (recalculate) convertExpressionToKeyframes()
  cut()
}

function applyMarkersBackup() {
  if (!backup || !backup.markers) return

  const footageMarker = cutterComp.layer('footage').property('marker')
  backup.markers.times.map((time, i) => {
    const { label, comment } = backup.markers.values[i]
    const marker = new MarkerValue(comment)
    marker.label = label
    footageMarker.setValueAtTime(time, marker)
  })
}

function clearEverything() {
  if (!recalculate) return

  const cutter = getComp('Cutter')
  const changes = getComp('Changes')
  
  if (cutter && cutter.layer('footage')) {
    try {
      if (!backup) backup = {}
      backup.markers = getPropertyBackup(cutter.layer('footage').property('marker'))

      if (backup.markers) {
        const { values: markers } = backup.markers
        for (let i = 0; i < markers.length; i++) {
          const { video } = JSON.parse(markers[i].comment)
          if (video) {
            const videoComp = getComp(video)
            if (videoComp) videoComp.remove()
          }
        }
      }
    } catch (e) {}
    cutter.remove()
  }
  if (changes) changes.remove()
}

function getFootageStartTime(name) {
  const markerProperty = getComp('Main').layer('Camera').property('marker')
  for (let i = 1; i <= markerProperty.numKeys; i++) {
    // if (i > markerProperty.numKeys) return 0

    const keyTime = markerProperty.keyTime(i)
    const { comment } = markerProperty.keyValue(i)

    eval(`var json = ${comment}`)

    if (json.comp === name) {
      return keyTime > footageFreezeTime ? keyTime - footageFreezeTime : 0
    }
  }
  
  return 0
}

function splitToCompositions() {
  let screens = getComp('Screens')
  if (screens) screens.remove()

  const { items } = app.project
  screens = items.addFolder('Screens')
  const mainComp = getComp('Main')

  Object.keys(videos).filter(name => name !== 'all').map((name, arrIndex) => {
    const layer = cutterComp.layer(name)
    if (!layer) return
    const { index } = layer
    const sizeToAdd = 84

    const layerComp = cutterComp.layers.precompose([index], name, true)
    layerComp.parentFolder = screens
    // layerComp.width += sizeToAdd
    layerComp.height += sizeToAdd
    const marker = markers.find(({ name: videoName }) => videoName === name)
    let compColor = 0
    if (marker) compColor = marker.label
    layerComp.label = compColor
    const compLayer = layerComp.layer(name)
    compLayer.timeRemapEnabled = true
    compLayer.property('timeRemap').setValueAtTime(3, 0)
    const layerPosition = compLayer.property('position')
    const newPosition = [layerPosition.value[0], layerPosition.value[1] + sizeToAdd]
    layerPosition.setValue(newPosition)

    const dark = false
    const topBarName = dark ? 'Top Bar Dark' : 'Top Bar'
    const topBarLayer = layerComp.layers.add(getComp(topBarName))
    topBarLayer.name = 'bar'
    const topPosition = topBarLayer.height / 2
    const leftPosition = topBarLayer.width / 2
    topBarLayer.property('position').setValue([leftPosition, topPosition])

    const footageInMainComp = mainComp.layers.add(layerComp)
    footageInMainComp.applyPreset(File(`${path}/presets/cutter/footage-border.ffx`))
    footageInMainComp.startTime = getFootageStartTime(name)
    footageInMainComp.threeDLayer = true
    footageInMainComp.label = compColor
    const footagePosition = footageInMainComp.property('position')
    const footageLeft = arrIndex * (footageInMainComp.width + 100)
    
    footagePosition.setValue([footageLeft, footagePosition.value[1], -100])
    
    const FocusPointTracker = getComp('Focus Point Tracker')
    const focusTracker = layerComp.layers.add(FocusPointTracker)
    focusTracker.name = 'Focus Point'
    focusTracker.moveBefore(compLayer)
    focusTracker.parent = compLayer
    
    if (backup && backup.footages) {
      const focusPoints = backup.footages.focusPoints[name]
      if (focusPoints) {
        focusTracker.property('position').setValuesAtTimes(focusPoints.times, focusPoints.values)
      }
      
      const timeRemaps = backup.footages.timeRemaps[name]
      if (timeRemaps) {
        compLayer.property('timeRemap').setValuesAtTimes(timeRemaps.times, timeRemaps.values)
      }
    }
  })

  mainComp.openInViewer()
  mainComp.layer('Camera').moveToBeginning()
}

function resetVariables() {
  videos = { all: [] }
}

function start() {
  app.beginUndoGroup('Cutter')

  resetVariables()

  footage = getComp(footageName)
  
  clearEverything()

  createChangesComp()
  createCutterComp()
  splitToCompositions()
  
  app.endUndoGroup()
}

exports.ui = buildUI
