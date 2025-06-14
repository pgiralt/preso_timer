// Presentation Timer Application
// ============================
// This application displays a presentation timer that shows:
// - Current time
// - Current section name
// - Time remaining in current section
// - Timeline of all sections with color-coded status indicators
// - Buttons to adjust section times (+/-)

// Global Variables
// ---------------
// presentationData: Stores the parsed YAML data
let presentationData = null;
// Track previous section for change detection
let previousSectionName = null;

/**
 * Parses a time string in HH:MM:SS format to a Date object
 * Handles day rollover when times cross midnight
 * @param {string} timeString - Time string in format "HH:MM:SS"
 * @param {Date} [referenceDate] - Reference date to compare against for day rollover detection
 * @returns {Date} - Date object with today's date and the specified time
 */
function parseTime(timeString, referenceDate = null) {
    try {
        if (typeof timeString !== 'string') {
            throw new Error('Time string must be a string');
        }

        const timeParts = timeString.split(':');
        if (timeParts.length !== 3) {
            throw new Error('Time format must be HH:MM:SS');
        }

        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        const seconds = parseInt(timeParts[2], 10);

        if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
            throw new Error('Invalid time components');
        }

        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
            throw new Error('Time components out of range');
        }

        // Create date object with today's date and specified time
        const now = new Date();
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, seconds);

        // If we have a reference date, check if we need to add a day
        if (referenceDate && referenceDate instanceof Date) {
            // If this time appears to be earlier than the reference time,
            // it likely means we've crossed midnight and should be the next day
            if (date.getTime() < referenceDate.getTime()) {
                date.setDate(date.getDate() + 1);
            }
        }

        return date;
    } catch (error) {
        console.error('Error parsing time:', error);
        throw error;
    }
}

/**
 * Formats a Date object as HH:MM:SS string (24-hour format for internal use)
 * @param {Date} date - Date object to format
 * @returns {string} - Time string in format "HH:MM:SS"
 */
function formatTime(date) {
    try {
        if (!(date instanceof Date)) {
            throw new Error('Invalid date object');
        }

        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        
        return `${hours}:${minutes}:${seconds}`;
    } catch (error) {
        console.error('Error formatting time:', error);
        throw error;
    }
}

/**
 * Formats a Date object as HH:MM:SS AM/PM string for display
 * @param {Date} date - Date object to format
 * @returns {string} - Time string in format "HH:MM:SS AM/PM"
 */
function formatTimeDisplay(date) {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}

/**
 * Determines the status of a section based on current time
 * @param {Date} currentTime - Current time
 * @param {Date} startTime - Section start time
 * @param {Date} endTime - Section end time
 * @returns {string} - Status color ('red', 'yellow', or 'green')
 */
function getTimeStatus(currentTime, startTime, endTime) {
    const now = currentTime.getTime();
    const end = endTime.getTime();
    const fiveMinutesBefore = end - (5 * 60 * 1000);

    if (now > end) {
        return 'red';
    } else if (now >= fiveMinutesBefore) {
        return 'yellow';
    } else {
        return 'green';
    }
}

/**
 * Formats a duration in MM:SS format
 * @param {number} duration - Duration in milliseconds
 * @returns {string} - Duration string in format "MM:SS"
 */
function formatDuration(duration) {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Loads presentation data from YAML file
 * @returns {Promise<Object>} - Parsed presentation data
 */
async function loadPresentationData() {
    try {
        console.log('Loading YAML file...');
        const response = await fetch('presentation_times.yaml');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        console.log('YAML content loaded:', text);
        
        // Parse YAML using our simple parser
        const lines = text.split('\n');
        const data = { title: "", sections: [] };
        let inSections = false;
        
        lines.forEach((line, index) => {
            const originalLine = line;
            line = line.trim();
            console.log(`Line ${index}: "${originalLine}" -> "${line}"`);
            
            if (line === '' || line.startsWith('#')) return;
            
            if (line.startsWith('title:')) {
                data.title = line.substring(6).trim().replace(/['"]+/g, '');
                console.log('Parsed title:', data.title);
            } else if (line.startsWith('start_time:')) {
                data.start_time = line.substring(11).trim().replace(/['"]+/g, '');
                console.log('Parsed start time:', data.start_time);
            } else if (line === 'sections:') {
                inSections = true;
                console.log('Found sections');
            } else if (inSections && line.startsWith('- name:')) {
                const name = line.substring(7).trim().replace(/['"]+/g, '');
                const section = { name: name };
                data.sections.push(section);
                console.log('Added section:', name);
            } else if (inSections && data.sections.length > 0) {
                const lastSection = data.sections[data.sections.length - 1];
                if (line.startsWith('duration:')) {
                    const duration = parseInt(line.substring(9).trim());
                    lastSection.duration = duration;
                    console.log(`Set duration for ${lastSection.name}:`, duration, 'minutes');
                }
            }
        });

        console.log('Final parsed data:', data);

        // Validate data
        if (!data.title) {
            throw new Error('Missing title in YAML file');
        }
        if (!data.start_time) {
            throw new Error('Missing start_time in YAML file');
        }
        if (data.sections.length === 0) {
            throw new Error('No sections found in YAML file');
        }

        // Calculate start and end times for each section
        let currentTime = parseTime(data.start_time);
        
        data.sections.forEach((section, index) => {
            if (!section.name) {
                throw new Error(`Section ${index} missing name`);
            }
            if (!section.duration) {
                throw new Error(`Section "${section.name}" missing duration`);
            }
            
            // Set start time
            section.start = formatTime(currentTime);
            
            // Calculate end time by adding duration in minutes
            const endTime = parseTime(formatTime(currentTime), currentTime);
            endTime.setMinutes(endTime.getMinutes() + section.duration);
            section.end = formatTime(endTime);
            
            console.log(`Calculated times for ${section.name}: ${section.start} - ${section.end} (${section.duration} min)`);
            
            // Move current time to end of this section for next section's start
            currentTime = endTime;
        });

        return data;
    } catch (error) {
        console.error('Error loading YAML file:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        throw new Error(`Failed to load presentation data: ${error.message}`);
    }
}

/**
 * Recalculates section times based on a new start time
 * @param {string} newStartTime - New start time in HH:MM:SS format
 */
function recalculateTimesFromStart(newStartTime) {
    if (!presentationData || !presentationData.sections) {
        console.error('No presentation data available for recalculation');
        return;
    }
    
    try {
        console.log('Recalculating times from new start time:', newStartTime);
        
        // Update the start time
        presentationData.start_time = newStartTime;
        
        // Recalculate all section times
        let currentTime = parseTime(newStartTime);
        
        presentationData.sections.forEach((section) => {
            // Set start time
            section.start = formatTime(currentTime);
            
            // Calculate end time by adding duration in minutes
            const endTime = parseTime(formatTime(currentTime), currentTime);
            endTime.setMinutes(endTime.getMinutes() + section.duration);
            section.end = formatTime(endTime);
            
            // Move current time to end of this section for next section's start
            currentTime = endTime;
        });
        
        console.log('All section times recalculated successfully');
        
        // Force update the timeline display immediately
        updateTimelineDisplay();
        
    } catch (error) {
        console.error('Error recalculating times:', error);
    }
}

/**
 * Updates just the timeline display (extracted for reuse)
 */
function updateTimelineDisplay() {
    try {
        const currentTime = new Date();
        const timeline = document.getElementById('timeline');
        if (timeline && presentationData) {
            timeline.innerHTML = '';

            // Get current section to highlight it
            const currentSection = getCurrentSection(currentTime);
            const currentSectionName = currentSection ? currentSection.name : null;
            
            presentationData.sections.forEach((section, index) => {
                try {
                    // Use the presentation start time as reference for day rollover detection
                    const presentationStartTime = parseTime(presentationData.start_time);
                    const startTime = parseTime(section.start, presentationStartTime);
                    const endTime = parseTime(section.end, startTime);
                    const status = getTimeStatus(currentTime, startTime, endTime);
                    
                    const item = document.createElement('div');
                    item.className = 'timeline-item';
                    item.id = `section-${index}`;
                    
                    // Highlight current section
                    if (section.name === currentSectionName) {
                        item.classList.add('current-section');
                    }
                    
                    // Section name (left column)
                    const sectionName = document.createElement('div');
                    sectionName.className = 'section-name';
                    sectionName.textContent = section.name;
                    
                    // Duration input (middle column)
                    const durationContainer = document.createElement('div');
                    durationContainer.className = 'duration-container';
                    
                    const durationInput = document.createElement('input');
                    durationInput.type = 'number';
                    durationInput.className = 'duration-input';
                    durationInput.value = section.duration;
                    durationInput.min = '1';
                    durationInput.max = '999';
                    durationInput.addEventListener('change', (event) => {
                        updateSectionDuration(index, parseInt(event.target.value));
                    });
                    
                    const durationLabel = document.createElement('span');
                    durationLabel.className = 'duration-label';
                    durationLabel.textContent = ' min';
                    
                    durationContainer.appendChild(durationInput);
                    durationContainer.appendChild(durationLabel);
                    
                    // Time range (right column)
                    const timeBox = document.createElement('div');
                    timeBox.className = `time-box ${status}`;
                    timeBox.textContent = `${formatTimeDisplay(startTime)} - ${formatTimeDisplay(endTime)}`;
                    
                    // Add all three columns to the item
                    item.appendChild(sectionName);
                    item.appendChild(durationContainer);
                    item.appendChild(timeBox);
                    
                    timeline.appendChild(item);
                } catch (error) {
                    console.error('Error updating timeline item:', error);
                }
            });
            
            // Auto-scroll to current section if it changed
            if (currentSectionName !== previousSectionName) {
                console.log('Section changed from', previousSectionName, 'to', currentSectionName);
                scrollToCurrentSection(currentSectionName);
                previousSectionName = currentSectionName;
            }
        }
    } catch (error) {
        console.error('Error updating timeline display:', error);
    }
}

/**
 * Updates a specific section's duration and recalculates all times
 * @param {number} sectionIndex - Index of the section to update
 * @param {number} newDuration - New duration in minutes
 */
function updateSectionDuration(sectionIndex, newDuration) {
    if (!presentationData || !presentationData.sections) {
        console.error('No presentation data available');
        return;
    }
    
    if (sectionIndex < 0 || sectionIndex >= presentationData.sections.length) {
        console.error('Invalid section index:', sectionIndex);
        return;
    }
    
    if (!newDuration || newDuration < 1) {
        console.error('Invalid duration:', newDuration);
        return;
    }
    
    try {
        console.log(`Updating ${presentationData.sections[sectionIndex].name} duration from ${presentationData.sections[sectionIndex].duration} to ${newDuration} minutes`);
        
        // Update the section duration
        presentationData.sections[sectionIndex].duration = newDuration;
        
        // Recalculate all times from the start
        recalculateTimesFromStart(presentationData.start_time);
        
        // Update display
        updateDisplay();
        
        console.log('Section duration updated successfully');
    } catch (error) {
        console.error('Error updating section duration:', error);
    }
}

/**
 * Updates the display with current time, section status, and timeline
 */
function updateDisplay() {
    try {
        if (!presentationData) {
            console.error('No presentation data available');
            return;
        }

        const currentTime = new Date();
        const currentSection = getCurrentSection(currentTime);
        
        // Update current time display
        const currentTimeElement = document.getElementById('current-time');
        if (currentTimeElement) {
            currentTimeElement.textContent = formatTimeDisplay(currentTime);
        }
    
        // Update current section name and timer
        const currentSectionNameElement = document.getElementById('current-section-name');
        const currentSectionDurationElement = document.getElementById('current-section-duration');
        const timeRemainingElement = document.getElementById('time-remaining');
        
        // Check if presentation hasn't started yet
        const presentationStartTime = parseTime(presentationData.start_time);
        const currentTimeMs = currentTime.getTime();
        const startTimeMs = presentationStartTime.getTime();
        
        if (currentTimeMs < startTimeMs) {
            // Before presentation starts - show countdown to start
            if (currentSectionNameElement) {
                currentSectionNameElement.textContent = 'Time Until Start';
                currentSectionNameElement.className = 'time-until-start';
            }
            if (currentSectionDurationElement) {
                currentSectionDurationElement.textContent = '';
            }
            if (timeRemainingElement) {
                const timeUntilStart = startTimeMs - currentTimeMs;
                timeRemainingElement.textContent = formatDuration(timeUntilStart);
                timeRemainingElement.className = 'time-remaining blue';
            }
        } else if (currentSection) {
            // During presentation - show current section
            if (currentSectionNameElement) {
                currentSectionNameElement.textContent = currentSection.name;
                currentSectionNameElement.className = ''; // Remove any previous classes
            }
            if (currentSectionDurationElement) {
                // Find the current section in our data to get its duration
                const sectionData = presentationData.sections.find(section => section.name === currentSection.name);
                if (sectionData) {
                    currentSectionDurationElement.textContent = `${sectionData.duration} min`;
                } else {
                    currentSectionDurationElement.textContent = '';
                }
            }
            if (timeRemainingElement) {
                const timeRemaining = currentSection.end - currentTime.getTime();
                timeRemainingElement.textContent = formatDuration(timeRemaining);
                
                // Add color class based on time remaining
                timeRemainingElement.className = 'time-remaining';
                if (timeRemaining <= 0) {
                    timeRemainingElement.classList.add('red');
                } else if (timeRemaining <= 1 * 60 * 1000) { // 1 minute or less
                    timeRemainingElement.classList.add('red');
                } else if (timeRemaining <= 5 * 60 * 1000) { // 5 minutes or less
                    timeRemainingElement.classList.add('yellow');
                } else {
                    timeRemainingElement.classList.add('green');
                }
            }
        } else {
            // Presentation is complete - show elapsed time since end
            if (currentSectionNameElement) {
                currentSectionNameElement.textContent = 'Presentation Complete';
                currentSectionNameElement.className = 'presentation-complete'; // Add red styling
            }
            if (currentSectionDurationElement) {
                currentSectionDurationElement.textContent = '';
            }
            if (timeRemainingElement) {
                // Find the end time of the last section
                const lastSection = presentationData.sections[presentationData.sections.length - 1];
                const presentationStartTime = parseTime(presentationData.start_time);
                const lastStartTime = parseTime(lastSection.start, presentationStartTime);
                const lastEndTime = parseTime(lastSection.end, lastStartTime);
                const elapsedTime = currentTime.getTime() - lastEndTime.getTime();
                
                if (elapsedTime > 0) {
                    // Show elapsed time as positive count-up
                    timeRemainingElement.textContent = '+' + formatDuration(elapsedTime);
                    timeRemainingElement.className = 'time-remaining red';
                } else {
                    // If somehow we're before the last section ends, show empty
                    timeRemainingElement.textContent = '';
                    timeRemainingElement.className = 'time-remaining';
                }
            }
        }

        updateTimelineDisplay();
    } catch (error) {
        console.error('Error updating display:', error);
        throw error;
    }
}

/**
 * Gets the current section based on the given time
 * @param {Date} time - Current time
 * @returns {Object|null} - Current section object or null if not found
 */
function getCurrentSection(time) {
    try {
        if (!presentationData || !presentationData.sections) {
            console.error('No presentation data or sections available');
            return null;
        }

        const currentTime = time.getTime();
        let currentSection = null;
        
        presentationData.sections.some((section, index) => {
            try {
                // Use the presentation start time as reference for day rollover detection
                const presentationStartTime = parseTime(presentationData.start_time);
                const startTime = parseTime(section.start, presentationStartTime);
                const endTime = parseTime(section.end, startTime);
                const sectionStart = startTime.getTime();
                const sectionEnd = endTime.getTime();
                
                if (currentTime >= sectionStart && currentTime < sectionEnd) {
                    currentSection = {
                        name: section.name,
                        start: sectionStart,
                        end: sectionEnd
                    };
                    return true; // Stop searching when we find the current section
                }
            } catch (error) {
                console.error('Error processing section:', error);
            }
            return false;
        });
        
        return currentSection;
    } catch (error) {
        console.error('Error getting current section:', error);
        throw error;
    }
}

/**
 * Adjusts either start time (before presentation) or current section's duration (during presentation)
 * @param {number} minutes - Number of minutes to adjust (+/-)
 */
function adjustTimes(minutes) {
    try {
        if (!presentationData || !presentationData.sections) {
            console.error('No presentation data available');
            return;
        }

        const currentTime = new Date();
        const presentationStartTime = parseTime(presentationData.start_time);
        const currentTimeMs = currentTime.getTime();
        const startTimeMs = presentationStartTime.getTime();

        // Check if presentation hasn't started yet
        if (currentTimeMs < startTimeMs) {
            // Before presentation starts - adjust the start time
            console.log(`Adjusting start time by ${minutes} minutes`);
            
            const newStartTime = new Date(presentationStartTime.getTime() + (minutes * 60 * 1000));
            const newStartTimeString = formatTime(newStartTime);
            
            // Update the start time input and recalculate all section times
            const startTimeInput = document.getElementById('start-time-input');
            if (startTimeInput) {
                startTimeInput.value = newStartTimeString;
            }
            
            recalculateTimesFromStart(newStartTimeString);
            updateDisplay();
            
            console.log(`Start time adjusted to: ${newStartTimeString}`);
            return;
        }

        // After this point, handle current section adjustment (existing logic)
        const currentSection = getCurrentSection(currentTime);
        
        // If no current section (after presentation ends), don't adjust
        if (!currentSection) {
            console.log('No current section to adjust (presentation may be complete)');
            return;
        }
        
        // Find the current section in our data array
        const sectionIndex = presentationData.sections.findIndex(section => 
            section.name === currentSection.name
        );
        
        if (sectionIndex === -1) {
            console.error('Could not find current section in data');
            return;
        }
        
        const section = presentationData.sections[sectionIndex];
        const newDuration = section.duration + minutes;
        
        // Don't allow duration to go below 1 minute
        if (newDuration < 1) {
            console.log('Cannot reduce section duration below 1 minute');
            return;
        }
        
        console.log(`Adjusting ${section.name} duration from ${section.duration} to ${newDuration} minutes`);
        
        // Update the section duration using our existing function
        updateSectionDuration(sectionIndex, newDuration);
        
    } catch (error) {
        console.error('Error adjusting times:', error);
    }
}

/**
 * Scrolls to the current section in the timeline
 * @param {string} currentSectionName - Name of the current section
 */
function scrollToCurrentSection(currentSectionName) {
    try {
        if (!currentSectionName) {
            return;
        }
        
        // Get the scrollable timeline container
        const timelineContainer = document.querySelector('.timeline-container');
        if (!timelineContainer) {
            console.error('Timeline container not found');
            return;
        }
        
        // Find the current section element
        const currentSectionElement = timelineContainer.querySelector('.timeline-item.current-section');
        if (!currentSectionElement) {
            console.error('Current section element not found for:', currentSectionName);
            return;
        }
        
        // Use scrollIntoView to center the element in the visible area
        currentSectionElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
        });
        
    } catch (error) {
        console.error('Error scrolling to current section:', error);
    }
}

/**
 * Validates and processes imported YAML data
 * @param {Object} data - Parsed YAML data
 * @returns {Object} - Validated and processed data
 */
function validateAndProcessYAML(data) {
    try {
        console.log('Validating imported YAML data:', data);
        
        // Handle null/undefined data
        if (!data || typeof data !== 'object') {
            data = {};
        }
        
        // Initialize result with defaults
        const result = {
            title: data.title || "Presentation Timer",
            start_time: data.start_time || formatTime(new Date()),
            sections: []
        };
        
        // Validate sections array exists and has at least one section
        if (!data.sections || !Array.isArray(data.sections) || data.sections.length === 0) {
            throw new Error('YAML file must contain at least one section in the "sections" array');
        }
        
        // Validate each section
        data.sections.forEach((section, index) => {
            if (!section || typeof section !== 'object') {
                throw new Error(`Section ${index + 1} must be a valid object`);
            }
            
            if (!section.name || typeof section.name !== 'string' || section.name.trim() === '') {
                throw new Error(`Section ${index + 1} must have a non-empty "name" field`);
            }
            
            // Make sure duration is a number
            let duration = section.duration;
            if (typeof duration === 'string') {
                duration = parseFloat(duration);
            }
            
            if (isNaN(duration) || duration <= 0) {
                throw new Error(`Section "${section.name}" must have a positive "duration" field (in minutes)`);
            }
            
            result.sections.push({
                name: section.name.trim(),
                duration: duration
            });
        });
        
        console.log('YAML validation successful:', result);
        return result;
        
    } catch (error) {
        console.error('YAML validation failed:', error);
        throw error;
    }
}

/**
 * Handles file import and processing
 * @param {File} file - Selected YAML file
 */
function importYAMLFile(file) {
    try {
        console.log('Importing YAML file:', file.name);
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                // Parse YAML content
                const yamlContent = event.target.result;
                const parsedData = jsyaml.load(yamlContent) || {};
                
                // Validate and process the data
                const validatedData = validateAndProcessYAML(parsedData);
                
                // Update the application with the new data
                presentationData = validatedData;
                
                // Update the title
                const titleElement = document.getElementById('title');
                if (titleElement) {
                    titleElement.textContent = validatedData.title;
                }
                
                // Calculate section times
                recalculateTimesFromStart(validatedData.start_time);
                
                // Update the start time input
                const startTimeInput = document.getElementById('start-time-input');
                if (startTimeInput) {
                    startTimeInput.value = validatedData.start_time;
                }
                
                // Update the display
                updateDisplay();
                
                console.log('YAML file imported successfully');
                alert(`Successfully imported "${file.name}"!\n\nTitle: ${validatedData.title}\nSections: ${validatedData.sections.length}\nStart Time: ${formatTimeDisplay(parseTime(validatedData.start_time))}`);
                
            } catch (error) {
                console.error('Error processing YAML file:', error);
                alert(`Error importing YAML file:\n\n${error.message}\n\nPlease ensure your YAML file has the required format with at least one section containing 'name' and 'duration' fields.`);
            }
        };
        
        reader.onerror = function() {
            console.error('Error reading file:', reader.error);
            alert('Error reading the selected file. Please try again.');
        };
        
        reader.readAsText(file);
        
    } catch (error) {
        console.error('Error in importYAMLFile:', error);
        alert('An unexpected error occurred while importing the file.');
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize presentation data
        presentationData = await loadPresentationData();
        
        // Set presentation title
        const titleElement = document.getElementById('title');
        if (titleElement) {
            titleElement.textContent = presentationData.title;
        }
        
        // Initialize start time input
        const startTimeInput = document.getElementById('start-time-input');
        if (startTimeInput && presentationData.start_time) {
            startTimeInput.value = presentationData.start_time;
        }
        
        // Start updating display
        updateDisplay();
        setInterval(updateDisplay, 1000);
        
        // Set up event listeners
        const plusButton = document.getElementById('time-plus');
        const minusButton = document.getElementById('time-minus');
        const nowButton = document.getElementById('now-button');
        const importButton = document.getElementById('import-button');

        if (plusButton) {
            plusButton.addEventListener('click', () => adjustTimes(1));
        }
        if (minusButton) {
            minusButton.addEventListener('click', () => adjustTimes(-1));
        }
        if (nowButton) {
            nowButton.addEventListener('click', function() {
                const currentTime = new Date();
                const currentTimeString = formatTime(currentTime);
                
                // Update the input field
                if (startTimeInput) {
                    startTimeInput.value = currentTimeString;
                }
                
                // Recalculate all section times
                recalculateTimesFromStart(currentTimeString);
                updateDisplay();
                
                console.log('Start time set to current time:', currentTimeString);
            });
        }
        if (importButton) {
            importButton.addEventListener('click', function() {
                const fileInput = document.getElementById('yaml-file-input');
                if (fileInput) {
                    fileInput.click();
                }
            });
        }
        const fileInput = document.getElementById('yaml-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', function(event) {
                const selectedFile = event.target.files[0];
                if (selectedFile) {
                    importYAMLFile(selectedFile);
                    // Clear the input so the same file can be selected again
                    event.target.value = '';
                }
            });
        }
        if (startTimeInput) {
            startTimeInput.addEventListener('change', (event) => {
                let newStartTime = event.target.value;
                console.log('Start time input changed to:', newStartTime);
                
                // Ensure proper HH:MM:SS format
                if (newStartTime && newStartTime.split(':').length === 2) {
                    newStartTime += ':00'; // Add seconds if not present
                }
                
                console.log('Processed start time:', newStartTime);
                recalculateTimesFromStart(newStartTime);
                console.log('Recalculation complete, updating display...');
                updateDisplay();
            });
            
            // Also listen for input events for real-time updates
            startTimeInput.addEventListener('input', (event) => {
                let newStartTime = event.target.value;
                
                // Only process if we have a complete time
                if (newStartTime && newStartTime.split(':').length >= 2) {
                    if (newStartTime.split(':').length === 2) {
                        newStartTime += ':00';
                    }
                    
                    recalculateTimesFromStart(newStartTime);
                    updateDisplay();
                }
            });
        }
    } catch (error) {
        console.error('Error initializing presentation timer:', error);
        console.error('Full error details:', error);
        
        // Show more specific error message
        let userMessage = 'Error loading presentation data.';
        
        if (error.message.includes('Failed to load presentation data')) {
            userMessage = error.message;
        } else if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
            userMessage = 'Error loading YAML file. Please check that the file exists and is accessible.';
        } else if (error.message.includes('YAML') || error.message.includes('parse')) {
            userMessage = 'Error parsing YAML file. Please check the YAML file format.';
        } else {
            userMessage = `Error: ${error.message}`;
        }
        
        alert(userMessage);
    }
});
