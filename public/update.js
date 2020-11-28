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

}

main()
