from flask import Flask, jsonify, request, render_template
import pandas as pd
import numpy as np
import os
from numpy import percentile
from urllib.parse import unquote
import logging

app = Flask(__name__)
# Setup logging
logging.basicConfig(level=logging.DEBUG)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FOLDER = os.path.join(BASE_DIR, 'data')

@app.errorhandler(Exception)
def handle_exception(e):
    # you can omit the exception type if you don't need it
    app.logger.error(f'An error occurred: {str(e)}')
    return jsonify({'error': str(e)}), 500

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/datasets', methods=['GET'])
def get_datasets():
    datasets = [f for f in os.listdir(DATA_FOLDER) if f.endswith('.xlsx')]
    #dataset = unquote(dataset)
    return jsonify(datasets)

@app.route('/columns/<dataset>', methods=['GET'])
def get_dataset_columns(dataset):
    try:
        dataset = unquote(dataset)
        file_path = os.path.join(DATA_FOLDER, dataset)
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found.'}), 404
        df = pd.read_excel(file_path)
        return jsonify(list(df.columns[1:]))
    except Exception as e:
        error_message = f'An error occurred: {e}'
        app.logger.error(error_message, exc_info=True)
        return jsonify({'error': error_message}), 500
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
