var progressInterval = null

function prepPayload(type, data){
  return JSON.stringify({type: type, payload: data})
}

function getLatestJPG() {
  ws.send(prepPayload('getLatestJPG',true))
  updateImage()
}

function getProgress() {
  ws.send(prepPayload('getProgress',true))
}
 
function updateProgress(messageJSON) {

  var elem = document.getElementById("myBar");
  if (messageJSON['frameTotal'] == 0){
    var percentage = 0
  } else {
    var percentage = messageJSON['framesLeft']/messageJSON['frameTotal']
  }

  document.getElementById("progressPercentage").innerHTML = String((percentage*100).toFixed(2)) + '%'
  document.getElementById("progressInterval").innerHTML = String(messageJSON['interval']) + 's'
  document.getElementById("progressIndex").innerHTML = String(messageJSON['framesLeft']) + ' of ' + String(messageJSON['frameTotal'])
  let width = percentage*100
  console.log(width)

  elem.style.width = (isFinite(width) ? String(width) : '0') + '%'

  if ( progressInterval && ! messageJSON['running']){
    clearInterval(progressInterval)
  }

}

function startTimelapse() {
  ws.send(prepPayload('startTimelapse',true))

  progressInterval = setInterval( () => {
    getProgress(progressInterval)
  }, 1000);

}

function stopTimelapse() {
  if (confirm('Stop timelapse?')){
  ws.send(prepPayload('stopTimelapse',true))
  clearInterval(progressInterval)
  }
}

function submitTimelapseSettings() {
  var timelapseTime = document.getElementById("timelapseTimeInput").value;
  var clipLength = document.getElementById("clipLengthInput").value;
  var payload = {timelapseTime: timelapseTime, clipLength: clipLength}

  ws.send(prepPayload('inputTimelapseParameters',payload))
}


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

  img.src = img.src.split('?')[0] + '?d=' + Date.now()

}

function main(){
  updateImage()

  document.addEventListener('DOMContentLoaded', () => {
    // Get the modal
    var modal = document.getElementById("myModal");

    // Get the button that opens the modal
    var btn = document.getElementById("timelapseSettingsButton");

    // Get the <span> element that closes the modal
    var span = document.getElementsByClassName("close")[0];

    // When the user clicks the button, open the modal
    btn.onclick = function() {
      modal.style.display = "block";
    }

    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
      modal.style.display = "none";
      submitTimelapseSettings()
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
      if (event.target == modal) {
        modal.style.display = "none";
        submitTimelapseSettings()
      }
    }
  });

}

const ws = new WebSocket('ws://192.168.0.110:8131')

ws.onopen = function open() {
  console.log('CLIENT: Websocket open!')
  getLatestJPG()
  updateProgress()
}

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

  else if(messageJSON['type'] == 'getLatestJPGReply'){
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

}

main()
