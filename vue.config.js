module.exports = {
  devServer: {
    allowedHosts: 'all',
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      'api/v1/': {
        target: 'http://localhost:8082',
        ws: true,
        changeOrigin: true
      }
    }
  }
}
