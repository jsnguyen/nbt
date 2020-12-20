function timedRefresh(img) {
  // just change src attribute, will always trigger the onload callback
  img.src = img.src.split('?')[0] + '?d=' + Date.now()
}

function getLatestJPG() {
  console.log('Running...')
  fetch('/get_latest_jpg').then(function(response) {
    console.log(response);
      // Use the response sent here
  })
}

function main(){

  var timeoutPeriod = 1000
  var x=0, y=0
  var img = new Image()
  img.src = 'latest.jpg'

  img.onload = function() {
    var canvas = document.getElementById('canvas')
    var context = canvas.getContext('2d')

    // only works for horizontal images of a standard size (3:2) for now!
    canvas.width = window.innerWidth*0.6
    scalingFactor = canvas.width/img.width
    canvas.height = img.height*scalingFactor

    context.drawImage(img, 0, 0, canvas.width, img.height*scalingFactor)
    setTimeout(() => timedRefresh(img),timeoutPeriod)
  }

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
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    }
  });

}

function move() {
  var i = 0;
  if (i == 0) {
    i = 1;
    var elem = document.getElementById("myBar");
    var width = 10;
    var id = setInterval(frame, 10);
    function frame() {
      if (width >= 100) {
        clearInterval(id);
        i = 0;
      } else {
        width++;
        elem.style.width = width + "%";
        //elem.innerHTML = width  + "%";
      }
    }
  }
}

main()
