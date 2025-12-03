### Bioreactor Control UI

A responsive, real-time interface for monitoring and controlling bioreactor parameters (Temperature, pH, RPM). Built with React, Vite, and MQTT.

Install Node.js (Version 16 or higher) installed on your computer.

## Installation:

Clone the repository:

git clone [https://github.com/Joeatk/bioreactor-ui.git](https://github.com/Joeatk/bioreactor-ui.git)
cd bioreactor-ui


Install dependencies:

npm install


💻 How to Run on Desktop

Start the development server:

npm run dev


Open your browser and navigate to the Local URL shown in the terminal (usually http://localhost:5173).

📱 How to Run on Mobile

To control the bioreactor from your phone, your computer and phone must be connected to the same Wi-Fi network.

Start the server in Host Mode:
Stop the server if it's running (Ctrl+C), then run:

npm run dev -- --host


Find your Network IP:
Look at the terminal output. You will see a "Network" address:

  ➜  Local:   http://localhost:5173/
  ➜  Network: [http://192.168.1.](http://192.168.1.)XX:5173/  <-- USE THIS ONE


Connect via Phone:
Open Chrome (Android) or Safari (iOS) on your phone and type the Network URL exactly as it appears.

Install as App (Optional):

Android: Tap the browser menu (⋮) -> "Add to Home Screen" -> Install.

iOS: Tap Share -> "Add to Home Screen".

This removes the address bar and gives you a full-screen controller experience.

⚠️ Troubleshooting Mobile Connection

If the site loads on your computer but times out on your phone:

Check Windows Firewall: It is likely blocking Node.js.

Search for "Allow an app through Windows Firewall".

Find Node.js JavaScript Runtime.

Ensure both Private and Public boxes are checked.

Restart the server.

⚙️ Configuration

The MQTT settings are located in src/App.jsx.

Default Broker: wss://broker.hivemq.com:8884/mqtt (Public/Insecure)

Topic Root: bio/v1

To use with a production device, update these constants to point to your private MQTT broker.

📦 Tech Stack

Framework: React + Vite

Styling: Tailwind CSS + Lucide React (Icons)

Communication: MQTT.js (WebSockets)

Visualization: Recharts
