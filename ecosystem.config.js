// PM2 Ecosystem Configuration for Aksiyon Saha Uygulaması
// Usage: pm2 start ecosystem.config.js

module.exports = {
  apps: [{
    name: 'aksiyon-api',
    script: 'dist/index.js',
    
    // Instances
    instances: 1,
    exec_mode: 'cluster',
    
    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0',
    },
    env_file: '.env.production',
    
    // Logging
    error_file: 'logs/error.log',
    out_file: 'logs/output.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Restart policy
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // Cron restart (her gün saat 04:00)
    cron_restart: '0 4 * * *',
    
    // Advanced features
    min_uptime: '10s',
    max_restarts: 10,
    
    // Source map support
    source_map_support: true,
    
    // Instance variables
    instance_var: 'INSTANCE_ID',
  }],
  
  // Deployment configuration (opsiyonel)
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'YOUR_SERVER_IP',
      ref: 'origin/main',
      repo: 'https://github.com/ardasezgin/sigortaacentesi-saha-app.git',
      path: '/home/ubuntu/sigortaacentesi-saha-app',
      'post-deploy': 'pnpm install && pnpm build && pnpm db:push && pm2 reload ecosystem.config.js',
      'pre-setup': 'apt-get install git -y'
    }
  }
};
