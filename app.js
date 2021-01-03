var WebSocket = require('ws');
var express = require('express')
const http = require('http');

const { exec } = require('child_process')
const fs = require('fs')
var path = require('path')

var app = express()
app.use(express.static(__dirname + '/public'))
app.use(express.json())

const port = 8131

global.progress = {running: false,
                   framesLeft: 0,
                   frameTotal: 0,
                   timeUntilNextFrame: 0,
                   interval: 0}

global.timelapseSettings = {timelapseTime: 0,
                            clipLength: 0}

global.cameraParameters = {'Focal Length': null,
                           'F-Number': null,
                           'Shutter Speed 2': null,
                           'ISO Speed': null,
                           'Battery Level': null,
                           'Light Meter': null}


global.previousJPG = ''
global.minimumTime = 9.2405 // as measured by measure_minimum_time.sh
global.cameraConnected = false
const timelapseSettingsFilename = 'public/timelapse_settings.json'

global.connectedWebSockets = []

global.stopTimelapseTrigger = false

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(stderr)
      } else {
        resolve(stdout)
      }
    })
  })
}

function saveData (data, path) {
  try {
    fs.writeFileSync(path, JSON.stringify(data))
  } catch (err) {
    console.error(err)
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  });
} 

function pollCameraConnection() {
  var gphoto2 = 'gphoto2'
  var autoDetectFlag = '--auto-detect'

  var execCommand = [gphoto2, autoDetectFlag].join(' ')
  console.log('Polling camera connection...')
  var cameraConnected = false

  return new Promise( async (resolve, reject) => {

    try {
      var response = await execPromise(execCommand)
      var nNewlines = response.split(/\r\n|\r|\n/).length
      cameraConnected = nNewlines > 3 // if greater than 3 then we have a camera connected
      global.cameraConnected = cameraConnected
      resolve(cameraConnected)
    }

    catch (error) {
      var stderr = error.toString()
      console.log('ERROR: Unknown error! Exiting...')
      console.log(stderr)
      reject(stderr)
    }
  });
}

async function continuousPollCameraConnection() {
  while(!global.cameraConnected){
    let response = await pollCameraConnection()
    console.log('Camera connection status:', response)
  }
}

async function getCameraParameters() {
  var gphoto2 = 'gphoto2'
  var getAllConfigFlag = '--list-all-config'

  try {
    var execCommand = [gphoto2, getAllConfigFlag].join(' ')
    var response = await execPromise(execCommand)

    for (let param of Object.keys(global.cameraParameters)){
      var index = response.split('\n').indexOf('Label: ' + param)
      let value = (response.split('\n')[index+3].split(' ').pop())
      global.cameraParameters[param] = value
    }

    console.log(global.cameraParameters)
    return

  }

  catch (error) {
    var stderr = error.toString()
    console.log('Camera parameters error!')

    if (error.includes('Could not detect any camera')){
      console.log('ERROR: No camera found! Exiting...')
      return
    }

    else if (error.includes('I/O problem')){
      console.log('ERROR: I/O problem found! May have to unplug/restart camera. Exiting...')
      return
    }
    else {
      console.log('ERROR: Unknown error!')
      console.log(error)
    }
  }
}

function getLatestJPG(){

  const getDirectories = source =>
    fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
  
  nbtPhotoDir = 'public/NBT_photos'
  nbtDirectories = getDirectories(nbtPhotoDir)

  latestDatetime  = nbtDirectories.sort().pop()

  latestDirectory = path.join(nbtPhotoDir, latestDatetime)
  basenames = fs.readdirSync(latestDirectory)

  latestBasename = basenames.filter( a => a.includes('.jpg')).pop()

  if (latestBasename == null) {
    console.log('WARNING: No file found in latest photos folder!')
    return
  }

  latestFilepath = path.join(nbtPhotoDir, latestDatetime, latestBasename)
  if (latestFilepath == global.previousJPG){
    console.log('File is the same! Not changing...')
    return
  }

  global.previousJPG = latestFilepath
  latestFile = 'public/latest.jpg'

  console.log(latestFilepath, latestFile)

  fs.copyFileSync(latestFilepath, latestFile)

  return

}

function prepPayload(type, data){
  return JSON.stringify({type: type, payload: data})
}

async function startTimelapse(){
  if (global.progress['running']){
    console.log('ERROR: Can\'t start timelapse! Already running!')
    return
  }

  var fps = 24
  var nFrames = fps*global.timelapseSettings['clipLength']
  var interval = global.timelapseSettings['timelapseTime']/nFrames

  var date = new Date()
  var datetimeISO = date.toISOString()

  var photoDir = 'public/NBT_photos/'

  var saveDir = path.join(photoDir,datetimeISO)
  fs.mkdirSync(saveDir);
  console.log(saveDir)

  var gphoto2 = 'gphoto2'
  var captureImageAndDownloadFlag = '--capture-image-and-download'
  var filenameFlag = '--filename='
  var forceOverwriteFlag = '--force-overwrite'

  global.progress['running'] = true
  global.progress['frameTotal'] = nFrames
  global.progress['interval'] = interval
  console.log('Interval: ', interval)

  var errorCounter = 0
  var maxNError = 3

  for (let index=0; index < nFrames; index++) {
    let startTime = new Date()

    let paddedIndex = index.toString().padStart(4,'0')
    let filename = `NBT_${paddedIndex}.%C`

    let filepath = path.join(saveDir,filename)

    var execCommand = [gphoto2, captureImageAndDownloadFlag, filenameFlag+filepath, forceOverwriteFlag].join(' ')
    console.log('Running...', execCommand)

    try {

      var response = await execPromise(execCommand)

      global.progress['framesLeft'] = index+1

      var postCaptureTime = new Date()

      var remainingTime = interval*1000 - (postCaptureTime - startTime)

      await sleep(remainingTime)
      console.log(`Remaining time in loop ${remainingTime}ms`)

      var estimatedTime = (global.timelapseSettings['timelapseTime'])-((index+1)*interval)
      console.log(`Waiting... Estimated time remaining: ${estimatedTime} seconds...`)
      global.progress['timeUntilNextFrame'] = remainingTime/1000

      if (global.stopTimelapseTrigger){
        global.stopTimelapseTrigger = false
        console.log('Stop timelapse requested!')
        global.progress['running'] = false 
        return
      }

    }

    catch (error) {

      var stderr = error.toString()

      // this only occurs when the camera is interrupted before downloading the files
      if (stderr.includes('*** Error: I/O in progress ***')){
        console.log('ERROR: I/O, restarting loop...')
        index = 0
        errorCounter++
      }

      else if (stderr.includes('*** Error (-110: \'I/O in progress\') ***')){
        console.log('ERROR: I/O, restarting loop...')
        index = 0
        errorCounter++
      }

      else if (stderr.includes('*** Error: No camera found. ***')){
        console.log('ERROR: No camera found! Exiting...')
        global.progress['running'] = false 
        return
      }

      else {
        console.log('ERROR: Unknown error! Exiting...')
        console.log(stderr)
        global.progress['running'] = false 
        return
      }

    }

    if (errorCounter > maxNError){
      console.log('ERROR: Too many I/O errors stopping timelapse...')
      global.progress['running'] = false 
      return
    }

  }

  global.progress['running'] = false 

}

function initialization(){

  const loadData = (path) => {
                   try {
                       return fs.readFileSync(path, 'utf8')
                     } catch (err) {
                       console.error(err)
                       return false
                     }
                   }

  global.timelapseSettings = JSON.parse(loadData(timelapseSettingsFilename))
  console.log('Previous timelapse settings:', global.timelapseSettings)
  continuousPollCameraConnection()
  getCameraParameters()
}

initialization()

const server = http.createServer( app )
const wss = new WebSocket.Server({ server: server })

server.listen(port, () => {
  console.log(`Server started at port: ${port}`)
});

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname + '/index.html'))
})

wss.on('connection', function connection(ws) {
  console.log('SERVER: Websocket open!')

  ws.send(prepPayload('cameraConnected',global.cameraConnected))
  ws.send(prepPayload('cameraParameters',global.cameraParameters))

  ws.on('message', function incoming(message) {
    var messageJSON = JSON.parse(message)
    console.log('SERVER: Received ', messageJSON)

    if (messageJSON['type'] == 'getLatestJPG'){
      getLatestJPG()
      ws.send(prepPayload('getLatestJPGReply',true))
    }

    else if (messageJSON['type'] == 'inputTimelapseParameters'){
      global.timelapseSettings['clipLength'] = Number(messageJSON['payload']['clipLength'])
      global.timelapseSettings['timelapseTime'] = Number(messageJSON['payload']['timelapseTime'])

      const storeData = (data, path) => {
        try {
          fs.writeFileSync(path, JSON.stringify(data))
        } catch (err) {
          console.error(err)
        }
      }
      storeData(global.timelapseSettings, timelapseSettingsFilename)

    }

    else if (messageJSON['type'] == 'startTimelapse'){
      startTimelapse()
    }

    else if (messageJSON['type'] == 'getProgress'){
      ws.send(prepPayload('progress', global.progress))
    }

    else if (messageJSON['type'] == 'stopTimelapse'){
      // only trigger when running timelapse
      if (global.progress['running']) {
        global.stopTimelapseTrigger = true
      }
    }

  })

})

