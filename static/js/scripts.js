document.addEventListener('DOMContentLoaded', function() {
    populateDatasets();
});

function populateDatasets() {
    fetch('/datasets')
        .then(response => response.json())
        .then(datasets => {
            const select = document.getElementById('dataset-dropdown');
            datasets.forEach(dataset => {
                const option = document.createElement('option');
                option.value = dataset;
                option.textContent = dataset;
                select.appendChild(option);
            });
            select.dispatchEvent(new Event('change'));
        });
}

function updateElementButtons(dataset) {
    fetch(`/columns/${dataset}`)
        .then(response => response.json())
        .then(columns => {
            const container = document.getElementById('element-buttons');
            container.innerHTML = ''; // Clear previous buttons
            columns.forEach(column => {
                const button = document.createElement('button');
                button.textContent = column;
                button.addEventListener('click', () => {
                    const timeMin = document.getElementById('time-range-min').value || undefined;
                    const timeMax = document.getElementById('time-range-max').value || undefined;
                    const binWidth = document.getElementById('bin-width').value || 1;
                    updatePlot(dataset, column, [timeMin, timeMax], binWidth);
                });
                container.appendChild(button);
            });
        });
}

function updatePlot(dataset, element, timeRange, binWidth) {
    const payload = {
        dataset,
        element,
        timeRange: [timeRange[0] || null, timeRange[1] || null],
        binWidth: binWidth || null
    };

    fetch('/histogram', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        drawHistogram(data);
    });
}

function drawHistogram(data) {
    // Clear the previous histogram
    const histogramContainer = document.getElementById('histogram');
    histogramContainer.innerHTML = '';

    // Set the dimensions for the SVG
    const margin = { top: 20, right: 30, bottom: 40, left: 50 },
          width = 600 - margin.left - margin.right,
          height = 400 - margin.top - margin.bottom;

    // Append the SVG object to the container 
    const svg = d3.select(histogramContainer).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform",
              "translate(" + margin.left + "," + margin.top + ")");

    // X axis: scale it to fit between 0 and the width of the SVG
    const x = d3.scaleLinear()
        .domain([d3.min(data.binCenters), d3.max(data.binCenters)])    
        .range([0, width]);
    svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x));

    // Y axis: scale it to fit between 0 and the height of the SVG
    const y = d3.scaleLinear()
        .domain([0, d3.max(data.counts)])
        .range([height, 0]);
    svg.append("g")
      .call(d3.axisLeft(y));
    console.log(data.binCenters, data.counts, data.binWidth);

   // Assume there's more than one bin for simplicity in this fix
   let gap = 1; // Gap in pixels you want between bars. Adjust as needed.
    
   // Ensure barWidth calculation does not result in a negative value after subtracting the gap
   let barWidth = data.binCenters.length > 1 ? Math.max(x(data.binCenters[1]) - x(data.binCenters[0]) - gap, 1) : 10; // Use a minimum bar width of 1 to avoid negative values
   
   svg.selectAll("rect")
       .data(data.counts)
       .enter().append("rect")
           .attr("x", (d, i) => x(data.binCenters[i]) - barWidth / 2)
           .attr("y", d => y(d))
           .attr("width", barWidth)
           .attr("height", d => height - y(d))
           .attr("fill", "#69b3a2");

    /* // Draw quantile lines
    data.quantiles.forEach(q => {
        svg.append("line")
            .attr("x1", x(q))
            .attr("x2", x(q))
            .attr("y1", 0)
            .attr("y2", height)
            .style("stroke", "red")
            .style("stroke-dasharray", ("3, 3"));

        svg.append("text")
            .attr("x", x(q))
            .attr("y", -5)
            .text(q.toFixed(2))
            .style("text-anchor", "middle")
            .style("fill", "red");
    }); */

    // Display the range with the highest occurrence
    const rangeText = document.getElementById('range-text');
    rangeText.innerHTML = `Most frequent range: ${data.maxCountRange[0]}-${data.maxCountRange[1]} (Count: ${data.maxCountValue})`;
}


// Event listeners for the dataset dropdown change
document.getElementById('dataset-dropdown').addEventListener('change', function() {
    updateElementButtons(this.value);
});

// Optional: Implement the functionality to update plots based on time range and bin width inputs.
// Add event listeners to the input fields for time range and bin width
/* document.getElementById('time-range-min').addEventListener('change', updatePlotBasedOnInputs);
document.getElementById('time-range-max').addEventListener('change', updatePlotBasedOnInputs);
document.getElementById('bin-width').addEventListener('change', updatePlotBasedOnInputs);

function updatePlotBasedOnInputs() {
    // Get the currently selected dataset and element
    const dataset = document.getElementById('dataset-dropdown').value;
    // The element is a bit trickier since it's dynamically generated buttons. You might keep track of the last clicked element.
    const elementButtons = document.getElementById('element-buttons').getElementsByTagName('button');
    let selectedElement = null;
    for (let button of elementButtons) {
        if (button.classList.contains('selected')) { // Assuming you add 'selected' class on click
            selectedElement = button.textContent;
            break;
        }
    }
    
    // If no element is selected yet, just return without doing anything
    if (!selectedElement) return;
    
    // Get the time range and bin width inputs
    const timeMin = document.getElementById('time-range-min').value || undefined;
    const timeMax = document.getElementById('time-range-max').value || undefined;
    const binWidth = document.getElementById('bin-width').value || 1;
    
    // Call updatePlot to refresh the histogram based on the new inputs
    updatePlot(dataset, selectedElement, [timeMin, timeMax], binWidth);
} */

// Make sure to update the part where you handle element button clicks to mark the selected element
document.getElementById('element-buttons').addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON') {
        // Mark the clicked button as selected
        Array.from(this.getElementsByTagName('button')).forEach(button => button.classList.remove('selected'));
        e.target.classList.add('selected');
        
        // Immediately update the plot with the currently selected time range and bin width
        updatePlotBasedOnInputs();
    }
}, true); // Use capturing to handle clicks on dynamically added buttons

document.addEventListener('DOMContentLoaded', function() {
    populateDatasets();

    document.getElementById('update-plot').addEventListener('click', function() {
        // Gather all input values
        const dataset = document.getElementById('dataset-dropdown').value;
        const timeMin = document.getElementById('time-range-min').value;
        const timeMax = document.getElementById('time-range-max').value;
        const binWidth = document.getElementById('bin-width').value;
        const selectedElement = getSelectedElement(); // You'll need to implement this function to determine which element is selected

        // Call updatePlot with the gathered values
        updatePlot(dataset, selectedElement, [timeMin, timeMax], binWidth);
    });
});

function getSelectedElement() {
    // Implement this function based on how you mark which element is selected.
    // This is just a placeholder example:
    const buttons = document.querySelectorAll('#element-buttons button');
    for (const button of buttons) {
        if (button.classList.contains('selected')) {
            return button.textContent;
        }
    }
}