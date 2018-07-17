var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
  name:'blockchain-server',
  description: 'The blockchain server.',
  script: 'C:\\Users\\aie\\local-plane-tracking\\app.js'
});

// Listen for the 'uninstall' event so we know when it is done.
svc.on('uninstall',function(){
  console.log('Uninstall complete.');
  console.log('The service exists: ',svc.exists);

});

// Uninstall the service.
svc.uninstall();
