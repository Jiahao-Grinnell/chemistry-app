from flask import Flask, jsonify, request, render_template
import pandas as pd
import numpy as np
import os
from numpy import percentile

app = Flask(__name__)

DATA_FOLDER = './data'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/datasets', methods=['GET'])
def get_datasets():
    datasets = [f for f in os.listdir(DATA_FOLDER) if f.endswith('.xlsx')]
    return jsonify(datasets)

@app.route('/columns/<dataset>', methods=['GET'])
def get_dataset_columns(dataset):
    df = pd.read_excel(os.path.join(DATA_FOLDER, dataset))
    return jsonify(list(df.columns[1:]))

@app.route('/histogram', methods=['POST'])
def get_histogram_data():
    data = request.json
    dataset = data['dataset']
    element = data['element']
    time_range = data.get('timeRange')
    num_bins = int(data.get('numBins', 10))  # Use numBins to specify the number of bins directly

    df = pd.read_excel(os.path.join(DATA_FOLDER, dataset))
    
    # Convert time range to floats, filter the dataframe based on the calculated time range
    time_min = float(time_range[0]) if time_range and time_range[0] is not None else df.iloc[:,0].min()
    time_max = float(time_range[1]) if time_range and time_range[1] is not None else df.iloc[:,0].max()
    df_filtered = df[(df[df.columns[0]] >= time_min) & (df[df.columns[0]] <= time_max)]

    if not df_filtered.empty:
        # Calculate histogram
        counts, bin_edges = np.histogram(df_filtered[element], bins=num_bins)
        bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2

        # Find the bin with the highest frequency
        max_count_index = np.argmax(counts)
        max_count_range = (bin_edges[max_count_index], bin_edges[max_count_index + 1])
        max_count_value = counts[max_count_index]

        histogram_data = {
            'counts': counts.tolist(),
            'binCenters': bin_centers.tolist(),
            'maxCountRange': max_count_range,
            'maxCountValue': int(max_count_value)  # Ensure JSON serialization
        }
    else:
        histogram_data = {'error': 'Filtered dataframe is empty'}

    return jsonify(histogram_data)

if __name__ == '__main__':
    app.run(debug=True)
