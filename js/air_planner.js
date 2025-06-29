let rowCounter = 1;
let depthChart = null;

// Initialize the chart when page loads
document.addEventListener('DOMContentLoaded', function() {
	document.querySelectorAll('#tableBody tr').forEach(setupDragAndDrop);
	initializeChart();
	updateChart();
});

function initializeChart() {
	const ctx = document.getElementById('depthChart').getContext('2d');
	
	depthChart = new Chart(ctx, {
		type: 'line',
		data: {
			labels: [],
			datasets: [{
				label: 'duikprofiel',
				data: [],
				borderColor: '#99caf5',
				backgroundColor: 'rgba(102, 126, 234, 0.1)',
				borderWidth: 3,
				fill: true,
				pointBackgroundColor: '#99caf5',
				pointBorderColor: 'white',
				pointBorderWidth: 2,
				pointRadius: 6,
				pointHoverRadius: 8
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					display: true,
					position: 'top',
					labels: {
						font: {
							size: 14,
							weight: 'bold'
						},
						color: '#333'
					}
				},
				tooltip: {
					backgroundColor: 'rgba(0, 0, 0, 0.8)',
					titleColor: 'white',
					bodyColor: 'white',
					borderColor: 'rgb(102, 126, 234)',
					borderWidth: 1,
					callbacks: {
						label: function(context) {
							return `Depth: ${Math.abs(context.parsed.y)} meters`;
						},
						title: function(context) {
							if (context.length > 0) {
								const timeValue = context[0].parsed.x;
								return `Time: ${timeValue} minutes`;
							}
							return '';
						}
					}
				}
			},
			scales: {
				x: {
					type: 'linear',
					title: {
						display: true,
						text: 'Time (minutes)',
						font: {
							size: 14,
							weight: 'bold'
						},
						color: '#333'
					},
					grid: {
						color: 'rgba(0, 0, 0, 0.1)'
					},
					ticks: {
						color: '#666',
						stepSize: 1,
						callback: function(value) {
							return value + ' min';
						}
					}
				},
				y: {
					title: {
						display: true,
						text: 'Depth (meters)',
						font: {
							size: 14,
							weight: 'bold'
						},
						color: '#333'
					},
					reverse: true, // This inverts the Y-axis
					grid: {
						color: 'rgba(0, 0, 0, 0.1)'
					},
					ticks: {
						color: '#666',
						callback: function(value) {
							return Math.abs(value) + 'm';
						}
					}
				}
			},
			interaction: {
				intersect: false,
				mode: 'index'
			}
		}
	});
}

function updateChart() {
	if (!depthChart) return;
	
	const rows = document.querySelectorAll('#tableBody tr');
	const chartData = [];
	
	rows.forEach(row => {
		const timeAccInput = row.querySelector('Input[name="time_cumu_val"');
		const depthInput = row.querySelector('Input[name="depth_val"');
		
		if (timeAccInput && depthInput) {
			const minutes = parseFloat(timeAccInput.value) || 0;
			const depth = parseFloat(depthInput.value) || 0;
			
			chartData.push({ x: minutes, y: Math.abs(depth) });
		}
	});
	
	// Sort data by minutes to ensure proper line progression
	chartData.sort((a, b) => a.x - b.x);
	
	// Use actual time values - Chart.js will handle proper spacing automatically
	depthChart.data.labels = chartData.map(point => point.x);
	depthChart.data.datasets[0].data = chartData;
	depthChart.update();
}

function updateTimeAccumulated() {
	const rows = document.querySelectorAll('#tableBody tr');
	let cumulativeTime = 0;
	
	rows.forEach(row => {
		const timeAccInput = row.querySelector('Input[name="time_cumu_val"]');
		const minutesInput = row.querySelector('Input[name="time_val"]');
		
		if (timeAccInput && minutesInput) {
			const minutes = parseFloat(minutesInput.value) || 0;
			cumulativeTime += minutes;
			timeAccInput.value = cumulativeTime;
			
		}
	});
}

function updateDepthPressure() {
	const rows = document.querySelectorAll('#tableBody tr');
	let depthPressure = 1;
	
	rows.forEach(row => {
		const depthPressureInput = row.querySelector('Input[name="depth_pressure_val"]');
		const depthInput = row.querySelector('Input[name="depth_val"]');
		const depth = parseFloat(depthInput.value) || 0;
		depthPressure = (depth / 10) + 1;
		depthPressureInput.value = depthPressure;
	});
}

function updateAirConsumption() {
	const rows = document.querySelectorAll('#tableBody tr');
	const airConsumptionPreset = document.querySelector('Input[name="airConsumption_preset"]').value;
	let startPressure = 1.0;
	let currentPressure = 1.0;
	let timeValue = 0;
	
	rows.forEach(row => {
		const timeInput=row.querySelector('Input[name="time_val"]')
		const airConsumptionInput= row.querySelector('Input[name="air_consumption_val"]');
		const depthPressureInput = row.querySelector('Input[name="depth_pressure_val"]');
		const currentPressure = parseFloat(depthPressureInput.value);
		const timeValue=timeInput.value;
		airconsumption = (Math.abs((currentPressure-startPressure)/2)+Math.min(currentPressure, startPressure)) * airConsumptionPreset * timeValue;
		airConsumptionInput.value = airconsumption;
		startPressure = currentPressure;
	});
}
function updateRemainingPressure() {
	const rows = document.querySelectorAll('#tableBody tr');
	const airCylinderPreset = document.querySelector('Input[name="Flesdruk"]').value;
	console.log(airCylinderPreset)
	const airCylinderVolumePreset= document.querySelector('Input[name="Flesinhoud"]').value;
	console.log(airCylinderVolumePreset)
	
	let startCylinderPressure = airCylinderPreset;
	let remainingCylinderPressure = startCylinderPressure;
	
	rows.forEach(row => {
		const airConsumptionInput= row.querySelector('Input[name="air_consumption_val"]');
		const remainingCylinderPressureInput= row.querySelector('Input[name="remaining_pressure_val"]');
		const airConsumptionPressure = airConsumptionInput.value / airCylinderVolumePreset ;
		
		remainingCylinderPressure = startCylinderPressure- airConsumptionPressure;
		if(remainingCylinderPressure <=0){
			remainingCylinderPressureInput.value = 0
		} else {
			remainingCylinderPressureInput.value = Math.floor(remainingCylinderPressure);
		}

		
		startCylinderPressure = remainingCylinderPressure;
	});
}
// Add event listeners to update chart when data changes
function setupInputListeners(row) {
	const inputs = row.querySelectorAll('.editable');
	inputs.forEach(input => {
		input.addEventListener('input', function() {
			updateTimeAccumulated();
			updateDepthPressure();
			updateChart();
			updateAirConsumption();
			updateRemainingPressure();
			updateMetrics();

		   
		});
		input.addEventListener('change', function() {
			updateTimeAccumulated();
			updateDepthPressure();
			updateChart();
			updateAirConsumption();
			updateRemainingPressure();
			updateMetrics();

			
		});
	});
}

function addRow(time=0, depth=0) {
	const tableBody = document.getElementById('tableBody');
	const headerRow = document.getElementById('headerRow');
	const columnCount = headerRow.children.length - 2; // Exclude row number and actions columns
	
	rowCounter++;
	
	const newRow = document.createElement('tr');
	newRow.className = 'fade-in';
	
	// Row number
	const rowNumberCell = document.createElement('td');
	rowNumberCell.className = 'row-number drag-handle';
	rowNumberCell.textContent = rowCounter;
	newRow.appendChild(rowNumberCell);
	
	// Data columns
	for (let i = 0; i < columnCount; i++) {
		const cell = document.createElement('td');
		const input = document.createElement('input');
		
		// Set input type based on column
		if (i === 0) { // Time Accumulated
			input.type = 'number';
			input.placeholder = '0';
			input.step = '0.1';
			input.name='time_cumu_val';
			input.className = 'readonly';
			input.readOnly = true;
		} else if (i === 1) { // Time Minutes
			input.type = 'number';
			input.name="time_val";
			input.className = 'editable';
			input.placeholder = time;
			if (time || depth){
				input.value=time;
			} else {
				input.placeholder = '0';
			}
		} else if (i === 2) { // Depth
			input.type = 'number';
			if (time || depth){
				input.value=depth;
			} else {
				input.placeholder = '0';
			}
			input.step = '0.5';
			input.className = 'editable';
			input.name= "depth_val";
		} else if (i === 3) { // Pressure on Depth
			input.type = 'number';
			input.placeholder = '1.0';
			input.name="depth_pressure_val";
			input.step = '0.1';
			input.className = 'readonly';
			input.readOnly = true;
		} else if (i === 4) { // used air
			input.type = 'number';
			input.placeholder = '1.0';
			input.name="air_consumption_val";
			input.className = 'readonly';
			input.step = '0.1';
			input.readOnly= true;
		} else if (i === 5) { // used air
			input.type = 'number';
			input.placeholder = '1.0';
			input.name="remaining_pressure_val";
			input.className = 'readonly';
			input.step = '0.1';
			input.readOnly= true;
		} else {
			input.type = 'text';
			input.placeholder = 'Enter data...';
		}
		
		
		cell.appendChild(input);
		newRow.appendChild(cell);
	}
	
	
	// Actions column
	const actionsCell = document.createElement('td');
	actionsCell.className = 'actions';
	actionsCell.innerHTML = `
		<div class="move-buttons">
			<button class="btn btn-move" onclick="moveRowUp(this)" title="Move Up">↑</button>
			<button class="btn btn-move" onclick="moveRowDown(this)" title="Move Down">↓</button>
			<button class="btn btn-danger" onclick="deleteRow(this)">🗑️</button>
		</div>
	`;
	newRow.appendChild(actionsCell);

	// Make row draggable
	newRow.draggable = true;
	setupDragAndDrop(newRow);
	setupInputListeners(newRow);
	
	tableBody.appendChild(newRow);
	updateTimeAccumulated();
	updateChart();
	updateAirConsumption();
	updateRemainingPressure();
}

// Function to calculate total of 'time' column (time_val)
function getTotalTime() {
	const timeInputs = document.querySelectorAll('input[name="time_val"]');
	let total = 0;
	
	timeInputs.forEach(input => {
		const value = parseFloat(input.value) || 0;
		total += value;
	});
	
	return total;
}

// Function to get maximum depth
function getMaxDepth() {
	const depthInputs = document.querySelectorAll('input[name="depth_val"]');
	let max = 0;
	
	depthInputs.forEach(input => {
		const value = parseFloat(input.value) || 0;
		if (value > max) {
			max = value;
		}
	});
	
	return max;
}

// Function to calculate average depth
// Function to calculate time-weighted average depth including descent/ascent
function getAvgDepth() {
	const rows = document.querySelectorAll('#tableBody tr');
	let totalTimeWeightedDepth = 0;
	let totalTime = 0;
	let previousDepth = 0; // Starting depth is 0 (surface)
	
	rows.forEach(row => {
		const timeInput = row.querySelector('input[name="time_val"]');
		const depthInput = row.querySelector('input[name="depth_val"]');
		
		const time = parseFloat(timeInput?.value) || 0;
		const currentDepth = parseFloat(depthInput?.value) || 0;
		
		if (time > 0) { // Only count rows with time > 0
			// Calculate average depth for this time segment (linear interpolation)
			const segmentAvgDepth = (previousDepth + currentDepth) / 2;
			
			totalTimeWeightedDepth += time * segmentAvgDepth;
			totalTime += time;
		}
		
		// Update previous depth for next iteration
		previousDepth = currentDepth;
	});
	
	return totalTime > 0 ? totalTimeWeightedDepth / totalTime : 0;
}

// Function to calculate total air consumption
function getTotalAirConsumption() {
	const airInputs = document.querySelectorAll('input[name="air_consumption_val"]');
	let total = 0;
	
	airInputs.forEach(input => {
		const value = parseFloat(input.value) || 0;
		total += value;
	});
	
	return total;
}

// Function to get all calculations at once
function getAllCalculations() {
	return {
		totalTime: getTotalTime(),
		maxDepth: getMaxDepth(),
		avgDepth: getAvgDepth(),
		totalAirConsumption: getTotalAirConsumption()
	};
}

// Function to get all calculations at once
function getAllCalculations() {
	return {
		totalTime: getTotalTime(),
		maxDepth: getMaxDepth(),
		avgDepth: getAvgDepth(),
		totalAirConsumption: getTotalAirConsumption()
	};
}
// Optional: Function to get all calculations at once
function updateMetrics() {
	const calculations = getAllCalculations();
	document.getElementById('totalTime').textContent = calculations.totalTime.toFixed(1);
	document.getElementById('maxDepth').textContent = calculations.maxDepth.toFixed(1);
	document.getElementById('avgDepth').textContent = calculations.avgDepth.toFixed(1);
	document.getElementById('totalAirConsumption').textContent = calculations.totalAirConsumption.toFixed(1);
}

function add2Rows(){
	addRow();
	addRow();
}
function addSafetyStop(){
	addRow(0,5);
	addRow(3,5);
	addRow(0.5,0);
	updateMetrics();

}

function deleteRow(button) {
	const row = button.closest('tr');
	row.style.animation = 'fadeOut 0.3s ease';
	
	setTimeout(() => {
		row.remove();
		updateRowNumbers();
		updateTimeAccumulated();
		updateChart();
		updateAirConsumption();
		updateRemainingPressure();
		updateMetrics();
	}, 300);
}

function updateRowNumbers() {
	const rows = document.querySelectorAll('#tableBody tr');
	rows.forEach((row, index) => {
		const rowNumberCell = row.querySelector('.row-number');
		if (rowNumberCell) {
			rowNumberCell.textContent = index + 1;
		}
	});
	rowCounter = rows.length;
}

function moveRowUp(button) {
	const row = button.closest('tr');
	const previousRow = row.previousElementSibling;
	if (previousRow) {
		row.parentNode.insertBefore(row, previousRow);
		updateRowNumbers();
		updateTimeAccumulated();
		updateChart();
		updateAirConsumption();
		updateRemainingPressure();
	}
}

function moveRowDown(button) {
	const row = button.closest('tr');
	const nextRow = row.nextElementSibling;
	if (nextRow) {
		row.parentNode.insertBefore(nextRow, row);
		updateRowNumbers();
		updateTimeAccumulated();
		updateChart();
		updateAirConsumption();
		updateRemainingPressure();
	}
}

// Drag and Drop functionality
let draggedRow = null;

function setupDragAndDrop(row) {
	row.addEventListener('dragstart', function(e) {
		draggedRow = this;
		this.classList.add('dragging');
	});

	row.addEventListener('dragend', function(e) {
		this.classList.remove('dragging');
		draggedRow = null;
		// Remove all drop zones
		document.querySelectorAll('.drop-zone').forEach(el => {
			el.classList.remove('drop-zone');
		});
	});

	row.addEventListener('dragover', function(e) {
		e.preventDefault();
	});

	row.addEventListener('dragenter', function(e) {
		e.preventDefault();
		if (this !== draggedRow) {
			this.classList.add('drop-zone');
		}
	});

	row.addEventListener('dragleave', function(e) {
		this.classList.remove('drop-zone');
	});

	row.addEventListener('drop', function(e) {
		e.preventDefault();
		if (this !== draggedRow && draggedRow) {
			const tableBody = document.getElementById('tableBody');
			const rows = Array.from(tableBody.children);
			const draggedIndex = rows.indexOf(draggedRow);
			const targetIndex = rows.indexOf(this);

			if (draggedIndex < targetIndex) {
				tableBody.insertBefore(draggedRow, this.nextSibling);
			} else {
				tableBody.insertBefore(draggedRow, this);
			}
			
			updateRowNumbers();
			updateTimeAccumulated();
			updateChart();
		}
		this.classList.remove('drop-zone');
	});
}

function setCache(){
	air_table=document.querySelectorAll('#tableBody tr');
	localStorage.setItem("air_table", air_table);
}
function loadCache(){
	air_table=document.querySelectorAll('#tableBody tr')
	air_table=localStorage.getItem("air_table");
	
}

function PresetsAddEventListeners(){
	airConsumptionPreset=document.querySelector('input[name="airConsumption_preset"]');
	airCylinderPreset=document.querySelector('input[name="Flesinhoud"]');
	airPressurePreset=document.querySelector('input[name="Flesdruk"]');
	inputs=[airConsumptionPreset, airCylinderPreset, airPressurePreset];
	inputs.forEach(input => {
		input.addEventListener('input', function() {
			updateTimeAccumulated();
			updateDepthPressure();
			updateChart();
			updateAirConsumption();
			updateRemainingPressure();
			updateMetrics();
		});
		input.addEventListener('change', function() {
			updateTimeAccumulated();
			updateDepthPressure();
			updateChart();
			updateAirConsumption();
			updateRemainingPressure();
			updateMetrics();
		});
	});
	
}

// Initialize drag and drop for existing rows and eventlisteners on default inputs
document.addEventListener('DOMContentLoaded', function() {
	document.querySelectorAll('#tableBody tr').forEach(row => {
		setupDragAndDrop(row);
		setupInputListeners(row);
	});
	
	PresetsAddEventListeners();
	initializeChart();
	updateChart();
	updateAirConsumption();
	updateRemainingPressure();
});
