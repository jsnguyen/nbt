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
    // Call your python script here.
    // I prefer using spawn from the child process module instead of the Python shell
    const scriptPath = './public/get_latest_jpg.py'
    console.log(scriptPath)
    const process = spawn('python3', [scriptPath])

    process.stdout.on('data', (myData) => {
        console.log(decodeURIComponent(escape(myData)))
        res.send("Done!")
    })

    process.stderr.on('data', (myErr) => {
      console.log(decodeURIComponent(escape(myErr)))
    })
})

app.listen(port, () => console.log('Server started on port: '+port))
