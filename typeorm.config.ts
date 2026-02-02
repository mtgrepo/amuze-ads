import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'password',
  database: 'nest_db',
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
});
