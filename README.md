# Nothing But Time (NBT)

NBT is a Node.js based webserver controller for taking timelapses from an attached PTP camera. Needs gphoto2.

![NBT Setup](nbt_pic.jpg "My setup!" =250x)

In my experience I've found it frustrating to take a multi-hour timelapses, only to find that the image is consistently underexposed or out of focus. NBT tries to solve these issues by letting you see the timelapse on your mobile device as it's running.

If all this seems like a lot of work just to see the timelapse as it's happening, that's because it is! But in the future I hope to add an interface for a motorized linear slider or motorized pan head, hopefully that justifies the initial investment of time to make this.

This was designed to run on a Raspberry Pi, broadcasting its own wifi network. You can connect to this network and load the Node.js server and see the timelapse progressing. You can also control the timelapse settings from any mobile device with a browser (but this is optimized for smartphones). The Node.js server loads on startup of the RPi.

![NBT interface](interface_pic.jpg "The interface!" =250x)

## Notes

By default the server runs on `192.168.0.1:8131`.

The timelapse takes photos by default to `public/nbt/NBT_photos`. I have a 128GB USB drive mounted to that point so that when the timelapse is done, I can just pull the drive and plug it into my computer for processing.

Currently processing the photos using DaVinci Resolve, which seems to be able to handle many high resolution frames fairly easily.

By default, this assumes a 24 FPS frame rate, since that's the minimum that you need for persistence of vision.

I also included the 3d printed hotshoe mount for my RPi+Battery. Might not be useful to everyone, probably need a more specific mounting solution for a given setup.

