let rowCounter = 1;
let depthChart = null;
let airTableData = null;
const DEFAULT_BACKGROUND_COLOR = '#dde3fd';

function normalizeHexColor(colorValue) {
	if (typeof colorValue !== 'string') return null;
	const trimmed = colorValue.trim();

	if (/^#([0-9a-fA-F]{6})$/.test(trimmed)) {
		return trimmed.toLowerCase();
	}

	if (/^#([0-9a-fA-F]{3})$/.test(trimmed)) {
		const r = trimmed[1];
		const g = trimmed[2];
		const b = trimmed[3];
		return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
	}

	return null;
}

function getDarkerHexColor(hexColor, darkenRatio = 0.55) {
	const normalizedColor = normalizeHexColor(hexColor);
	if (!normalizedColor) return '#0617da';

	const red = parseInt(normalizedColor.slice(1, 3), 16);
	const green = parseInt(normalizedColor.slice(3, 5), 16);
	const blue = parseInt(normalizedColor.slice(5, 7), 16);
	const ratio = Math.min(Math.max(darkenRatio, 0), 0.95);

	const darkerRed = Math.max(0, Math.round(red * (1 - ratio)));
	const darkerGreen = Math.max(0, Math.round(green * (1 - ratio)));
	const darkerBlue = Math.max(0, Math.round(blue * (1 - ratio)));

	const toHex = value => value.toString(16).padStart(2, '0');
	return `#${toHex(darkerRed)}${toHex(darkerGreen)}${toHex(darkerBlue)}`;
}

function applyBackgroundColor(colorValue) {
	const normalizedColor = normalizeHexColor(colorValue) || DEFAULT_BACKGROUND_COLOR;
	const darkerColor = getDarkerHexColor(normalizedColor);
	const gradientValue = `linear-gradient(135deg, ${normalizedColor} 50%, ${darkerColor} 100%)`;

	document.documentElement.style.setProperty('--page-bg-color', normalizedColor);
	document.documentElement.style.setProperty('--page-bg-color-dark', darkerColor);
	document.documentElement.style.background = gradientValue;
	document.body.style.background = gradientValue;

	const backgroundColorInput = document.querySelector('input[name="backgroundColor"]');
	if (backgroundColorInput && backgroundColorInput.value !== normalizedColor) {
		backgroundColorInput.value = normalizedColor;
	}
}

// Load air table data
async function loadAirTable() {
	try {
		const response = await fetch('air_table.json');
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const jsonData = await response.json();
		console.log('Raw JSON loaded:', jsonData);
		
		// Extract Table A from the JSON structure 
		if (jsonData['Table A']) {
			airTableData = jsonData['Table A'];
		} else {
			airTableData = jsonData;
		}
		
		console.log('Air table data extracted:', airTableData);
		
		// Validate structure
		if (!airTableData.rows || !Array.isArray(airTableData.rows)) {
			console.error('Invalid air table structure: missing or invalid rows array');
			airTableData = null;
			return;
		}
		if (!airTableData.headers || !Array.isArray(airTableData.headers)) {
			console.error('Invalid air table structure: missing or invalid headers array');
			airTableData = null;
			return;
		}
		console.log('✓ Air table structure validated');
	} catch (error) {
		console.error('Error loading air table:', error);
		airTableData = null;
	}
}

// Calculate Nultijd and Herhalingsgroep based on MDD/EAD and total time
function updateNultijdAndGroup() {
	if (!airTableData || !airTableData.rows) {
		console.warn('Air table data not loaded yet');
		return;
	}
	
	const mddInput = document.querySelector('input[name="MOD"]');
	if (!mddInput) return;
	
	const eadElement = document.getElementById('EquivilantAirDepth');
	const eadCard = eadElement?.closest('.stat-card');
	
	// Check if EAD is visible - if so, use EAD value instead of MOD
	let depthValue;
	if (eadCard && eadCard.style.display === 'flex') {
		// Use EAD value
		depthValue = parseFloat(eadElement.textContent) || 0;
		console.log(`Using EAD: ${depthValue}m for nultijd/HHG calculation`);
	} else {
		// Use MOD value
		depthValue = parseFloat(mddInput.value) || 0;
		console.log(`Using MOD: ${depthValue}m for nultijd/HHG calculation`);
	}
	
	// Calculate rounded depth: roundup(depth/3)*3
	const roundedDepth = Math.ceil(depthValue / 3) * 3;
	
	console.log(`Depth: ${depthValue}, Rounded Depth: ${roundedDepth}`);
	
	// Find the row matching the rounded depth
	const matchingRowIndex = airTableData.rows.findIndex(row => row[0] === roundedDepth);
	
	if (matchingRowIndex === -1) {
		console.warn(`No row found for depth ${roundedDepth}`);
		return;
	}
	
	const row = airTableData.rows[matchingRowIndex];
	const nultijd = row[1]; // Second column is Nultijd
	
	console.log(`Found row at index ${matchingRowIndex}: ${JSON.stringify(row)}`);
	console.log(`Nultijd: ${nultijd}`);
	
	// Update Nultijd display
	document.getElementById('nultijd').textContent = nultijd;
	console.log(`✓ Updated nultijd to: ${nultijd}`);
	
	// Calculate interval group based on total time
	const totalTime = getTotalTime();
	console.log(`Total time: ${totalTime}`);
	updateIntervalGroup(matchingRowIndex, totalTime);
}

// Find and update the interval group based on total time
function updateIntervalGroup(rowIndex, totalTime) {
	if (!airTableData || !airTableData.rows || !airTableData.headers) {
		console.warn('Air table data not properly loaded');
		return;
	}
	
	if (rowIndex < 0 || rowIndex >= airTableData.rows.length) {
		console.warn(`Invalid row index: ${rowIndex}`);
		return;
	}
	
	const row = airTableData.rows[rowIndex];
	const headers = airTableData.headers;
	
	console.log(`Headers: ${JSON.stringify(headers)}`);
	console.log(`Row data: ${JSON.stringify(row)}`);
	
	// Start from column 2 (index 2) which is 'A' - skip MDD and Nultijd
	let intervalGroup = null; // Use null to track if we found a match
	
	// Find the first column where the value is >= totalTime
	for (let i = 2; i < headers.length; i++) {
		const headerLetter = headers[i];
		const timeValue = row[i];
		
		console.log(`Checking column ${i} (${headerLetter}): value=${timeValue}, totalTime=${totalTime}, match=${timeValue !== null && timeValue !== undefined && totalTime <= timeValue}`);
		
		// Skip null/undefined values and find first match
		if (timeValue !== null && timeValue !== undefined && totalTime <= timeValue) {
			intervalGroup = headerLetter;
			console.log(`  -> Found match! Setting to ${headerLetter}`);
			break;
		}
	}
	
	// If total time exceeds all values, use the last valid (non-null) group
	if (intervalGroup === null) {
		console.log('No match found in forward search, checking backward for last valid value...');
		for (let i = headers.length - 1; i >= 2; i--) {
			const timeValue = row[i];
			if (timeValue !== null && timeValue !== undefined) {
				intervalGroup = headers[i];
				console.log(`  -> Found last valid at column ${i} (${headers[i]}): ${intervalGroup}`);
				break;
			}
		}
	}
	
	// Fallback to 'A' if somehow still null
	if (intervalGroup === null) {
		intervalGroup = 'A';
		console.log('Fallback to A');
	}
	
	console.log(`Final interval group: ${intervalGroup}`);
	console.log(`✓ Updated intervalgroup to: ${intervalGroup}`);
	document.getElementById('intervalgroup').textContent = intervalGroup;
	
	// Highlight the corresponding air table cell
	highlightAirTableCell();
}

// Check if total dive time exceeds nultijd and apply warning color
function updateNultijdWarning() {
	const nultijdElement = document.getElementById('nultijd');
	if (!nultijdElement) return;
	
	const nultijdValue = parseFloat(nultijdElement.textContent) || 0;
	const totalTime = getTotalTime();
	const nultijdCard = nultijdElement.closest('.stat-card');
	
	console.log(`Nultijd: ${nultijdValue}, Total Time: ${totalTime}`);
	
	if (totalTime > nultijdValue && nultijdValue > 0) {
		// Add warning color
		if (!nultijdCard.classList.contains('warning')) {
			nultijdCard.classList.add('warning');
			console.log(`⚠️ WARNING: Total dive time (${totalTime}min) exceeds nultijd (${nultijdValue}min)`);
		}
	} else {
		// Remove warning color
		if (nultijdCard.classList.contains('warning')) {
			nultijdCard.classList.remove('warning');
			console.log(`✓ Total dive time within nultijd limits`);
		}
	}
}

// Update MDD based on maximum depth in table
function updateMDDFromMaxDepth() {
	const maxDepth = getMaxDepth();
	const mddInput = document.querySelector('input[name="MOD"]');
	
	if (mddInput && maxDepth > 0) {
		mddInput.value = maxDepth;
		console.log(`✓ Updated MDD to: ${maxDepth}`);
		// Trigger update of nultijd and interval group
		updateNultijdAndGroup();
	}
}

// Initialize the chart when page loads
document.addEventListener('DOMContentLoaded', function() {
	// First load the air table
	loadAirTable().then(() => {
		console.log('Air table loaded successfully');
		
		// Display the air table
		displayAirTable();
		
		// Setup existing table rows
		document.querySelectorAll('#tableBody tr').forEach(row => {
			setupDragAndDrop(row);
			setupInputListeners(row);
		});
		
		// Add event listener to MDD input
		const mddInput = document.querySelector('input[name="MOD"]');
		if (mddInput) {
			mddInput.addEventListener('input', updateMetrics);
			mddInput.addEventListener('change', updateMetrics);
			mddInput.addEventListener('input', updateNultijdAndGroup);
			mddInput.addEventListener('change', updateNultijdAndGroup);
			mddInput.addEventListener('input', calculateEAD);
			mddInput.addEventListener('change', calculateEAD);
			mddInput.addEventListener('input', calculatepO2);
			mddInput.addEventListener('change', calculatepO2);
		}
		
		// Add event listener to EANx input
		const eanxInput = document.querySelector('input[name="EANx"]');
		if (eanxInput) {
			eanxInput.addEventListener('input', calculateEAD);
			eanxInput.addEventListener('change', calculateEAD);
			eanxInput.addEventListener('input', calculatepO2);
			eanxInput.addEventListener('change', calculatepO2);
		}
		const usingReelInput=document.querySelector('input[name="usingReel"]');
		if(usingReelInput){
			usingReelInput.addEventListener('change',updateMetrics);
		}
		
		// Setup preset input listeners
		PresetsAddEventListeners();

		// Setup background color picker
		const backgroundColorInput = document.querySelector('input[name="backgroundColor"]');
		if (backgroundColorInput) {
			applyBackgroundColor(backgroundColorInput.value);
			backgroundColorInput.addEventListener('input', e => applyBackgroundColor(e.target.value));
			backgroundColorInput.addEventListener('change', e => applyBackgroundColor(e.target.value));
		}
		
		// Initialize and update chart
		initializeChart();
		updateChart();
		updateAirConsumption();
		updateRemainingPressure();
		
		// Initial calculation of nultijd and interval group
		updateMetrics();
		updateNultijdAndGroup();
		calculateEAD();
		calculatepO2();
		

		// Setup JSON export button
		const jsonExportBtn = document.getElementById('jsonExportBtn');
		if (jsonExportBtn) {
			jsonExportBtn.addEventListener('click', exportToJSON);
		}

		// Setup JSON import button
		const jsonImportBtn = document.getElementById('jsonImportBtn');
		if (jsonImportBtn) {
			jsonImportBtn.addEventListener('click', () => {
				document.getElementById('jsonFileInput').click();
			});
		}

		// Setup file input for JSON import
		const jsonFileInput = document.getElementById('jsonFileInput');
		if (jsonFileInput) {
			jsonFileInput.addEventListener('change', handleJSONImport);
		}
		
		// Setup PDF export button
		const pdfExportBtn = document.getElementById('pdfExportBtn');
		if (pdfExportBtn) {
			pdfExportBtn.addEventListener('click', exportToPDF);
		}
		
		console.log('Initialization complete');
	});
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



// Shared handler for input changes to prevent memory leaks from duplicate listeners
function handleInputChange() {
	updateTimeAccumulated();
	updateDepthPressure();
	updateChart();
	updateAirConsumption();
	updateRemainingPressure();
	updateMetrics();
}

// Add event listeners to update chart when data changes
function setupInputListeners(row) {
	const inputs = row.querySelectorAll('.editable');
	inputs.forEach(input => {
		// Prevent duplicate listener attachment
		if (input.dataset.listenersAttached) return;
		
		input.addEventListener('input', handleInputChange);
		input.addEventListener('change', handleInputChange);
		input.dataset.listenersAttached = 'true';
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
	updateMetrics();
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

function updateNitroxBadge(eanxValue) {
	const nitroxBadge = document.getElementById('nitroxBadge');
	if (!nitroxBadge) return;

	const eanx = parseFloat(eanxValue);
	if (Number.isFinite(eanx) && eanx > 21) {
		const displayValue = Number.isInteger(eanx) ? eanx.toFixed(0) : eanx.toString();
		nitroxBadge.textContent = `NITROX EAN${displayValue}%`;
		nitroxBadge.style.display = 'inline-flex';
	} else {
		nitroxBadge.style.display = 'none';
	}
}


// Optional: Function to get all calculations at once
// Calculate EAD (Equivalent Air Depth) for Nitrox
function calculateEAD() {
	const eanxInput = document.querySelector('input[name="EANx"]');
	const modInput = document.querySelector('input[name="MOD"]');
	const eadElement = document.getElementById('EquivilantAirDepth');
	const eadCard = eadElement?.closest('.stat-card');
	
	if (!eanxInput || !modInput) return;
	
	const eanx = parseFloat(eanxInput.value) || 21;
	const mod = parseFloat(modInput.value) || 0;
	updateNitroxBadge(eanx);
	
	// Only show EAD card if EANx > 21
	if (eanx > 21) {
		if (eadCard) {
			eadCard.style.display = 'flex';
		}
		
		// Calculate EAD using the formula: ((100-EANx)%*(MOD+10))/0.79)-10
		const ead = (((100 - eanx)/100) * (mod + 10) / 0.79) - 10;
		const eadRounded = Math.ceil(ead);
		eadElement.textContent = eadRounded;
		console.log(`✓ Updated EAD to: ${eadRounded} (EANx: ${eanx}%, MOD: ${mod}m)`);
		
		// Recalculate nultijd and HHG using EAD value
		updateNultijdAndGroup();
	} else {
		// Hide EAD card if EANx <= 21
		if (eadCard) {
			eadCard.style.display = 'none';
		}
		console.log(`EAD card hidden (EANx: ${eanx}% is not greater than 21%)`);
		
		// Recalculate nultijd and HHG using MOD value
		updateNultijdAndGroup();
	}

	// Keep the page background in sync with the user's BG color selection.
	const backgroundColorInput = document.querySelector('input[name="backgroundColor"]');
	applyBackgroundColor(backgroundColorInput?.value || DEFAULT_BACKGROUND_COLOR);
}

// Calculate pO2 (Partial Pressure of Oxygen) for Nitrox
function calculatepO2() {
	const eanxInput = document.querySelector('input[name="EANx"]');
	const modInput = document.querySelector('input[name="MOD"]');
	const pO2Element = document.getElementById('pO2');
	const pO2Card = pO2Element?.closest('.stat-card');
	
	if (!eanxInput || !modInput) return;
	
	const eanx = parseFloat(eanxInput.value) || 21;
	const mod = parseFloat(modInput.value) || 0;
	
	// Get selected risk factors from checkboxes
	let selectedCount = 0;
	const checkboxes = document.querySelectorAll('#riskFactorsMultiselect input[type="checkbox"]');
	selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
	
	// Calculate adjusted limits: each factor lowers limits by 0.05
	const baseLowerLimit = 1.4;
	const baseCriticalLimit = 1.6;
	const adjustment = selectedCount * 0.05;
	const lowerLimit = baseLowerLimit - adjustment;
	const criticalLimit = baseCriticalLimit - adjustment;
	
	// Display the adjusted lower limit in the label
	const label = document.getElementById('riskFactorsLabel');
	if (label) {
		label.textContent = `Risicofactoren (Lower: ${lowerLimit.toFixed(2)})`;
	}
	
	// Calculate pO2 using the formula: pO2=(EANx/100)*(MOD/10+1)
	const pO2 = (eanx / 100) * (mod / 10 + 1);
	const pO2Rounded = pO2.toFixed(2);
	pO2Element.textContent = pO2Rounded;
	console.log(`✓ Updated pO2 to: ${pO2Rounded} (EANx: ${eanx}%, MOD: ${mod}m)`);
	
	// Apply warning styling based on adjusted pO2 limits
	if (pO2Card) {
		// Remove both warning classes first
		pO2Card.classList.remove('warning', 'warning-severe');
		
		if (pO2 >= criticalLimit) {
			// Severe warning (red) for pO2 >= criticalLimit
			pO2Card.classList.add('warning-severe');
			console.log(`⚠️ SEVERE WARNING: pO2 (${pO2Rounded}) is >= ${criticalLimit.toFixed(2)}`);
		} else if (pO2 > lowerLimit) {
			// Warning (orange) for pO2 > lowerLimit but < criticalLimit
			pO2Card.classList.add('warning');
			console.log(`⚠️ WARNING: pO2 (${pO2Rounded}) exceeds ${lowerLimit.toFixed(2)}`);
		}
	}
	
	// Show/hide MOD limit card
	const modLimitCard = document.getElementById('modLimitCard');
	const modLimitElement = document.getElementById('modLimit');
	if (modLimitCard && modLimitElement) {
		if (lowerLimit < 1.4 || eanx > 21) {
			let modLimit;
			if (eanx > 21 && eanx < 35) {
				// Fixed MOD limit of 30m for EANx between 21 and 35
				modLimit = 30;
			} else {
				// Calculate MOD limit: [(lowerLimit / (eanx/100)) - 1] * 10
				modLimit = ((lowerLimit / (eanx / 100)) - 1) * 10;
			}
			modLimitElement.textContent = modLimit.toFixed(1);
			modLimitCard.style.display = 'flex';
		} else {
			modLimitCard.style.display = 'none';
		}
	}
}

function toggleRiskFactorsDropdown() {
    const multiselect = document.getElementById('riskFactorsMultiselect');
    multiselect.classList.toggle('open');
}

function updateRiskFactorsSelection() {
    const checkboxes = document.querySelectorAll('#riskFactorsMultiselect input[type="checkbox"]');
    const header = document.querySelector('.multiselect-header');
    const selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    
    if (selected.length === 0) {
        header.textContent = 'Geen selectie';
    } else if (selected.length === 1) {
        header.textContent = selected[0];
    } else {
        header.textContent = `${selected.length} geselecteerd`;
    }
    
    // Close dropdown after selection on mobile
    if (window.innerWidth <= 768) {
        document.getElementById('riskFactorsMultiselect').classList.remove('open');
    }
    
    // Recalculate pO2 (which will update the label)
    calculatepO2();
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const multiselect = document.getElementById('riskFactorsMultiselect');
    if (!multiselect.contains(event.target)) {
        multiselect.classList.remove('open');
    }
});

function calculateDefaultConsumptionPressureCards() {
	const bottelCapInput = document.querySelector('input[name="Flesinhoud"]');
	const modInput = document.querySelector('input[name="MOD"]');
	const bottlePressureInput = document.querySelector('input[name="Flesdruk"]');
	const consumptionInput=document.querySelector('input[name="airConsumption_preset"]');
	const usingReelInput=document.querySelector('input[name="usingReel"]');

	const bottleCap=parseFloat(bottelCapInput.value) || 12;
	const modVal=parseFloat(modInput.value) || 0;
	const consumptionPreset=parseFloat(consumptionInput.value) || 21;
	const bottlePressureVal=parseFloat(bottlePressureInput.value) || 0;
	//only show returnpressurereel card if usingreel is checked

	console.log(766);
	console.log(usingReelInput.checked);
	

	var backupPressure = 50;
	if (bottleCap < 12) {
		var backupPressure=600/bottleCap;
	}


	console.log('using backup pressure of ' + backupPressure + ' bar');
	// Calculate min air pressure 
	const ascendPressure=((((0.5*modVal)/10)+1)*(modVal/10)*consumptionPreset)/bottleCap;
	const safetyPressure=3*1.5*consumptionPreset/bottleCap;
	var minPressure=ascendPressure+safetyPressure+backupPressure;
	console.log('backuppressure'+backupPressure+' bar + ascendpressure '+ascendPressure+' bar + safety pressure '+safetyPressure+' bar = minimum pressure of ' + minPressure + ' bar');

	//outputting vlaues to stat-cards
	document.getElementById('minPressure').textContent=Math.ceil(minPressure);
	if (!usingReelInput.checked) {
		document.getElementById('returnPressure').textContent= Math.ceil(minPressure +((bottlePressureVal-minPressure)/2));
	}
	else{
		document.getElementById('returnPressure').textContent= Math.ceil(minPressure +((bottlePressureVal-minPressure)*2/3));
	}
}

// Display and highlight the air table
function displayAirTable() {
	if (!airTableData || !airTableData.rows || !airTableData.headers) {
		console.warn('Air table data not available');
		return;
	}

	const table = document.getElementById('airTableDisplay');
	if (!table) return;

	// Clear existing table
	table.innerHTML = '';

	// Create table header
	const headerRow = document.createElement('tr');
	airTableData.headers.forEach((header, headerIndex) => {
		const th = document.createElement('th');
		th.textContent = header;
		headerRow.appendChild(th);
	});
	table.appendChild(headerRow);

	// First pass: find which column matches Nultijd for each row
	const matchedColumns = [];
	airTableData.rows.forEach(row => {
		const nultijd = row[1];
		let matched = -1;
		for (let i = 2; i < row.length; i++) {
			if (row[i] === nultijd) {
				matched = i;
				break;
			}
		}
		matchedColumns.push(matched);
	});

	// Second pass: create table rows with proper borders
	airTableData.rows.forEach((row, rowIndex) => {
		const nultijd = row[1];
		const tr = document.createElement('tr');
		const currentMatchedColumn = matchedColumns[rowIndex];
		const nextMatchedColumn = rowIndex + 1 < matchedColumns.length ? matchedColumns[rowIndex + 1] : -1;
		
		row.forEach((cell, cellIndex) => {
			const td = document.createElement('td');
			td.textContent = cell !== null && cell !== undefined ? cell : '-';
			
			// Highlight MDD column
			if (cellIndex === 0) {
				td.classList.add('mdd-column');
			}
			
			// Add thick borders to matched cell (right and bottom)
			if (cellIndex === currentMatchedColumn) {
				td.classList.add('nultijd-match');
				// Only add bottom border if the next row's matched column is different
				if (nextMatchedColumn !== -1 && nextMatchedColumn === currentMatchedColumn) {
					td.classList.add('nultijd-match-no-bottom');
				}
			}
			
			// Add bottom border for connecting line between rows when columns differ
			// Exclude the nextMatchedColumn and currentMatchedColumn itself
			if (cellIndex >= 2 && nextMatchedColumn !== -1 && currentMatchedColumn !== nextMatchedColumn) {
				const minCol = Math.min(currentMatchedColumn, nextMatchedColumn);
				const maxCol = Math.max(currentMatchedColumn, nextMatchedColumn);
				// Apply bottom border to cells between the two matched columns, excluding both ends
				if (cellIndex > minCol && cellIndex < maxCol) {
					td.classList.add('nultijd-connector-bottom');
				}
			}
			
			tr.appendChild(td);
		});
		table.appendChild(tr);
	});

	// Highlight the current cell used for nultijd/HHG
	highlightAirTableCell();
}

// Highlight the cell that corresponds to current nultijd row and HHG column
function highlightAirTableCell() {
	const table = document.getElementById('airTableDisplay');
	if (!table || !airTableData) return;
	const EADVal = parseInt(document.getElementById('EquivilantAirDepth').textContent) || 0;
	// Get current nultijd and HHG values
	const nultijdElement = document.getElementById('nultijd');
	const mddVal = parseInt(document.getElementById('maxDepth').textContent) ||0;
	const intervalGroupElement = document.getElementById('intervalgroup');
	var currentMDD = Math.ceil(mddVal / 3) * 3; // Round up to nearest multiple of 3

	console.log(`EAD:${EADVal}, MDD:${mddVal}`);

	if (EADVal>0) {
		var currentMDD = Math.ceil(EADVal / 3) * 3;
	}
	console.log(`Using MDD: ${currentMDD} for air table highlighting`);
	
	if (!nultijdElement || !intervalGroupElement) return;

	//const currentNultijd = parseInt(nultijdElement.textContent) || 0;
	const currentGroup = intervalGroupElement.textContent || 'A';

	// Remove previous highlights
	document.querySelectorAll('#airTableDisplay td.highlighted').forEach(cell => {
		cell.classList.remove('highlighted');
	});

	// Find and highlight the matching cell
	// Row index: find row where Nultijd matches
	// Column index: find column where header matches current group
	const rows = table.querySelectorAll('tr');
	
	for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
		const cells = rows[rowIndex].querySelectorAll('td');
		const headers = table.querySelectorAll('th');
		// Check if this row's nultijd (column 1) matches
		//const rowNultijd = parseInt(cells[1].textContent);
		const rowMDD = parseInt(cells[0].textContent);
		for (let colIndex = 0; colIndex < airTableData.headers.length; colIndex++) {
			headers[colIndex].classList.remove('highlighted');
		}

		if (rowMDD === currentMDD) {
			// Found the matching row, now find the matching column
			for (let colIndex = 0; colIndex < airTableData.headers.length; colIndex++) {
				if (airTableData.headers[colIndex] === currentGroup) {
					if (cells[colIndex]) {
						//highlight the header matching the column of the cell
						if (headers[colIndex]) {
							headers[colIndex].classList.add('highlighted');
						}
						cells[colIndex].classList.add('highlighted');
						cells[0].classList.add('highlighted'); // Also highlight MDD cell for context
						console.log(`✓ Highlighted air table cell: MDD row with MDD=${currentMDD}, Group=${currentGroup}`);
					}
					break;
				}
			}
			break;
		}
	}
}

function updateMetrics() {
	const calculations = getAllCalculations();
	document.getElementById('totalTime').textContent = calculations.totalTime.toFixed(1);
	
	// Update MOD stat-card: use table maxDepth if > 0, otherwise use MOD input value
	const maxDepth = calculations.maxDepth;
	const mddInput = document.querySelector('input[name="MOD"]');
	if (maxDepth > 0) {
		// Table has data, use maxDepth from table
		document.getElementById('maxDepth').textContent = maxDepth.toFixed(1);
	} else {
		// Table is empty, use MOD value from input
		const modValue = parseFloat(mddInput?.value) || 0;
		document.getElementById('maxDepth').textContent = modValue.toFixed(1);
	}
	
	document.getElementById('avgDepth').textContent = calculations.avgDepth.toFixed(1);
	document.getElementById('totalAirConsumption').textContent = calculations.totalAirConsumption.toFixed(1);
	
	// Update MDD input based on maximum depth (only if table has data)
	updateMDDFromMaxDepth();
	
	// Update interval group based on new total time
	updateNultijdAndGroup();
	
	// Check and update nultijd warning color
	updateNultijdWarning();
	
	// Update EAD calculation
	calculateEAD();
	
	// Update pO2 calculation
	calculatepO2();

	// Update bottlepressures calculations
	calculateDefaultConsumptionPressureCards();
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
		updateMetrics();
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
		updateMetrics();
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

let presetsListenersSetup = false;

function PresetsAddEventListeners(){
	// Prevent duplicate listener attachment
	if (presetsListenersSetup) return;
	
	const airConsumptionPreset = document.querySelector('input[name="airConsumption_preset"]');
	const airCylinderPreset = document.querySelector('input[name="Flesinhoud"]');
	const airPressurePreset = document.querySelector('input[name="Flesdruk"]');
	const inputs = [airConsumptionPreset, airCylinderPreset, airPressurePreset];
	
	inputs.forEach(input => {
		input.addEventListener('input', handleInputChange);
		input.addEventListener('change', handleInputChange);
	});
	
	presetsListenersSetup = true;
}


// Export table data and parameters to JSON
function exportToJSON() {
	// Collect all parameters
	const params = {
		duiker: document.querySelector('input[name="duiker"]').value,
		duiklocatie: document.querySelector('input[name="duiklocatie"]').value,
		datum: document.querySelector('input[name="datum"]').value,
		kentering: document.querySelector('input[name="kentering"]').value,
		type: document.querySelector('select[name="type"]').value,
		backgroundColor: normalizeHexColor(document.querySelector('input[name="backgroundColor"]')?.value) || DEFAULT_BACKGROUND_COLOR,
		airConsumption_preset: document.querySelector('input[name="airConsumption_preset"]').value,
		Flesinhoud: document.querySelector('input[name="Flesinhoud"]').value,
		Flesdruk: document.querySelector('input[name="Flesdruk"]').value,
		MOD: document.querySelector('input[name="MOD"]').value,
		EANx: document.querySelector('input[name="EANx"]').value,
		usingReel: document.querySelector('input[name="usingReel"]').checked,
		riskFactors: []
	};

	// Collect selected risk factors
	const riskCheckboxes = document.querySelectorAll('#riskFactorsMultiselect input[type="checkbox"]');
	riskCheckboxes.forEach(checkbox => {
		if (checkbox.checked) {
			params.riskFactors.push(checkbox.value);
		}
	});

	// Collect all table rows
	const tableRows = [];
	document.querySelectorAll('#tableBody tr').forEach(row => {
		const rowData = {};
		row.querySelectorAll('input[type="number"]').forEach((input, index) => {
			const fieldName = input.name;
			rowData[fieldName] = input.value;
		});
		tableRows.push(rowData);
	});

	// Create the export object
	const exportData = {
		exportDate: new Date().toISOString(),
		version: '1.0',
		parameters: params,
		tableRows: tableRows
	};

	// Create and download the JSON file
	const dataStr = JSON.stringify(exportData, null, 2);
	
	// Build filename from parameters: locatie-dd-mmm-hh-mm-kenteringtype-duiker
	const locatie = params.duiklocatie || 'duik';
	let datePart = '';
	if (params.datum) {
		const parts = params.datum.split('-');
		if (parts.length === 3) {
			const year = parts[0];
			const month = parseInt(parts[1], 10) - 1;
			const day = parts[2];
			const months = ['jan','feb','mar','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
			const mname = months[month] || parts[1];
			datePart = `${day}-${mname}`;
		} else {
			datePart = params.datum;
		}
	}
	let kenteringPart = params.kentering || '';
	// convert hh:mm to hh.mm (use dot separator as requested)
	kenteringPart = kenteringPart.replace(/:/g, '.');
	const typePart = params.type || '';
	const duikerPart = params.duiker || '';
	let filename = `${locatie}-${datePart}-${kenteringPart}-${typePart}-${duikerPart}`;
	// sanitize: replace spaces and illegal chars with underscores
	filename = filename.replace(/[^a-zA-Z0-9\-_.]/g, '_');
	const fullFilename = `${filename}.json`;

	// Try using Web Share API first for mobile (most reliable on Android)
	if (navigator.share && /Android|iPhone|iPad|iPod/.test(navigator.userAgent)) {
		const dataBlob = new Blob([dataStr], { type: 'application/json' });
		const file = new File([dataBlob], fullFilename, { type: 'application/json' });
		navigator.share({
			files: [file],
			title: 'Duikplanner Export'
		}).catch(err => {
			// Fallback if share API fails
			downloadFile(dataStr, fullFilename);
		});
	} else {
		// Standard download for desktop and browsers without share API
		downloadFile(dataStr, fullFilename);
	}
}

// Helper function to handle file download
function downloadFile(dataStr, filename) {
	const dataBlob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
	const link = document.createElement('a');
	const url = URL.createObjectURL(dataBlob);
	
	link.setAttribute('href', url);
	link.setAttribute('download', filename);
	link.style.visibility = 'hidden';
	
	document.body.appendChild(link);
	link.click();
	
	// Clean up
	setTimeout(() => {
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}, 100);
}

// Export current view to PDF
async function exportToPDF() {
	try {
		const { jsPDF } = window.jspdf;
		const pdf = new jsPDF('p', 'mm', 'a4');
		
		// PDF dimensions
		const pageWidth = pdf.internal.pageSize.getWidth();
		const pageHeight = pdf.internal.pageSize.getHeight();
		let yPosition = 20;
		
		// Add title
		pdf.setFontSize(20);
		pdf.text('Duikplanner Rapport', pageWidth / 2, yPosition, { align: 'center' });
		yPosition += 20;
		
		// Create two columns for parameters and statistics
		const leftColumnX = 20;
		const rightColumnX = pageWidth / 2 + 10;
		const columnWidth = pageWidth / 2 - 15;
		let leftY = yPosition;
		let rightY = yPosition;
		
		// Get form data
		const params = {
			duiker: document.querySelector('input[name="duiker"]').value,
			duiklocatie: document.querySelector('input[name="duiklocatie"]').value,
			datum: document.querySelector('input[name="datum"]').value,
			kentering: document.querySelector('input[name="kentering"]').value,
			type: document.querySelector('select[name="type"]').value,
			airConsumption_preset: document.querySelector('input[name="airConsumption_preset"]').value,
			Flesinhoud: document.querySelector('input[name="Flesinhoud"]').value,
			Flesdruk: document.querySelector('input[name="Flesdruk"]').value,
			MOD: document.querySelector('input[name="MOD"]').value,
			EANx: document.querySelector('input[name="EANx"]').value
		};
		
		// Left column: Dive Parameters
		pdf.setFontSize(14);
		pdf.text('Duik Parameters:', leftColumnX, leftY);
		leftY += 8;
		
		pdf.setFontSize(10);
		const paramLines = [
			`Duiker: ${params.duiker || 'Niet ingevuld'}`,
			`Locatie: ${params.duiklocatie || 'Niet ingevuld'}`,
			`Datum: ${params.datum || 'Niet ingevuld'}`,
			`Kentering: ${params.kentering || 'Niet ingevuld'}`,
			`Type: ${params.type || 'LW'}`,
			`Verbruik (l/min): ${params.airConsumption_preset || '21'}`,
			`Flesinhoud (l): ${params.Flesinhoud || '10'}`,
			`Flesdruk (bar): ${params.Flesdruk || '280'}`,
			`MOD (m): ${params.MOD || '0'}`,
			`EANx (%): ${params.EANx || '21'}`
		];
		
		paramLines.forEach(line => {
			pdf.text(line, leftColumnX + 5, leftY);
			leftY += 5;
		});
		
		// Add risk factors to parameters column if any
		const riskFactors = [];
		document.querySelectorAll('#riskFactorsMultiselect input[type="checkbox"]:checked').forEach(cb => {
			riskFactors.push(cb.value);
		});
		
		if (riskFactors.length > 0) {
			leftY += 5;
			pdf.setFontSize(12);
			pdf.text('Risicofactoren:', leftColumnX, leftY);
			leftY += 6;
			
			pdf.setFontSize(10);
			// Split risk factors into multiple lines if needed
			const riskText = riskFactors.join(', ');
			const words = riskText.split(' ');
			let currentLine = '';
			
			words.forEach(word => {
				const testLine = currentLine + (currentLine ? ' ' : '') + word;
				const textWidth = pdf.getTextWidth(testLine);
				if (textWidth > columnWidth - 10 && currentLine) {
					pdf.text(currentLine, leftColumnX + 5, leftY);
					leftY += 5;
					currentLine = word;
				} else {
					currentLine = testLine;
				}
			});
			if (currentLine) {
				pdf.text(currentLine, leftColumnX + 5, leftY);
				leftY += 5;
			}
		}
		
		// Right column: Statistics
		pdf.setFontSize(14);
		pdf.text('Statistieken:', rightColumnX, rightY);
		rightY += 8;
		
		pdf.setFontSize(10);
		const stats = [
			`Totaal tijd: ${document.getElementById('totalTime')?.textContent || '0'} min`,
			`Max diepte: ${document.getElementById('maxDepth')?.textContent || '0'} m`,
			`EAD: ${document.getElementById('EquivilantAirDepth')?.textContent || '0'} m`,
			`Gemiddelde diepte: ${document.getElementById('avgDepth')?.textContent || '0'} m`,
			`Totaal lucht: ${document.getElementById('totalAirConsumption')?.textContent || '0'} l`,
			`Reserve druk: ${document.getElementById('minPressure')?.textContent || '0'} bar`,
			`Omkeer druk: ${document.getElementById('returnPressure')?.textContent || '0'} bar`,
			`Nultijd: ${document.getElementById('nultijd')?.textContent || '0'} min`,
			`pO₂: ${document.getElementById('pO2')?.textContent || '0'} %`
		];
		
		// Add MOD limit if visible
		const modLimitCard = document.getElementById('modLimitCard');
		if (modLimitCard && modLimitCard.style.display !== 'none') {
			const modLimit = document.getElementById('modLimit')?.textContent || '0';
			stats.push(`MOD limit: ${modLimit} m`);
		}
		
		stats.forEach(stat => {
			pdf.text(stat, rightColumnX + 5, rightY);
			rightY += 5;
		});
		
		// Continue with chart and table below the columns
		yPosition = Math.max(leftY, rightY) + 15;
		
		// Try to capture the chart
		const chartCanvas = document.getElementById('depthChart');
		if (chartCanvas) {
			try {
				pdf.setFontSize(14);
				pdf.text('Duikprofiel:', 20, yPosition);
				yPosition += 10;
				
				// Convert canvas to image
				const chartImgData = chartCanvas.toDataURL('image/png');
				
				// Calculate dimensions to fit on page
				const imgWidth = pageWidth - 40;
				const imgHeight = (chartCanvas.height / chartCanvas.width) * imgWidth;
				
				if (yPosition + imgHeight > pageHeight - 20) {
					pdf.addPage();
					yPosition = 20;
				}
				
				pdf.addImage(chartImgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
				yPosition += imgHeight + 15;
			} catch (error) {
				console.warn('Could not add chart to PDF:', error);
				pdf.setFontSize(10);
				pdf.text('(Chart could not be captured - view on screen)', 20, yPosition);
				yPosition += 10;
			}
		}
		
		// Add table data
		pdf.setFontSize(14);
		pdf.text('Duiktabel:', 20, yPosition);
		yPosition += 10;
		
		// Get table data
		const tableRows = [];
		document.querySelectorAll('#tableBody tr').forEach(row => {
			const rowData = [];
			row.querySelectorAll('input[type="number"]').forEach(input => {
				rowData.push(input.value || '0');
			});
			if (rowData.some(val => val !== '0')) { // Only add rows with data
				tableRows.push(rowData);
			}
		});
		
		if (tableRows.length > 0) {
			pdf.setFontSize(8);
			
			// Table headers
			const headers = ['#', 'Tijd Cumu', 'Tijd', 'Diepte', 'Bar Druk', 'Verbruik', 'Flesdruk'];
			let xPos = 20;
			
			headers.forEach(header => {
				pdf.text(header, xPos, yPosition);
				xPos += 25;
			});
			
			yPosition += 5;
			
			// Table rows
			tableRows.forEach((row, index) => {
				if (yPosition > pageHeight - 20) {
					pdf.addPage();
					yPosition = 20;
					
					// Repeat headers on new page
					xPos = 20;
					headers.forEach(header => {
						pdf.text(header, xPos, yPosition);
						xPos += 25;
					});
					yPosition += 5;
				}
				
				xPos = 20;
				row.forEach(cell => {
					pdf.text(cell, xPos, yPosition);
					xPos += 25;
				});
				yPosition += 4;
			});
		} else {
			pdf.setFontSize(10);
			pdf.text('Geen duikdata beschikbaar', 20, yPosition);
		}
		
		// Generate filename
		const locatie = params.duiklocatie || 'duik';
		let datePart = '';
		if (params.datum) {
			const parts = params.datum.split('-');
			if (parts.length === 3) {
				const year = parts[0];
				const month = parseInt(parts[1], 10) - 1;
				const day = parts[2];
				const months = ['jan','feb','mar','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
				const mname = months[month] || parts[1];
				datePart = `${day}-${mname}`;
			}
		}
		const duikerPart = params.duiker || '';
		let filename = `${locatie}-${datePart}-${duikerPart}`.replace(/[^a-zA-Z0-9\-_.]/g, '_');
		
		// Save the PDF
		pdf.save(`${filename}.pdf`);
		
		alert('PDF export succesvol! Het bestand is gedownload.');
		
	} catch (error) {
		console.error('PDF export error:', error);
		alert('Er is een fout opgetreden bij het maken van de PDF. Probeer het opnieuw.');
	}
}

// Import table data and parameters from JSON
function handleJSONImport(event) {
	const file = event.target.files[0];
	if (!file) return;

	const reader = new FileReader();
	reader.onload = function(e) {
		try {
			const importData = JSON.parse(e.target.result);

			// Validate the import data
			if (!importData.parameters || !importData.tableRows) {
				alert('Invalid file format. Please use a file exported from Duikplanner.');
				return;
			}

			// Import parameters
			const params = importData.parameters;
			document.querySelector('input[name="duiker"]').value = params.duiker || '';
			document.querySelector('input[name="duiklocatie"]').value = params.duiklocatie || '';
			document.querySelector('input[name="datum"]').value = params.datum || '';
			document.querySelector('input[name="kentering"]').value = params.kentering || '';
			document.querySelector('select[name="type"]').value = params.type || 'LW';
			applyBackgroundColor(params.backgroundColor || DEFAULT_BACKGROUND_COLOR);
			document.querySelector('input[name="airConsumption_preset"]').value = params.airConsumption_preset || '21';
			document.querySelector('input[name="Flesinhoud"]').value = params.Flesinhoud || '10';
			document.querySelector('input[name="Flesdruk"]').value = params.Flesdruk || '280';
			document.querySelector('input[name="MOD"]').value = params.MOD || '0';
			document.querySelector('input[name="EANx"]').value = params.EANx || '21';
			document.querySelector('input[name="usingReel"]').checked = params.usingReel || false;

			// Import risk factors
			const riskCheckboxes = document.querySelectorAll('#riskFactorsMultiselect input[type="checkbox"]');
			riskCheckboxes.forEach(checkbox => {
				checkbox.checked = params.riskFactors && params.riskFactors.includes(checkbox.value);
			});
			// Update the multiselect display
			updateRiskFactorsSelection();

			// Clear existing table rows (except the first one)
			const tableBody = document.getElementById('tableBody');
			const rows = tableBody.querySelectorAll('tr');
			for (let i = rows.length - 1; i > 0; i--) {
				rows[i].remove();
			}

			// Import table rows
			const tableRows = importData.tableRows;
			if (tableRows.length > 0) {
				// Update the first row with the first imported data
				const firstRow = tableBody.querySelector('tr');
				const firstRowData = tableRows[0];
				firstRow.querySelectorAll('input[type="number"]').forEach(input => {
					if (firstRowData[input.name] !== undefined) {
						input.value = firstRowData[input.name];
					}
				});

				// Add additional rows if needed
				for (let i = 1; i < tableRows.length; i++) {
					addRow();
					const newRow = tableBody.querySelector('tr:last-child');
					const rowData = tableRows[i];
					newRow.querySelectorAll('input[type="number"]').forEach(input => {
						if (rowData[input.name] !== undefined) {
							input.value = rowData[input.name];
						}
					});
				}
			}

			// Trigger updates
			handleInputChange();
			updateMetrics();
			updateChart();
			updateAirConsumption();
			updateRemainingPressure();
			updateNultijdAndGroup();
			calculateEAD();
			calculatepO2();

			alert('Data imported successfully!');
		} catch (error) {
			console.error('Error importing JSON:', error);
			alert('Error importing file: ' + error.message);
		}
	};
	reader.readAsText(file);

	// Reset the file input so the same file can be imported again
	event.target.value = '';
}

// Air table lookup complete
