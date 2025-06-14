export function init() {
    // This is a simplified version that uses the native YAML parsing
    // In a real application, you would use a proper YAML parser library
    window.jsyaml = {
        load: function(yaml) {
            try {
                // Simple YAML parser using JSON.parse for this specific format
                return JSON.parse(yaml.replace(/'/g, '"').replace(/\n/g, ','));
            } catch (e) {
                throw new Error('Invalid YAML format');
            }
        }
    };
}
