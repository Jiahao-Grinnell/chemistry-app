from flask import Flask, jsonify, request, render_template
import pandas as pd
import numpy as np
import os
from numpy import percentile
from urllib.parse import unquote
import logging
import requests
import base64
from werkzeug.utils import secure_filename

app = Flask(__name__)
# Setup logging
logging.basicConfig(level=logging.DEBUG)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FOLDER = os.path.join(BASE_DIR, 'data')

def allowed_file(filename):
    return filename.lower().endswith('.xlsx')


@app.errorhandler(Exception)
def handle_exception(e):
    # you can omit the exception type if you don't need it
    app.logger.error(f'An error occurred: {str(e)}')
    return jsonify({'error': str(e)}), 500

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dates', methods=['GET'])
def get_dates():
    dates = [f for f in os.listdir(DATA_FOLDER) if os.path.isdir(os.path.join(DATA_FOLDER, f))]

    return jsonify(dates)

@app.route('/datasets/<date>', methods=['GET'])
def get_datasets(date):
    #print(date)
    date_folder = os.path.join(DATA_FOLDER, date)
    datasets = [f for f in os.listdir(date_folder) if f.endswith('.xlsx')]
    return jsonify(datasets)

@app.route('/columns/<date>/<dataset>', methods=['GET'])
def get_dataset_columns(date, dataset):
    try:
        dataset = unquote(dataset)
        date = unquote(date)
        file_path = os.path.join(DATA_FOLDER, date, dataset)
        #print('-------------')
        #print(file_path)
        #print('-------------')
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found.'}), 404
        
        df = pd.read_excel(file_path)
        #print(df)
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
    print('-------------')
    print(element)
    print('-------------')
    date = data.get('date')
    time_range = data.get('timeRange')
    num_bins = int(data.get('numBins', 10))  # Use numBins to specify the number of bins directly
    overflow_threshold = float(data.get('overflowThreshold')) if data.get('overflowThreshold') else None

    df = pd.read_excel(os.path.join(DATA_FOLDER, date,dataset))

    # Convert time range to floats, filter the dataframe based on the calculated time range
    time_min = float(time_range[0]) if time_range and time_range[0] is not None else df.iloc[:,0].min()
    time_max = float(time_range[1]) if time_range and time_range[1] is not None else df.iloc[:,0].max()
    df_filtered = df[(df[df.columns[0]] >= time_min) & (df[df.columns[0]] <= time_max)]

    if not df_filtered.empty:
        values = df_filtered[element].dropna()

        # Apply overflow threshold if provided
        if overflow_threshold is not None:
            overflow_values = values[values > overflow_threshold]
            values = values[values <= overflow_threshold]
            if not overflow_values.empty:
                values = pd.concat([values, pd.Series([overflow_threshold])])
                counts, bin_edges = np.histogram(values, bins=num_bins)
                counts[-1] += len(overflow_values) - 1  # Combine overflow values into the last bin
            else:
                counts, bin_edges = np.histogram(values, bins=num_bins)
        else:
            counts, bin_edges = np.histogram(values, bins=num_bins)

        bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2

        # Adjust bin labels if overflow is applied
        if overflow_threshold is not None:
            bin_centers[-1] = overflow_threshold  # Set the last bin center to overflow threshold

        # Find the bin with the highest frequency
        max_count_index = np.argmax(counts)
        max_count_range = (bin_edges[max_count_index], bin_edges[max_count_index + 1])
        max_count_value = counts[max_count_index]

        histogram_data = {
            'counts': counts.tolist(),
            'binCenters': bin_centers.tolist(),
            'binEdges': bin_edges.tolist(),
            'maxCountRange': max_count_range,
            'maxCountValue': int(max_count_value)  # Ensure JSON serialization
        }
    else:
        histogram_data = {'error': 'Filtered dataframe is empty'}

    return jsonify(histogram_data)
@app.route('/scatterplot', methods=['POST'])
def get_scatterplot_data():
    data = request.get_json()
    dataset = data['dataset']
    element = data['element']
    date = data.get('date')
    y_scale_max = float(data.get("yScaleMax")) if data.get("yScaleMax") else None

    df = pd.read_excel(os.path.join(DATA_FOLDER,date, dataset))

    if not df.empty:
        times = df.iloc[:, 0].dropna().tolist()  # Assuming the first column is the time step
        values = df[element].dropna().tolist()

        scatterplot_data = {
            'times': times,
            'values': values,
            'yScaleMax': y_scale_max,
        }
    else:
        scatterplot_data = {'error': 'Dataframe is empty'}

    return jsonify(scatterplot_data)

if __name__ == '__main__':
    app.run(debug=True)
