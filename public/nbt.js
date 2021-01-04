// Simple message passing with the type and the payload
function prepPayload(type, data){
  return JSON.stringify({type: type, payload: data})
}

// Ask for the latest image
function getLatestImage() {
  ws.send(prepPayload('getLatestImage',true))
  updateImage()
}

// Updates the canvas nicely without having to swap the src of html imgs
function updateImage(){
  var x=0, y=0
  var img = new Image()
  img.src = 'latest.jpg'

  img.onload = function() {
    var canvas = document.getElementById('canvas')
    var context = canvas.getContext('2d')

    // only works for horizontal images of a standard size (3:2) for now!
    canvas.width = window.innerWidth*0.9
    scalingFactor = canvas.width/img.width
    canvas.height = img.height*scalingFactor

    context.drawImage(img, 0, 0, canvas.width, img.height*scalingFactor)
  }

}

// Ask for the current progress
function getProgress() {
  ws.send(prepPayload('getProgress',true))
}
 
// Updates the progress on the progress bar
function updateProgress(messageJSON) {

  var elem = document.getElementById("progressBar");
  if (messageJSON['frameTotal'] == 0){
    var percentage = 0
  } else {
    var percentage = messageJSON['framesLeft']/messageJSON['frameTotal']
  }

  document.getElementById("progressPercentage").innerHTML = String((percentage*100).toFixed(2)) + '%'
  document.getElementById("progressInterval").innerHTML = String(messageJSON['interval']) + 's'
  document.getElementById("progressIndex").innerHTML = String(messageJSON['framesLeft']) + ' of ' + String(messageJSON['frameTotal'])

  var runningElement = document.getElementById("running")
  if(messageJSON['running']){
    runningElement.innerHTML = 'Running!'
    runningElement.style.color = '#66ff33'
  }
  else {
    runningElement.innerHTML = 'Stopped!'
    runningElement.style.color = '#ff0000'
  }

  let width = percentage*100
  elem.style.width = (isFinite(width) ? String(width) : '0') + '%'

}

// Ask for the current parameters for the timelapse in the modal
function getTimelapseParameters() {
  ws.send(prepPayload('getCurrentTimelapseParameters',true))
}

// Updates the timelapse settings in the modal
function updateTimelapseParameters(payload) {
  document.getElementById("timelapseTimeInput").value = Number(payload['timelapseTime'])
  document.getElementById("clipLengthInput").value = Number(payload['clipLength'])
  document.getElementById("framesPerSecond").innerHTML = payload['framesPerSecond']+' fps'
}

// Start the timelapse
function startTimelapse() {
  ws.send(prepPayload('startTimelapse',true))
}

// Stop the timelapse
function stopTimelapse() {
  if (confirm('Stop timelapse?')){
    ws.send(prepPayload('stopTimelapse',true))
  }
}

// Reset the timelapse, also resets the progress bar
function resetTimelapse(){
  if (confirm('Reset timelapse?')){
    ws.send(prepPayload('resetTimelapse',true))
  }
}

// Submit the timelapse settings on close of the modal
function submitTimelapseSettings() {
  var timelapseTime = document.getElementById("timelapseTimeInput").value;
  var clipLength = document.getElementById("clipLengthInput").value;
  var payload = {timelapseTime: timelapseTime, clipLength: clipLength}

  ws.send(prepPayload('inputTimelapseParameters',payload))
}

// Initialization
function main() {
  updateImage()

  document.addEventListener('DOMContentLoaded', () => {

    var timelapseSettingsModal = document.getElementById("timelapseSettingsModal");
    var timelapseSettingsButton = document.getElementById("timelapseSettingsButton");
    var timelapseSettingsCloseButton = document.getElementsByClassName("timelapseSettingsCloseButton")[0];

    timelapseSettingsButton.onclick = function() {
      timelapseSettingsModal.style.display = "block";
    }

    timelapseSettingsCloseButton.onclick = function() {
      timelapseSettingsModal.style.display = "none";
      submitTimelapseSettings()
    }

    window.onclick = function(event) {
      if (event.target == timelapseSettingsModal) {
        timelapseSettingsModal.style.display = "none";
        submitTimelapseSettings()
      }
    }
  })
}
main()

// Start a new websocket connection
const ws = new WebSocket("ws://" + location.host)

ws.onopen = function open() {
  console.log('CLIENT: Websocket open!')
}

// Respond to queries from the server...
ws.onmessage = function incoming(message) {
  var messageJSON = JSON.parse(message.data)
  console.log('CLIENT: Received ', messageJSON)

  if(messageJSON['type'] == 'cameraConnected'){
    var cameraConnectedDotIcon = document.getElementById("cameraConnectedDotIcon");

    if(messageJSON['payload']){
      cameraConnectedDotIcon.style.color='#66ff33'
    }

    else if(!messageJSON['payload']){
      cameraConnectedDotIcon.style.color='#ff0000'
    }

  }

  else if(messageJSON['type'] == 'getLatestImageReply'){
    if (messageJSON['payload']){
      updateImage()
    }
  }

  else if(messageJSON['type'] == 'cameraParameters'){
    document.getElementById("focalLength").innerHTML = messageJSON['payload']['Focal Length']+'mm';
    document.getElementById("focalRatio").innerHTML = messageJSON['payload']['F-Number'];
    document.getElementById("ISO").innerHTML = 'ISO '+ messageJSON['payload']['ISO Speed'];
    document.getElementById("shutterSpeed").innerHTML = messageJSON['payload']['Shutter Speed 2']+'s';
  }

  else if(messageJSON['type'] == 'progress'){
    updateProgress(messageJSON['payload'])
  }

  else if(messageJSON['type'] == 'currentTimelapseParameters'){
    updateTimelapseParameters(messageJSON['payload'])
  }

}
