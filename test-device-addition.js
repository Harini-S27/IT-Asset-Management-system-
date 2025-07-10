// Test script to simulate device addition for real-time notifications
const deviceNames = [
  "WS-NEW-001",
  "LT-SALES-042", 
  "SV-DATABASE-03",
  "CAM-LOBBY-001",
  "MOBILE-EXEC-07",
  "RT-FLOOR2-001"
];

const deviceTypes = ["Workstation", "Laptop", "Server", "Security Camera", "Mobile", "Router"];
const locations = ["Headquarters", "Branch Office", "Data Center", "Remote", "Agent-Reported"];

const operatingSystems = [
  "Windows 11 Pro",
  "Windows 10 Enterprise", 
  "macOS Monterey",
  "Ubuntu 22.04 LTS",
  "RHEL 9",
  "iOS 16"
];

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomIP() {
  return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

async function addRandomDevice() {
  const deviceData = {
    name: getRandomItem(deviceNames) + "-" + Math.floor(Math.random() * 1000),
    type: getRandomItem(deviceTypes),
    model: getRandomItem(operatingSystems) + " Device",
    status: "Active",
    location: getRandomItem(locations),
    ipAddress: generateRandomIP(),
    latitude: (37.7749 + (Math.random() - 0.5) * 0.1).toString(),
    longitude: (-122.4194 + (Math.random() - 0.5) * 0.1).toString()
  };

  try {
    const response = await fetch('http://localhost:5000/api/devices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deviceData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Device added successfully:', result.name);
    } else {
      console.error('❌ Failed to add device:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Error adding device:', error.message);
  }
}

// Simulate device addition via agent endpoint
async function simulateAgentReport() {
  const deviceData = {
    deviceName: "AGENT-" + Math.floor(Math.random() * 1000),
    operatingSystem: getRandomItem(operatingSystems),
    installedSoftware: ["Microsoft Office", "Google Chrome", "Slack"],
    ipAddress: generateRandomIP(),
    location: "Agent-Reported",
    agentVersion: "1.0.0",
    reportTime: new Date().toISOString(),
    systemUptime: Math.floor(Math.random() * 72) + " hours"
  };

  try {
    const response = await fetch('http://localhost:5000/api/device-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deviceData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Agent report successful:', deviceData.deviceName);
    } else {
      console.error('❌ Failed to submit agent report:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Error submitting agent report:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting device addition test...');
  
  // Add a regular device
  await addRandomDevice();
  
  // Wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simulate agent report
  await simulateAgentReport();
  
  console.log('✅ Test completed! Check your dashboard for real-time notifications.');
}

main().catch(console.error);