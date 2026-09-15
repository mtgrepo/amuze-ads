module.exports = {
  apps: [
    {
      name: 'advertiser-system',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '500M',
    },
  ],
};
