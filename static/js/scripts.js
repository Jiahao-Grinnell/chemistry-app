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
                    const numBins  = document.getElementById('bin-width').value || 10;
                    updatePlot(dataset, column, [timeMin, timeMax], numBins);
                });
                container.appendChild(button);
            });
        });
}

function updatePlot(dataset, element, timeRange, numBins) {
    const payload = {
        dataset,
        element,
        timeRange: [timeRange[0] || null, timeRange[1] || null],
        numBins: numBins  || null
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
    //console.log(data.binCenters); // Add this to debug
    // Right after receiving the data in your fetch's .then block


   // Ensure there's a small buffer for the x domain to prevent bars from overlapping the y-axis
   const xMin = d3.min(data.binCenters);
   const xMax = d3.max(data.binCenters);
   const xBuffer = (xMax - xMin) * 0.05;  // 1% buffer on each side of the x domain


   const x = d3.scaleLinear()
   .domain([xMin - xBuffer, xMax + xBuffer])    
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
    //console.log(data.binCenters, data.counts, data.binWidth);

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
           .attr("fill", "#69b3a2")
           .on('mouseover', function (event, d) {
            // Show tooltip on hover
            d3.select(this).attr('opacity', 0.7); // Optional: change opacity or color on hover
            const xPosition = parseFloat(d3.select(this).attr('x')) + barWidth / 2;
            const yPosition = parseFloat(d3.select(this).attr('y')) / 2 + height / 2;

            // Append text to the SVG to show the count on hover
            svg.append('text')
               .attr('id', 'tooltip')
               .attr('x', xPosition)
               .attr('y', yPosition)
               .attr('text-anchor', 'middle')
               .attr('font-size', '12px')
               .attr('font-weight', 'bold')
               .attr('fill', 'black')
               .text(d);
        })
        .on('mouseout', function () {
            // Remove tooltip on mouseout
            d3.select(this).attr('opacity', 1); // Optional: reset opacity or color on mouseout
            d3.select('#tooltip').remove(); // Remove the text element from the SVG
        });


    // Display the range with the highest occurrence
    const rangeText = document.getElementById('range-text');
    rangeText.innerHTML = `Most frequent range: ${data.maxCountRange[0]}-${data.maxCountRange[1]} (Count: ${data.maxCountValue})`;
}


// Event listeners for the dataset dropdown change
document.getElementById('dataset-dropdown').addEventListener('change', function() {
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
        const selectedElement = getSelectedElement(); // You'll need to implement this function to determine which element is selected

        // Call updatePlot with the gathered values
        updatePlot(dataset, selectedElement, [timeMin, timeMax], numBins);
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