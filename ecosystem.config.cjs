// PM2 config for asuna-backend on Digital Ocean
module.exports = {
  apps: [{
    name: 'asuna-backend',
    script: 'src/index.js',
    interpreter: 'node',
    env: { NODE_ENV: 'production' },
    instances: 1,
    autorestart: true,
  }],
};
