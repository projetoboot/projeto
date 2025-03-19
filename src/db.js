const { Pool } = require('pg');

const DB_CONFIG = {
    user: 'postgres',
    host: 'localhost',
    database: 'whatsapp_bot',
    password: '123',
    port: 5432,
};

const pool = new Pool(DB_CONFIG);

module.exports = { pool };