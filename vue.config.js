const devHost = process.env.PRIF_HOST || 'localhost';
const devPort = Number(process.env.PRIF_PORT || 3000);
const devAllowedHosts = process.env.PRIF_ALLOWED_HOSTS || 'localhost';
const backendUrl = process.env.PRIB_URL || 'http://localhost:8082';

// console.log('devHost:', devHost, 'devPort:', devPort, 'backendUrl:', backendUrl);

module.exports = {
  devServer: {
    allowedHosts: devAllowedHosts,
    host: devHost,
    port: devPort,
    proxy: {
      'api/v1/': {
        target: backendUrl,
        ws: true,
        changeOrigin: true
      }
    }
  }
}
