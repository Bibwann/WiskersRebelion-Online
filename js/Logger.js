export class Logger {
    static logs = [];

    static init() {
        console.log("[LOGGER] System initialized.");
        this.log("Logger Started at " + new Date().toISOString());
        
        // Add global helper
        window.downloadLogs = () => this.downloadLogs();
    }

    static log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const entry = `[GAME] [${timestamp}] ${message}`;
        console.log(entry);
        this.write(entry);
    }

    static error(message) {
        const timestamp = new Date().toLocaleTimeString();
        const entry = `[ERROR] [${timestamp}] ${message}`;
        console.error(entry);
        this.write(entry);
    }
    
    static write(entry) {
        this.logs.push(entry);
        // Limit memory usage
        if(this.logs.length > 5000) this.logs.shift();
    }
    
    static downloadLogs() {
        const blob = new Blob([this.logs.join('\n')], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wiskers_log_${Date.now()}.log`;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}
