# Live Multi-Section Presentation Timer

This is a web-based presentation timer that helps speakers stay on track during their presentations. The timer is catered towards presentations that have multiple sections of varying durations. A YAML configuration file is used to define the presentation sections and their durations as well as an optional start time and title.

Once the configuration is loaded, the timer will display the current section, time remaining, and provide a visual timeline of all sections. If the start time is in the future, the timer will display the time remaining until the start time then automaticlaly start counting down from the first section. Once the end of the section is reached, the timer will move to the next section and continue until all sections are completed.

![Presentation Timer Screenshot](https://github.com/pgiralt/preso_timer/blob/main/preso_timer_example.png?raw=true)

## Features

- **Real-time Timing**: Displays a large countdown timer with time remaining in the current section of the presentation
- **Visual Timeline**: Color-coded sections show past, current, and upcoming segments
- **Interactive Controls**:
  - Adjust section durations on the fly
  - Set custom start times
  - Import presentation configurations
- **Responsive, Mobile-friendly UI**: Allows you to easily use a mobile device as a presentation timer. Works particularly well in landscape mode.
- **No Server Required**: Runs entirely in the browser. While you can easily host this on any web server, you can also run it locally by opening the `index.html` file in a web browser.

## Getting Started

### Usage

1. **Load a Configuration**:
   - Click "Import Settings" to load a YAML configuration file. See the [Configuration](#configuration) section for details on the expected format.
   - Or if the file named `presentation_times.yaml` is in the same directory as the `index.html` file, it will be loaded automatically

2. **Set Start Time**:
   - If the configuration has a `start_time` field, it will be used as the start time
   - If the configuration does not have a `start_time` field, the start time will be set to the current time
   - To change the start time, click the start time field and use the time picker to set a new time
   - Click "Now" to set the start time to the current time

3. **During Presentation**:
   - The current section and time remaining are prominently displayed
   - Use the + and - buttons to adjust the current section's duration
   - The timeline at the bottom shows all sections with color-coded status:
     - Green: Upcoming and current
     - Yellow: Current if time remaining is less than 5 minutes
     - Red: Current if time remaining is 1 minute or less

## Configuration

Create a YAML configuration file with your presentation details. Here's an example:

```yaml
# Sample Configuration
title: "My Presentation"
start_time: "09:00:00"  # 24-hour format (HH:MM:SS)

sections:
  - name: "Introduction"
    duration: 10  # minutes
    
  - name: "Main Topic 1"
    duration: 25
    
  - name: "Q&A"
    duration: 15
```

### Configuration Options

- `title` (optional): Presentation title
- `start_time` (optional): Start time in 24-hour format (HH:MM:SS)
- `sections` (required): List of presentation sections
  - `name`: Section name (displayed in the UI)
  - `duration`: Section length in minutes

You can specify as many sections as you would like. Each section must have a name and a duration.

## License

This project is open source and available under the [MIT License](LICENSE).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

Paul Giralt
