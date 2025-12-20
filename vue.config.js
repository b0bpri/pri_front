const devHost = process.env.PRIF_HOST || '0.0.0.0';
const devPort = Number(process.env.PRIF_PORT || 3000);
const devAllowedHosts = process.env.PRIF_ALLOWED_HOSTS || 'all';
const backendUrl = process.env.PRIB_URL || 'http://localhost:8082';

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
