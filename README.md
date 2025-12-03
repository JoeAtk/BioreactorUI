How to Run the App on Phone
For your phone to connect to the app running on your computer, they must be on the same WiFi network.

Stop the current server (Click inside the terminal and press Ctrl + C).

Run in Host Mode: Run this specific command to expose the IP:

Bash

npm run dev -- --host
Find the Network URL: The terminal will print a "Network" address, usually looking like http://192.168.1.X:5173.

Open on Phone: Type that exact URL into Chrome/Safari on your phone.

Note: If it times out, your Windows Firewall is likely blocking it. You may need to "Allow Node.js through Windows Firewall" in your control panel.