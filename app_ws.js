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

function loadData(path) {
  try {
    return fs.readFileSync(path, 'utf8')
  } catch (err) {
    console.error(err)
    return false
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
    console.log(error)

    if (stderr.includes('Could not detect any camera')){
      console.log('ERROR: No camera found! Exiting...')
      return
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

function initialization(){
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

function prepPayload(type, data){
  return JSON.stringify({type: type, payload: data})
}

wss.on('connection', function connection(ws) {
  console.log('SERVER: Websocket open!')
  ws.send(prepPayload('cameraConnected',global.cameraConnected))
  ws.send(prepPayload('cameraParameters',global.cameraParameters))

  ws.on('message', function incoming(message) {
    var messageJSON = JSON.parse(message)
    console.log('SERVER: Received ', messageJSON)
    if (messageJSON['type'] == 'getLatestJPG'){
      getLatestJPG()
    }
  })

})

