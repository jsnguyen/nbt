#!/usr/bin/python3

import subprocess
import json

# make sure lightmeter values are okay...
# Get the initial exposure values from aperture priority mode 
def get_parameter(parameter):
    gphoto2 = 'gphoto2'
    get_config = '--get-config'

    config_command = [gphoto2, get_config, parameter]
    process = subprocess.Popen(config_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = process.communicate()
    stdout = stdout.decode("utf-8") 
    stderr = stderr.decode("utf-8") 
    stdout_split = stdout.split()
    current_index = stdout_split.index('Current:')

    parameter_value = stdout_split[current_index+1]

    if parameter == 'f-number':
        parameter_value = float(parameter_value[2:])
    elif parameter == 'shutterspeed':
        parameter_value = float(parameter_value[:-1])
    elif parameter == 'iso':
        parameter_value = int(parameter_value)
    elif parameter == 'batterylevel':
        parameter_value = float(parameter_value[:-1])
    elif parameter == 'availableshots':
        parameter_value = int(parameter_value)
    elif parameter == 'lightmeter':
        parameter_value = int(parameter_value)

    return parameter_value

def main():

    useful_parameters={}
    #parameters_list = ['f-number', 'shutterspeed', 'iso', 'batterylevel', 'availableshots', 'lightmeter']
    parameters_list = ['focallength', 'f-number', 'shutterspeed2', 'iso', 'batterylevel', 'lightmeter']
    for el in parameters_list:
        useful_parameters[el] = get_parameter(el)

    print(useful_parameters)

    outfile='camera_parameters.json'
    with open(outfile, 'w') as f:
        json.dump(useful_parameters, f)

if __name__=='__main__':
    main()
