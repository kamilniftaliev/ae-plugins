const {
  log,
  getComp,
  showWindow,
  ProgressBar,
} = require('./common')

const ui = {}
const comps = {}
let voice
let music
let volume = -7
let transition = 0.3
let voiceLayer
const frameRate = 60
const { path } = File($.fileName)

function buildUI() {
  const panel = win.add('panel', undefined, 'Audio', { borderStyle: 'black' })

  panel.add('staticText', undefined, 'Audio volumes adjuster').justify = 'center'

  const itemNames = []
  const { items } = app.project
  for (let i = 1; i <= items.length; i++) {
    const { hasAudio, hasVideo, name } = items[i]
    if (hasAudio && !hasVideo) itemNames.push(name)
  }
  
  panel.add('staticText', undefined, 'Select the voice').justify = 'center'
  ui.voice = panel.add('dropdownlist', undefined, itemNames)
  ui.voice.selection = itemNames.length - 1
  
  panel.add('staticText', undefined, 'Select the backround music').justify = 'center'
  ui.music = panel.add('dropdownlist', undefined, itemNames)
  ui.music.selection = 0
  
  const volumeTitle = panel.add('staticText', undefined, `Decrease volume for ${volume} db`)
  volumeTitle.justify = 'center'
  ui.volume = panel.add('slider', undefined, volume, -50, 20)
  ui.volume.onChanging = function onVolumeChange() {
    const val = parseInt(this.value, 10)
    ui.volume.value = val
    volumeTitle.text = `Decrease volume for ${val} db`
  }
  
  const transitionTitle = panel.add('staticText', undefined, `Transition time ${transition}sec.`)
  transitionTitle.justify = 'center'
  ui.transition = panel.add('slider', undefined, transition, 0.1, 3)
  ui.transition.onChanging = function onTransitionChange() {
    ui.transition.value = this.value
    transitionTitle.text = `Transition time ${this.value}sec.`
  }

  comps.main = getComp('Main')

  ui.adjustVolumeBtn = panel.add('button', undefined, 'Adjust Volume')
  ui.adjustVolumeBtn.onClick = function cutFootage() {
    try {
      voice = getComp(ui.voice.selection.text)
      music = getComp(ui.music.selection.text)
      transition = ui.transition.value
      volume = ui.volume.value

      win.progress = ProgressBar({ title: 'Audio adjuster' })
      start()
    } catch (e) {
      log(e)
    }
  }

  panel.hide()

  return panel
}

function reset() {
  comps.audio = getComp('Audio')
  if (comps.audio) comps.audio.remove()

  comps.audio = app.project.items.addComp('Audio', 4, 4, 1.0, voice.duration + 10, frameRate)

  const amplitude = getComp('Audio Amplitude')
  if (amplitude) amplitude.remove()

  voiceLayer = comps.audio.layers.add(voice)
  voiceLayer.name = 'Voice'
  voiceLayer.selected = true
}

function convertVoiceToKeyframes(callback, delay) {
  setTimeout(() => {
    win.progress.up(12)
    app.executeCommand(app.findMenuCommandId('Convert Audio to Keyframes'))
    win.progress.up(17)

    setTimeout(callback, delay)
  }, 500)
}

function adjustVolume() {
  win.progress.up(20)
  const amplitude = comps.audio.layer('Audio Amplitude')

  amplitude.inPoint = voiceLayer.inPoint
  amplitude.outPoint = voiceLayer.outPoint
  const musicLayer = comps.audio.layers.add(music)
  musicLayer.name = 'Music'

  amplitude.Effects.property('Left Channel').remove()
  amplitude.Effects.property('Right Channel').remove()
  const amplitudeSlider = amplitude.Effects.property('Both Channels')('Slider')
  const musicLevelProp = musicLayer.property('audioLevels')

  const isTalking = index => amplitudeSlider.keyValue(index) > 0.2
  
  const volumes = []
  const sameAfterFrames = 15
  const { BEZIER } = KeyframeInterpolationType
  
  for (let i = 1; i <= amplitudeSlider.numKeys; i++) {
    const keyTime = amplitudeSlider.keyTime(i)
    let musicVolume

    if (i < amplitudeSlider.numKeys - sameAfterFrames) {
      if (isTalking(i) && isTalking(i + sameAfterFrames)) {
        musicVolume = volume
      } else if (!isTalking(i) && !isTalking(i + sameAfterFrames)) {
        musicVolume = 0
      }
    } else {
      musicVolume = 0
    }

    const prevMusicVolume = volumes[volumes.length - 1]
    if (typeof musicVolume === 'number' && prevMusicVolume !== musicVolume) {
      volumes.push(musicVolume)
      const transitionEndTime = musicVolume < 0 ? keyTime + (transition / 2) : keyTime
      if (i > frameRate * transition) musicLevelProp.addKey(transitionEndTime - transition)
      musicLevelProp.setValueAtTime(transitionEndTime, [musicVolume, musicVolume])
      musicLevelProp.setInterpolationTypeAtKey(musicLevelProp.nearestKeyIndex(transitionEndTime), BEZIER, BEZIER)
    }
  }
  win.progress.up(100)
}

function start() {
  app.beginUndoGroup('Audio')

  win.progress.up(5)
  reset()
  win.progress.up(10)

  convertVoiceToKeyframes(adjustVolume, 4000)
  
  comps.audio.openInViewer()
  app.endUndoGroup()
}

// buildUI()
exports.ui = buildUI
