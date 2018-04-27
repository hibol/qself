import numpy as np
from flask import Flask, request, jsonify
import json
import pandas as pd
import os
import datetime

data = [["2018-03-30T18:49:10.123Z","2018-03-30T18:49:11.533Z",1,0,"abdos"],["2018-03-30T18:49:13.688Z","2018-03-30T18:49:15.252Z",1,0,"squats"]]
now = datetime.datetime.now()

# save the data to a file
file_name = now.strftime("%Y-%m-%d-%H-%M-%S") + '.csv'
data_frame = pd.DataFrame(data)
data_frame.to_csv(os.path.join('recordings', file_name), index=False, header=['timestart','timestop', 'duration', 'reps', 'sport'])
