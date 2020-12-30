var fs = require('fs')
var path = require('path')
var express = require('express')
const { exec } = require('child_process')

var app = express()

app.use(express.static(__dirname + '/public'))
app.use(express.json())

console.log(__dirname+'/public')

var hostname = '127.0.0.1'
var port = 8131

global.state = {running: false,
                framesLeft: 0,
                frameTotal: 0,
                timeUntilNextFrame: 0,
                interval: 0}

global.previousJPG = ''

global.timelapseSettings = {timelapseTime: 0,
                            clipLength: 0}

global.minimumTime = 9.2405 // as measured by measure_minimum_time.sh

const timelapseSettingsFilename = 'public/timelapse_settings.json'

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname + '/index.html'))
})

app.get('/state', function(req, res) {
  res.send(global.state)
})

app.get('/get_latest_jpg', function(req, res) {

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
    res.send({isNew: false})
    return
  }

  latestFilepath = path.join(nbtPhotoDir, latestDatetime, latestBasename)
  if (latestFilepath == global.previousJPG){
    console.log('File is the same! Not changing...')
    res.send({isNew: false})
    return
  }

  global.previousJPG = latestFilepath
  latestFile = 'public/latest.jpg'

  console.log(latestFilepath, latestFile)

  fs.copyFileSync(latestFilepath, latestFile)

  res.send({isNew: true})
  return

})

app.get('/start', async function(req, res) {
  if (global.state['running']){
    res.status('400').send()
    return
  }

  //global.timelapseTime = 10
  //global.clipLength = 1

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

  global.state['running'] = true
  global.state['frameTotal'] = nFrames
  global.state['interval'] = interval

  var errorCounter = 0
  var maxNError = 3

  res.status('200').send()

  for (let index=0; index < nFrames; index++) {
    let startTime = new Date()

    let paddedIndex = index.toString().padStart(4,'0')
    let filename = `NBT_${paddedIndex}.%C`

    let filepath = path.join(saveDir,filename)

    var execCommand = [gphoto2, captureImageAndDownloadFlag, filenameFlag+filepath, forceOverwriteFlag].join(' ')
    console.log('Running...', execCommand)
    try {

      var response = await execPromise(execCommand)
      global.state['framesLeft'] = index+1

      var postCaptureTime = new Date()

      var remainingTime = interval - (postCaptureTime - startTime)/1000

      sleep(remainingTime)

      var estimatedTime = (global.timelapseSettings['timelapseTime'])-((index+1)*interval)
      console.log(`Waiting... Estimated time remaining: ${estimatedTime} seconds...`)
      global.state['timeUntilNextFrame'] = remainingTime/1000

    }

    catch (error) {

      var stderr = error.toString()

      // this only occurs when the camera is interrupted before downloading the files
      if (stderr.includes('*** Error: I/O in progress ***')){
        console.log('ERROR: I/O, restarting loop...')
        index = 0
        errorCounter++
      }

      if (stderr.includes('*** Error (-110: \'I/O in progress\') ***')){
        console.log('ERROR: I/O, restarting loop...')
        index = 0
        errorCounter++
      }

      else if (stderr.includes('*** Error: No camera found. ***')){
        console.log('ERROR: No camera found! Exiting...')
        global.state['running'] = false 
        res.status('500').send()
        return
      }

      else {
        console.log('ERROR: Unknown error! Exiting...')
        console.log(stderr)
        global.state['running'] = false 
        res.status('500').send()
        return
      }

    }

    if (errorCounter > maxNError){
      console.log('ERROR: Too many I/O errors stopping timelapse...')
      global.state['running'] = false 
      res.status('500').send()
      return
    }

  }

  global.state['running'] = false 
  /*
  global.state['framesLeft'] = 0
  global.state['frameTotal'] = 0
  global.state['timeUntilNextFrame'] = 0
  global.state['interval'] = 0
  */

})

app.get('/camera_parameters', async (req, res) => {
  var gphoto2 = 'gphoto2'
  var getAllConfigFlag = '--list-all-config'

  /*
  var getConfigFlag = '--get-config'
  parameters = ['focallength', 'f-number', 'shutterspeed2', 'iso', 'batterylevel', 'lightmeter']

  for (let param of parameters){
    console.log(param)
    var execCommand = [gphoto2, getConfigFlag, param].join(' ')
    var response = await execPromise(execCommand)
    console.log(response)
  }
  */

  try {
    var execCommand = [gphoto2, getAllConfigFlag].join(' ')
    var response = await execPromise(execCommand)

    var parameters = {'Focal Length':null,
                      'F-Number':null,
                      'Shutter Speed 2':null,
                      'ISO Speed':null,
                      'Battery Level':null,
                      'Light Meter':null}

    for (let param of Object.keys(parameters)){
      var index = response.split('\n').indexOf('Label: ' + param)
      let value = (response.split('\n')[index+3].split(' ').pop())
      parameters[param] = value
    }

    console.log(parameters)
    res.send(parameters)
    return

  }

  catch (error) {
    var stderr = error.toString()

    if (stderr.includes('Could not detect any camera')){
      console.log('ERROR: No camera found! Exiting...')
      res.status('500').send()
      return
    }
  }


})

app.post('/input', (req, res) => {
  global.timelapseSettings['clipLength'] = Number(req.body['clipLength'])
  global.timelapseSettings['timelapseTime'] = Number(req.body['timelapseTime'])

  storeData(global.timelapseSettings, timelapseSettingsFilename)
})

function storeData (data, path) {
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
    setTimeout(resolve, ms);
  });
} 

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(stderr)
      } else {
        resolve(stdout)
      }
    });
  });
}

app.listen(port, () => console.log('Server started on port: '+port))
global.timelapseSettings = JSON.parse(loadData(timelapseSettingsFilename))
console.log('Previous timelapse settings:', global.timelapseSettings)
