#!/bin/bash

TIMEFORMAT=%R

for i in {1..100}; do
  { time $(gphoto2 --capture-image-and-download --force-overwrite --quiet > /dev/null); } 2>> measured_time.txt
done
