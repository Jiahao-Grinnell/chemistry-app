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
    bin_width = float(data.get('binWidth', 1))  # Ensure bin_width is a float, defaulting to 1

    df = pd.read_excel(os.path.join(DATA_FOLDER, dataset))
    
    #print('-------------')
    #print(df['time'])
    #print(time_max)
    #print('-------------')
    
    # Convert time range to floats
    time_min = float(data['timeRange'][0]) if data['timeRange'][0] is not None else df.iloc[:,0].min()
    time_max = float(data['timeRange'][1]) if data['timeRange'][1] is not None else df.iloc[:,0].max()
    
    # Filter the dataframe based on the calculated time range
    df_filtered = df[(df[df.columns[0]] >= time_min) & (df[df.columns[0]] <= time_max)]

    # Ensure bin_width is valid
    bin_width = max(bin_width, 0.0001)  # Avoid division by zero or negative widths
    
    # Calculate histogram
    if not df_filtered.empty:
        counts, bin_edges = np.histogram(df_filtered[element], bins=np.arange(df_filtered[element].min(), df_filtered[element].max() + bin_width, bin_width))
    else:
        counts, bin_edges = [], []

    bin_centers = 0.5 * (bin_edges[:-1] + bin_edges[1:])

    # Calculate quantiles
    #quantiles = df_filtered[element].quantile([0.25, 0.5, 0.75, 1.0]).tolist()
    # Calculate quantiles for the histogram frequencies (not the actual data values)
    """ counts_cumsum = np.cumsum(counts)  # Cumulative sum of counts
    total = counts_cumsum[-1]  # Total counts (for calculating percentiles)
    quantile_indices = [percentile(counts_cumsum, q) for q in [25, 50, 75, 100]]
    quantile_ranges = [np.digitize(q, counts_cumsum, right=True) for q in quantile_indices] """

    # Get the bin range for each quantile
    #quantiles_info = [{'percentile': p, 'range': (bin_edges[i], bin_edges[i+1])} for p, i in zip([25, 50, 75, 100], quantile_ranges)]
     # Find the bin with the highest frequency
    max_count_index = np.argmax(counts)
    
    max_count_range = (bin_edges[max_count_index], bin_edges[max_count_index + 1])
    max_count_value = counts[max_count_index]
    max_count_value = int(max_count_value.item())
    histogram_data = {
        'counts': counts.tolist(),
        'binCenters': bin_centers.tolist(),
        'maxCountRange': max_count_range,
        'maxCountValue': max_count_value
    }

    return jsonify(histogram_data)

if __name__ == '__main__':
    app.run(debug=True)
