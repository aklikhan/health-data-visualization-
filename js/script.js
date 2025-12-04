// Load data from CSV file
d3.csv("data/health_data.csv").then(function(rawData) {
    
    // Convert numeric fields
    let data = rawData.map(d => ({
        ...d,
        SEXVAR: +d.SEXVAR,
        GENHLTH: d.GENHLTH ? +d.GENHLTH : null,
        PHYSHLTH: d.PHYSHLTH ? +d.PHYSHLTH : null,
        MENTHLTH: d.MENTHLTH ? +d.MENTHLTH : null,
        _BMI5: d._BMI5 ? +d._BMI5 : null,
        _TOTINDA: d._TOTINDA ? +d._TOTINDA : null,
        SMOKE100: d.SMOKE100 ? +d.SMOKE100 : null,
        _AGEG5YR: +d._AGEG5YR
    }));

    console.log("Dataset loaded:", data);
    console.log("Total records:", data.length);
    console.log("Sample record:", data[0]);

    // Dimensions
    const margin = {top: 40, right: 150, bottom: 60, left: 60};
    const width = 1000 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    let xScale = d3.scaleLinear().range([0, width]);
    let yScale = d3.scaleLinear().range([height, 0]);
    let colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Axes
    const xAxisGroup = svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`);

    const yAxisGroup = svg.append("g")
        .attr("class", "axis");

    // Axis labels
    const xLabel = svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + 45);

    const yLabel = svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -45);

    // Tooltip
    const tooltip = d3.select(".tooltip");

    // Color mapping labels
    const colorLabels = {
        GENHLTH: {
            1: "Excellent",
            2: "Very Good",
            3: "Good",
            4: "Fair",
            5: "Poor",
            7: "Don't Know"
        },
        SEXVAR: {
            1: "Male",
            2: "Female"
        },
        _TOTINDA: {
            1: "Active",
            2: "Inactive"
        },
        SMOKE100: {
            1: "Yes",
            2: "No"
        }
    };

    // Update function
    function updateChart() {
        const xVar = document.getElementById("xAxis").value;
        const yVar = document.getElementById("yAxis").value;
        const colorVar = document.getElementById("colorBy").value;

        // Filter valid data
        const validData = data.filter(d => 
            d[xVar] != null && d[yVar] != null && d[colorVar] != null
        );

        // Update scales
        xScale.domain([0, d3.max(validData, d => d[xVar]) * 1.1]);
        yScale.domain([0, d3.max(validData, d => d[yVar]) * 1.1]);
        
        const colorDomain = [...new Set(validData.map(d => d[colorVar]))].sort();
        colorScale.domain(colorDomain);

        // Update axes with animation
        xAxisGroup.transition().duration(1000)
            .call(d3.axisBottom(xScale));
        
        yAxisGroup.transition().duration(1000)
            .call(d3.axisLeft(yScale));

        // Update labels
        xLabel.text(getAxisLabel(xVar));
        yLabel.text(getAxisLabel(yVar));

        // Bind data
        const circles = svg.selectAll("circle")
            .data(validData, d => d.SEQNO);

        // Exit - remove old circles
        circles.exit()
            .transition()
            .duration(500)
            .attr("r", 0)
            .remove();

        // Enter + Update - add new circles and update existing ones
        circles.enter()
            .append("circle")
            .attr("r", 0)
            .attr("cx", d => xScale(d[xVar]))
            .attr("cy", d => yScale(d[yVar]))
            .merge(circles)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", 8);
                
                tooltip
                    .style("opacity", 1)
                    .html(`
                        <strong>${getAxisLabel(xVar)}:</strong> ${d[xVar].toFixed(2)}<br>
                        <strong>${getAxisLabel(yVar)}:</strong> ${d[yVar].toFixed(2)}<br>
                        <strong>${getAxisLabel(colorVar)}:</strong> ${getColorLabel(colorVar, d[colorVar])}<br>
                        <strong>Age Group:</strong> ${d._AGEG5YR}
                    `)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 15) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", 5);
                
                tooltip.style("opacity", 0);
            })
            .transition()
            .duration(1000)
            .attr("cx", d => xScale(d[xVar]))
            .attr("cy", d => yScale(d[yVar]))
            .attr("r", 5)
            .attr("fill", d => colorScale(d[colorVar]))
            .attr("opacity", 0.7);

        // Update legend
        updateLegend(colorVar, colorDomain);
        updateStats(validData);
    }

    // Legend function
    function updateLegend(colorVar, colorDomain) {
        svg.selectAll(".legend").remove();

        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width + 20}, 0)`);

        legend.append("text")
            .attr("class", "legend-title")
            .attr("y", -5)
            .text(getAxisLabel(colorVar));

        colorDomain.forEach((value, i) => {
            const legendRow = legend.append("g")
                .attr("transform", `translate(0, ${i * 25})`);

            legendRow.append("rect")
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", colorScale(value))
                .attr("opacity", 0.7);

            legendRow.append("text")
                .attr("x", 20)
                .attr("y", 12)
                .text(getColorLabel(colorVar, value));
        });
    }

    // Helper functions
    function getAxisLabel(variable) {
        const labels = {
            _BMI5: "Body Mass Index (BMI)",
            PHYSHLTH: "Physical Health Days (past 30)",
            MENTHLTH: "Mental Health Days (past 30)",
            GENHLTH: "General Health",
            SEXVAR: "Sex",
            _TOTINDA: "Physical Activity",
            SMOKE100: "Smoked 100+ Cigarettes"
        };
        return labels[variable] || variable;
    }

    function getColorLabel(variable, value) {
        return colorLabels[variable]?.[value] || value;
    }

    function updateStats(validData) {
        document.getElementById("totalRecords").textContent = validData.length;
        
        const avgBMI = d3.mean(validData.filter(d => d._BMI5), d => d._BMI5);
        document.getElementById("avgBMI").textContent = avgBMI ? avgBMI.toFixed(1) : "N/A";
        
        const avgPhys = d3.mean(validData.filter(d => d.PHYSHLTH), d => d.PHYSHLTH);
        document.getElementById("avgPhys").textContent = avgPhys ? avgPhys.toFixed(1) : "N/A";
        
        const avgMent = d3.mean(validData.filter(d => d.MENTHLTH), d => d.MENTHLTH);
        document.getElementById("avgMent").textContent = avgMent ? avgMent.toFixed(1) : "N/A";
    }

    // Event listeners
    document.getElementById("xAxis").addEventListener("change", updateChart);
    document.getElementById("yAxis").addEventListener("change", updateChart);
    document.getElementById("colorBy").addEventListener("change", updateChart);
    document.getElementById("resetBtn").addEventListener("click", () => {
        document.getElementById("xAxis").value = "_BMI5";
        document.getElementById("yAxis").value = "PHYSHLTH";
        document.getElementById("colorBy").value = "GENHLTH";
        updateChart();
    });

    // Initial chart render
    updateChart();

}).catch(function(error) {
    console.error("Error loading data:", error);
});
