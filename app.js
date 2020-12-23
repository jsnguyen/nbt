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

  latestBasename = basenames.filter( a => a.includes(".jpg")).pop()

  latestFilepath = path.join(nbtPhotoDir, latestDatetime, latestBasename)
  latestFile = 'public/latest.jpg'

  console.log(latestFilepath, latestFile)

  fs.copyFileSync(latestFilepath, latestFile)

  res.status("200").send()

})

app.get('/start', function(req, res) {
  startTimelapse(req,res)
})

async function startTimelapse(req, res){
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

  for (i=0; i<nFrames; i++){
    startTime = new Date()

    paddedIndex = i.toString().padStart(4,'0')
    filename=`NBT_${paddedIndex}.%C`

    filepath = path.join(saveDir,filename)

    execCommand = [gphoto2, captureImageAndDownloadFlag, filenameFlag+filepath, forceOverwriteFlag].join(' ')
    console.log(execCommand)

    stdout = execSync(execCommand)
    console.log(stdout)
    res.status("200").send()

    postCaptureTime = new Date()

    remainingTime = interval - (startTime - postCaptureTime)

    console.log(remainingTime/1000)
    await new Promise(resolve => setTimeout(resolve, remainingTime));

  }

}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
} 

app.listen(port, () => console.log('Server started on port: '+port))
