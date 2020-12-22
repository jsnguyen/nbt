var fs = require('fs')
var path = require('path')
var express = require('express')
const { spawn } = require('child_process')

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

  latestBasename = basenames.filter( a => a.includes(".JPG")).pop()

  latestFilepath = path.join(nbtPhotoDir, latestDatetime, latestBasename)
  latestFile = 'public/latest.jpg'

  console.log(latestFilepath, latestFile)

  fs.copyFileSync(latestFilepath, latestFile)

  res.send("Done!") // need to send this at the end

})

app.listen(port, () => console.log('Server started on port: '+port))
