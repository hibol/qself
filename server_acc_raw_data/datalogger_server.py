import numpy as np
from flask import Flask, request, jsonify
import json
import pandas as pd
import os

app = Flask(__name__)

recordings_session_length = {}

def compute_server_status():
    server_status = ''
    for key in recordings_session_length:
        server_status += key + ' -> ' + str(recordings_session_length[key]) + ' samples\n'
    return server_status

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        data = request.get_json()


        for key in data:
                                            # save the data to a file
            file_name = key.replace('.', '_').replace(':', '_').replace(' ', '_') + '.csv'
            data_frame = pd.DataFrame.from_dict(data=data[key], orient='index').sort_index()
            data_frame.reset_index(inplace=True)
            data_frame.to_csv(os.path.join('recordings', file_name), index=False, header=['timestamp','x', 'y', 'z'])
                                            # update the state of the session
            recordings_session_length[key] = len(data[key])
            
#        server_response = compute_server_status()
        return jsonify(recordings_session_length)
        
    elif request.method == 'GET':
#        server_response = compute_server_status()
        return jsonify(recordings_session_length)
        
    else:
        return 'Error. Nothing to show'


if __name__ == '__main__':
    app.run(host= '0.0.0.0')
