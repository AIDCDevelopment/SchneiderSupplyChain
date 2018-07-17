var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
  name:'blockchain-server',
  description: 'The blockchain server.',
  script: 'C:\\Users\\aie\\local-plane-tracking\\app.js'
});

// Listen for the 'install' event, which indicates the
// process is available as a service.
svc.on('install',function(){
  svc.start();
});

// install the service
svc.install();
