function refresh(img) {
  // just change src attribute, will always trigger the onload callback
  img.src = img.src.split('?')[0] + '?d=' + Date.now()
}

function getLatestJPG() {
  console.log('Getting latest JPG...')

  fetch('/get_latest_jpg')
  .then( response => response.json() )
  .then( responseJSON => {
    console.log(responseJSON)
    if (responseJSON['isNew']){
      updateImage()
    }
  })
}

function updateCameraParameters(){
  fetch('/camera_parameters')
  .then( response => response.json() )
  .then( responseJSON => {
    console.log(responseJSON)
    document.getElementById("focalLength").innerHTML = responseJSON['Focal Length']+'mm';
    document.getElementById("focalRatio").innerHTML = responseJSON['F-Number'];
    document.getElementById("ISO").innerHTML = 'ISO '+ responseJSON['ISO Speed'];
    document.getElementById("shutterSpeed").innerHTML = responseJSON['Shutter Speed 2']+'s';
  })
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
  refresh(img)

}

function getState(interval = null) {
  var elem = document.getElementById("myBar");

  fetch('/state')
  .then( response => response.json() )
  .then( responseJSON => {
    console.log(responseJSON)

    if (responseJSON['frameTotal'] == 0){
      var percentage = 0
    } else {
      var percentage = responseJSON['framesLeft']/responseJSON['frameTotal']
    }

    document.getElementById("progressPercentage").innerHTML = String((percentage*100).toFixed(2)) + '%'
    document.getElementById("progressInterval").innerHTML = String(responseJSON['interval']) + 's'
    document.getElementById("progressIndex").innerHTML = String(responseJSON['framesLeft']) + ' of ' + String(responseJSON['frameTotal'])
    let width = percentage*100
    console.log(width)

    elem.style.width = (isFinite(width) ? String(width) : '0') + '%'

    if ( interval && ! responseJSON['running']){
      clearInterval(interval)
    }

  })
}

function toggleStartStop(){
  /*
  var startButtonIcon = document.getElementById("startButtonIcon")
  if(startButtonIcon.className=="fa fa-play") {
    startButtonIcon.className = "fa fa-stop";
  } else {
    startButtonIcon.className = "fa fa-play";
  }
  */
  startTimelapse()

  var interval = setInterval( () => {
    getLatestJPG()
    getState(interval)
  }, 1000);

}

function startTimelapse() {
  console.log('Starting timelapse...')

  fetch('/start').then(function(response) {
    console.log('Start timelapse response receieved!')
  })
}

function submitTimelapseSettings() {
  var timelapseTime = document.getElementById("timelapseTimeInput").value;
  var clipLength = document.getElementById("clipLengthInput").value;
  var payload = {timelapseTime: timelapseTime, clipLength: clipLength}

  fetch('input', {
      method: 'POST', // or 'PUT'
      headers: {
            'Content-Type': 'application/json',
          },
      body: JSON.stringify(payload),
  })
  .then(response => response.json())
  .then(data => {
      console.log('SUCCESS:', data);
  })
  .catch((error) => {
      console.error('ERROR:', error);
  });
}

function main(){
  updateImage()
  updateCameraParameters()
  getLatestJPG()

  document.addEventListener('DOMContentLoaded', () => {
    getState()
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

  const ws = new WebSocket('ws://192.168.0.110:8131')

  ws.onopen = function open() {
    ws.send('I have connected!')
    console.log('CLIENT: Websocket open!')
    
  }

  ws.onmessage = function incoming(message) {
    var payload = JSON.parse(message.data)
    console.log('CLIENT: Received ', payload)
  }

}

main()
