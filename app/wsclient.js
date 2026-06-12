console.log('Starting a programm:');
const WebSocket = require('ws');

try {
  //   const ws = new WebSocket('wss://127.0.0.1:443', {
  const ws = new WebSocket('ws://127.0.0.1');

  ws.on('open', () => {
    const msg = {
      Hostname: 'ITC203W10BP',
      IpAddress: '192.168.162.18;192.168.56.1',
      ServiceName:
        'uvnc_service;UsoSvc;upnphost;FontCache;SecurityHealthService',
      ServiceStatus: 'Running;Running;Stopped;Running;Running',
    };
    const str = JSON.stringify(msg);
    ws.send(str);
  });
  ws.on('message', (srvData) => {
    console.log('Server says:', srvData);
  });
} catch (error) {
  console.log('error:', error);
}
