var fs = require('fs')
var path = require('path')
var express = require('express')
const { execSync } = require('child_process')

var app = express()
app.use(express.static(__dirname + '/public'))
console.log(__dirname+'/public')

var hostname = '127.0.0.1'
var port = 8131

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname + '/index.html'))
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
    res.status('500').send()
    return
  }

  latestFilepath = path.join(nbtPhotoDir, latestDatetime, latestBasename)
  latestFile = 'public/latest.jpg'

  console.log(latestFilepath, latestFile)

  fs.copyFileSync(latestFilepath, latestFile)

  res.status('200').send()
  return

})

app.get('/start', async function(req, res) {

  timelapseTime = 600
  fps = 24
  clipLength = 3
  nFrames = fps*clipLength
  interval=timelapseTime/nFrames

  var date = new Date()
  datetimeISO = date.toISOString()

  photoDir = 'public/NBT_photos/'

  saveDir = path.join(photoDir,datetimeISO)
  fs.mkdirSync(saveDir);
  console.log(saveDir)

  gphoto2 = 'gphoto2'
  captureImageAndDownloadFlag = '--capture-image-and-download'
  filenameFlag = '--filename='
  forceOverwriteFlag = '--force-overwrite'

  index = 0
  errorCounter = 0
  maxNError = 3
  res.setHeader('Content-Type', 'application/json');
  while (index < nFrames) {
    startTime = new Date()

    paddedIndex = index.toString().padStart(4,'0')
    filename=`NBT_${paddedIndex}.%C`

    filepath = path.join(saveDir,filename)

    execCommand = [gphoto2, captureImageAndDownloadFlag, filenameFlag+filepath, forceOverwriteFlag].join(' ')
    console.log('Running...',execCommand)

    try {

      stdout = execSync(execCommand)
      res.write(JSON.stringify({i: index, n: nFrames}))

      index++

      postCaptureTime = new Date()

      remainingTime = interval - (startTime - postCaptureTime)

      console.log(remainingTime/1000)
      await new Promise(resolve => setTimeout(resolve, remainingTime));

      estimatedTime = (timelapseTime)-((index+1)*interval)
      console.log(`Waiting... Estimated time remaining: ${estimatedTime} seconds...`)

    }

    catch (error) {
      console.log('ERROR!')
      try { 
        stderr = error.stderr.toString()
        console.log(stderr)

        // this only occurs when the camera is interrupted before downloading the files
        if (stderr.includes('*** Error: I/O in progress ***')){
          console.log('ERROR: I/O, restarting loop...')
        }

        else if (stderr.includes('*** Error: No camera found. ***')){
          console.log('ERROR: No camera found! Restarting loop.')
        }

        else {
          console.log('ERROR: Unknown error! Restarting loop.')
          console.log(stderr)
        }

      }
      catch {
        stderr = console.log(error.toString())
        console.log(stderr)
      }

      index = 0
      errorCounter++

    }

    if (errorCounter > maxNError){
      console.log('ERROR: Too many I/O errors stopping timelapse...')
      res.status('500').send()
      return
    }

  }
  res.end()
})

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
} 

app.listen(port, () => console.log('Server started on port: '+port))
