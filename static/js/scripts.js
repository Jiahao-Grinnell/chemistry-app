document.addEventListener('DOMContentLoaded', function() {
    populateDatasets();
});
function resetOverflowThreshold() {
    document.getElementById('overflow-threshold').value = null;
}

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
                    resetOverflowThreshold();

                    const timeMin = document.getElementById('time-range-min').value || undefined;
                    const timeMax = document.getElementById('time-range-max').value || undefined;
                    const numBins  = document.getElementById('bin-width').value || 10;
                    const overflowThreshold = document.getElementById('overflow-threshold').value || null;
                    //console.log(overflowThreshold);
                    updatePlot(dataset, column, [timeMin, timeMax], numBins, overflowThreshold);
                    updateScatterplot(dataset, column);
                });
                container.appendChild(button);
            });
        });
}

// Add function to update scatterplot
function updateScatterplot(dataset, element) {
    const payload = {
        dataset,
        element
    };

    fetch('/scatterplot', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        console.log("Scatterplot data received:", data);
        drawScatterplot(data);
    });
}

// Add function to draw scatterplot
function drawScatterplot(data) {
    // Clear the previous scatterplot
    const scatterplotContainer = document.getElementById('scatterplot');
    scatterplotContainer.innerHTML = '';

    if (!data.times || !data.values) {
        console.error("Invalid data format:", data);
        return;
    }

    // Set the dimensions for the SVG
    const margin = { top: 20, right: 30, bottom: 40, left: 50 },
          width = 600 - margin.left - margin.right,
          height = 400 - margin.top - margin.bottom;

    // Append the SVG object to the container 
    const svg = d3.select(scatterplotContainer).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // X axis
    const x = d3.scaleLinear()
        .domain([d3.min(data.times), d3.max(data.times)])
        .range([0, width]);
    svg.append("g")
       .attr("transform", "translate(0," + height + ")")
       .call(d3.axisBottom(x));

    // Y axis
    const y = d3.scaleLinear()
        .domain([d3.min(data.values), d3.max(data.values)])
        .range([height, 0]);
    svg.append("g")
       .call(d3.axisLeft(y));

    // Add dots
    svg.append('g')
       .selectAll("dot")
       .data(data.values)
       .enter()
       .append("circle")
         .attr("cx", (d, i) => x(data.times[i]))
         .attr("cy", d => y(d))
         .attr("r", 3)
         .style("fill", "#69b3a2")
         .on('mouseover', function(event,d) {
            const index = data.values.indexOf(d);
            const tooltip = d3.select('#scatterplot-tooltip');
            tooltip.text(`Time: ${data.times[index]}, Value: ${d}`);
         })
         .on('mouseout', function() {
            d3.select('#scatterplot-tooltip').text('');
         });

    // Append fixed tooltip text element
    d3.select(scatterplotContainer).select("svg")
      .append('text')
      .attr('id', 'scatterplot-tooltip')
      .attr('x', margin.left)
      .attr('y', height + margin.top + 40)  // Position it below the x-axis
      .attr('text-anchor', 'start')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', 'black');
}

function updatePlot(dataset, element, timeRange, numBins, overflowThreshold) {
    const payload = {
        dataset,
        element,
        timeRange: [timeRange[0] || null, timeRange[1] || null],
        numBins: numBins || null,
        overflowThreshold: overflowThreshold
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
        //console.log("Histogram data received:", data);
        drawHistogram(data, overflowThreshold);
    });
}

function drawHistogram(data, overflowThreshold) {
    // Clear the previous histogram
    const histogramContainer = document.getElementById('histogram');
    histogramContainer.innerHTML = '';

    if (!data.binCenters || !data.counts) {
        console.error("Invalid data format:", data);
        return;
    }

    // Set the dimensions for the SVG
    const margin = { top: 20, right: 30, bottom: 40, left: 50 },
          width = 600 - margin.left - margin.right,
          height = 400 - margin.top - margin.bottom;

    // Append the SVG object to the container 
    const svg = d3.select(histogramContainer).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Ensure there's a small buffer for the x domain to prevent bars from overlapping the y-axis
    const xMin = d3.min(data.binCenters);
    const xMax = d3.max(data.binCenters);

    if (xMin === undefined || xMax === undefined) {
        console.error("Invalid binCenters:", data.binCenters);
        return;
    }

    const xBuffer = (xMax - xMin) * 0.05;  // 5% buffer on each side of the x domain

    const x = d3.scaleLinear()
       .domain([xMin - xBuffer, xMax + xBuffer])    
       .range([0, width]);

    // Create the x-axis
    const xAxis = svg.append("g")
       .attr("transform", "translate(0," + height + ")")
       .call(d3.axisBottom(x));

    // Y axis: scale it to fit between 0 and the height of the SVG
    const y = d3.scaleLinear()
        .domain([0, d3.max(data.counts)])
        .range([height, 0]);
    svg.append("g")
      .call(d3.axisLeft(y));

    let gap = 1; // Gap in pixels you want between bars. Adjust as needed.
    let barWidth = data.binCenters.length > 1 ? Math.max(x(data.binCenters[1]) - x(data.binCenters[0]) - gap, 1) : 10; // Use a minimum bar width of 1 to avoid negative values
   
    svg.selectAll("rect")
       .data(data.counts)
       .enter().append("rect")
           .attr("x", (d, i) => x(data.binCenters[i]) - barWidth / 2)
           .attr("y", d => y(d))
           .attr("width", barWidth)
           .attr("height", d => height - y(d))
           .attr("fill", "#69b3a2")
           .on('mouseover', function (event, d, i) {
                d3.select(this).attr('opacity', 0.7); // Optional: change opacity or color on hover
                const xPosition = parseFloat(d3.select(this).attr('x')) + barWidth / 2;
                const yPosition = parseFloat(d3.select(this).attr('y')) / 2 + height / 2;

                // Append text to the SVG to show the count on hover
                const tooltipText = overflowThreshold && i === data.counts.length - 1 ? `>${overflowThreshold}: ${d}` : d;
                svg.append('text')
                   .attr('id', 'tooltip')
                   .attr('x', xPosition)
                   .attr('y', yPosition)
                   .attr('text-anchor', 'middle')
                   .attr('font-size', '12px')
                   .attr('font-weight', 'bold')
                   .attr('fill', 'black')
                   .text(tooltipText);
           })
           .on('mouseout', function () {
                d3.select(this).attr('opacity', 1); // Optional: reset opacity or color on mouseout
                d3.select('#tooltip').remove(); // Remove the text element from the SVG
           });

    // Adjust x-axis labels if overflow is applied
    if (overflowThreshold !== null) {
        xAxis.selectAll(".tick text")
            .filter(function(d) { return d === parseFloat(overflowThreshold); })
            .text(`> ${overflowThreshold}`);
    }

    // Display the range with the highest occurrence
    const rangeText = document.getElementById('range-text');
    rangeText.innerHTML = `Most frequent range: ${data.maxCountRange[0]}-${data.maxCountRange[1]} (Count: ${data.maxCountValue})`;
}



// Event listeners for the dataset dropdown change
document.getElementById('dataset-dropdown').addEventListener('change', function() {
    resetOverflowThreshold();
    updateElementButtons(this.value);
});



// Make sure to update the part where you handle element button clicks to mark the selected element
document.getElementById('element-buttons').addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON') {
        // Mark the clicked button as selected
        Array.from(this.getElementsByTagName('button')).forEach(button => button.classList.remove('selected'));
        e.target.classList.add('selected');
        
        // Immediately update the plot with the currently selected time range and bin width
        //updatePlotBasedOnInputs();
    }
}, true); // Use capturing to handle clicks on dynamically added buttons

document.addEventListener('DOMContentLoaded', function() {
    populateDatasets();

    document.getElementById('update-plot').addEventListener('click', function() {
        // Gather all input values
        const dataset = document.getElementById('dataset-dropdown').value;
        const timeMin = document.getElementById('time-range-min').value;
        const timeMax = document.getElementById('time-range-max').value;
        const numBins = document.getElementById('bin-width').value;
        const overflowThreshold = document.getElementById('overflow-threshold').value || null;
        const selectedElement = getSelectedElement();

        // Call updatePlot with the gathered values
        updatePlot(dataset, selectedElement, [timeMin, timeMax], numBins, overflowThreshold);
        updateScatterplot(dataset, selectedElement);
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


