#!/usr/local/bin/python3

import os
import time
import subprocess
import argparse
import itertools
import datetime
from pathlib import Path

# make sure lightmeter values are okay...
# Get the initial exposure values from aperture priority mode 

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('timelapse_time', help='Length of time in seconds.', type=float)
    parser.add_argument('clip_length', help='Length of the resulting timelapse clip in seconds.', type=float)
    parser.add_argument('--fps', help='Length of the resulting timelapse clip in seconds.', type=float, default=24)
    parser.add_argument('--unit', help='Unit of the timelapse_time.', type=str, default='s')
    args = parser.parse_args()

    unit_multiplier = 1
    if args.unit == 'm':
        unit_multiplier = 60
    elif args.unit == 'h':
        unit_multiplier = 60*60

    print('TIMELAPSE_TIME: {} seconds'.format(unit_multiplier*args.timelapse_time))

    gphoto2 = 'gphoto2'
    trigger_capture = '--trigger-capture'
    capture_image = '--capture-image'
    capture_image_and_download = '--capture-image-and-download'

    save_to_ram = '--set-config capturetarget=0' # Saving to ram we have a small buffer... Buffer also needs to be cleared after 12 photos!
    save_to_memory_card = '--set-config capturetarget=1' # Saving to memory card we have a much larger buffer but cant go as fast...

    aperture = '--get-config f-number'
    shutter_speed = '--get-config shutter-speed'
    iso = '--get-config iso'

    battery_status = '--get-config batterystatus'
    battery_status = '--get-config availableshots'
    battery_status = '--get-config lightmeter'

    force_overwrite = '--force-overwrite'

    config_command = [gphoto2, save_to_ram]
    process = subprocess.Popen(config_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    #stdout, stderr = process.communicate()

    n_frames = int(args.fps*args.clip_length)
    interval = unit_multiplier*args.timelapse_time/n_frames
    print('N_FRAMES: {}'.format(n_frames))
    print('INTERVAL: {} seconds'.format(interval))
    
    save_dir = 'NBT/'+str(datetime.datetime.now().isoformat())
    Path(save_dir).mkdir(parents=True, exist_ok=True)
    save_prefix ='NBT'
    index = 0
    max_n_error = 2
    error_counter = 0
    while index < n_frames:

        start_time = time.time()

        filename = '--filename='
        save_name = '{}_{}.NEF'.format(save_prefix, str(index).zfill(4))
        full_save_path = os.path.join(save_dir,save_name)
        print('{}/{} Saving to: {}'.format(index+1,n_frames,full_save_path))

        take_photo_command = [gphoto2, capture_image_and_download, filename+full_save_path, force_overwrite]
        process = subprocess.Popen(take_photo_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate()
        stdout = stdout.decode("utf-8") 
        stderr = stderr.decode("utf-8") 
        #print(stdout, stderr)

        if 'I/O in progress' in stderr:
            print('ERROR: I/O, restarting loop...')
            index = 0
            error_counter += 1
            if error_counter > max_n_error:
                print('ERROR: Too many I/O errors stopping program...')
                return
        else:
            index += 1

        post_capture_time = time.time()
        delta_time = post_capture_time-start_time # time spent actually taking the photo and downloading it...
        
        remaining_time = interval-delta_time # leftover time to wait to match the requested time per image capture
        if remaining_time < 0:
            print('Behind schedule by {:.3f} seconds'.format(delta_time-interval))
            remaining_time = 0

        print('Waiting... Estimated time remaining: {} seconds...'.format((unit_multiplier*args.timelapse_time)-((index+1)*interval)))
        time.sleep(remaining_time)

if __name__=='__main__':
    main()
