module.exports = {
  apps: [
    {
      name: 'sharkbyte-api',
      script: 'dist/main.js',
      cwd: 'C:/sharkbyte/Backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'sharkbyte-frontend',
      script: 'node_modules/.bin/vite',
      args: '--port 5173',
      cwd: 'C:/sharkbyte/Sharkbyte',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};
