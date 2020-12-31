
function prepPayload(type, data){
  return JSON.stringify({type: type, payload: data})
}

function getLatestJPG() {
  console.log('Getting latest JPG...')
  ws.send(prepPayload('getLatestJPG',true))
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
}

main()
