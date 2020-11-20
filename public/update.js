function timedRefresh(img) {
    // just change src attribute, will always trigger the onload callback
    img.src = img.src.split('?')[0] + '?d=' + Date.now()
}

function main(){

  var timeoutPeriod = 1000
  var x=0, y=0
  var img = new Image()
  img.src = 'latest.jpg'

  img.onload = function() {
      var canvas = document.getElementById('canvas')
      var context = canvas.getContext('2d')
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      context.drawImage(img, (canvas.width-img.width)/2, (canvas.height-img.height)/2)
      setTimeout(() => timedRefresh(img),timeoutPeriod)
  }

}

main()
