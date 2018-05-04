import numpy as np
from flask import Flask, request, jsonify
import json
import pandas as pd
import os
import datetime

app = Flask(__name__)

info = {}

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        data = request.get_json()
        print(data)
        now = datetime.datetime.now()

        # save the data to a file
        file_name = now.strftime("%Y-%m-%d-%H-%M-%S") + '.csv'
        data_frame = pd.DataFrame(data)
        print(data_frame)
        data_frame.to_csv(os.path.join('recordings', file_name), index=False, header=False, quoting=None)
        
        info['data_length'] = len(data_frame.index)
        
        return jsonify(info)
        
    elif request.method == 'GET':
        #server_response = compute_server_status()
        return jsonify(info)
        
    else:
        return 'Error. Nothing to show'


if __name__ == '__main__':
    app.run(host= '0.0.0.0')
