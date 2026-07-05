module.exports = {
  apps: [
    {
      name: 'weebrook-api',
      script: 'dist/index.js',
      cwd: '/home/ubuntu/weebrook/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // Restart policy
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 3000,
      // Logging
      out_file: '/home/ubuntu/logs/weebrook-out.log',
      error_file: '/home/ubuntu/logs/weebrook-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
}
