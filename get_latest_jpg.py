#!/usr/local/bin/python3

import os
import subprocess

def main():
    nbt_dir = 'NBT'
    latest_folder = sorted(os.listdir(nbt_dir))[-1] 
    latest_file = sorted(os.listdir(os.path.join(nbt_dir,latest_folder)))[-1]

    full_input_path = os.path.join(nbt_dir,latest_folder,latest_file)
    full_output_path = os.path.join('./public','latest.jpg')

    convert_to_jpeg_command = ['magick', full_input_path, '-resize', '1000x1000', '-strip', '-interlace', 'Plane', '-gaussian-blur', '0.05', '-quality', '85' , full_output_path]
    print(convert_to_jpeg_command)
    print('Converting... {} to {}'.format(full_input_path, full_output_path))
    process = subprocess.Popen(convert_to_jpeg_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = process.communicate()
    stdout = stdout.decode("utf-8") 
    stderr = stderr.decode("utf-8") 
    print(stdout, stderr)

    print('Done!')

if __name__=='__main__':
    main()
