#!/usr/bin/env node

// Test script for the Network Scanner functionality
// This simulates network device discovery and API key generation

const API_BASE = 'http://localhost:5000';

async function testNetworkScanner() {
  console.log('🧪 Testing Network Scanner Functionality...\n');

  try {
    // 1. Check initial scanner status
    console.log('1️⃣ Checking initial scanner status...');
    const statusResponse = await fetch(`${API_BASE}/api/network-scanner/status`);
    const initialStatus = await statusResponse.json();
    console.log('Initial Status:', initialStatus);

    // 2. Start the network scanner
    console.log('\n2️⃣ Starting network scanner...');
    const startResponse = await fetch(`${API_BASE}/api/network-scanner/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intervalMinutes: 1 }) // Very frequent for testing
    });
    const startResult = await startResponse.json();
    console.log('Start Result:', startResult);

    // 3. Wait a moment for scanner to initialize
    console.log('\n3️⃣ Waiting for scanner to initialize...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 4. Check scanner status after starting
    console.log('\n4️⃣ Checking scanner status after start...');
    const runningStatusResponse = await fetch(`${API_BASE}/api/network-scanner/status`);
    const runningStatus = await runningStatusResponse.json();
    console.log('Running Status:', runningStatus);

    // 5. Wait for a scan cycle to complete (simulate network scan time)
    console.log('\n5️⃣ Waiting for scan cycle to complete...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 6. Check discovered devices
    console.log('\n6️⃣ Checking discovered devices...');
    const devicesResponse = await fetch(`${API_BASE}/api/network-scanner/discovered-devices`);
    const discoveredDevices = await devicesResponse.json();
    console.log('Discovered Devices:', discoveredDevices);

    // 7. Check generated API keys
    console.log('\n7️⃣ Checking generated API keys...');
    const apiKeysResponse = await fetch(`${API_BASE}/api/network-scanner/api-keys`);
    const apiKeys = await apiKeysResponse.json();
    console.log('API Keys:', apiKeys);

    // 8. Test API key verification (if any keys exist)
    if (apiKeys.length > 0) {
      console.log('\n8️⃣ Testing API key verification...');
      const testApiKey = apiKeys[0].apiKey;
      const verifyResponse = await fetch(`${API_BASE}/api/network-scanner/verify-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: testApiKey })
      });
      const verifyResult = await verifyResponse.json();
      console.log('Verify Result:', verifyResult);

      // 9. Test auto-enrollment with the API key
      console.log('\n9️⃣ Testing auto-enrollment...');
      const enrollResponse = await fetch(`${API_BASE}/api/auto-enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          apiKey: testApiKey,
          deviceInfo: {
            osVersion: 'Windows 11',
            agentVersion: '1.0.0',
            lastSeen: new Date().toISOString()
          }
        })
      });
      const enrollResult = await enrollResponse.json();
      console.log('Auto-enrollment Result:', enrollResult);
    }

    // 10. Stop the scanner
    console.log('\n🔟 Stopping network scanner...');
    const stopResponse = await fetch(`${API_BASE}/api/network-scanner/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const stopResult = await stopResponse.json();
    console.log('Stop Result:', stopResult);

    // 11. Final status check
    console.log('\n1️⃣1️⃣ Final scanner status check...');
    const finalStatusResponse = await fetch(`${API_BASE}/api/network-scanner/status`);
    const finalStatus = await finalStatusResponse.json();
    console.log('Final Status:', finalStatus);

    console.log('\n✅ Network Scanner test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Discovered Devices: ${discoveredDevices.length}`);
    console.log(`- Generated API Keys: ${apiKeys.length}`);
    console.log(`- Scanner Working: ${runningStatus.isScanning ? 'Yes' : 'No'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testNetworkScanner();