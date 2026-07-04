const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.kvgxuiznrrngvpcxixwf:Campari%40promotions@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
});

client.connect()
  .then(() => {
    console.log('Connected successfully!');
    return client.query('SELECT NOW()');
  })
  .then(res => {
    console.log('Server time:', res.rows[0]);
    return client.end();
  })
  .catch(err => {
    console.error('Connection failed:', err.message);
    process.exit(1);
  });
