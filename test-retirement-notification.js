// Test script to manually trigger a retirement notification popup
const testRetirementNotification = async () => {
  try {
    // Create a test asset with immediate retirement notification
    const createResponse = await fetch('http://localhost:5000/api/asset-lifecycle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        deviceId: 999,
        deviceName: 'URGENT-RETIREMENT-TEST',
        acquiredDate: '2025-07-20',
        retirementDate: '2025-07-23', // 1 day from now
        notificationDays: 5,
        dailyNotifications: false,
        notes: 'Immediate notification test'
      })
    });
    
    const asset = await createResponse.json();
    console.log('Created test asset:', asset);
    
    // Wait a moment for asset to be created
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Trigger alert check
    const alertResponse = await fetch('http://localhost:5000/api/alerts/trigger-check', {
      method: 'POST'
    });
    
    const alertResult = await alertResponse.json();
    console.log('Alert check result:', alertResult);
    
    // Check if alerts were created
    const alertsResponse = await fetch('http://localhost:5000/api/alerts');
    const alerts = await alertsResponse.json();
    const retirementAlerts = alerts.filter(alert => alert.alertDescription.includes('retirement'));
    
    console.log('Retirement alerts found:', retirementAlerts.length);
    retirementAlerts.forEach(alert => {
      console.log('Alert:', alert.alertTitle, '|', alert.alertDescription);
    });
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the test
testRetirementNotification();