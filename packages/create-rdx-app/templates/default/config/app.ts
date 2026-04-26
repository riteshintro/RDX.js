export default {
  name: '__APP_NAME__',
  port: Number(process.env.APP_PORT ?? 3000),
  env: process.env.APP_ENV ?? 'local',
};
