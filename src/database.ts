import { Knex, knex } from 'knex';

const database: Knex = knex({
    client: 'better-sqlite3',
    connection: {
        filename: './notifier.db'
    },
    useNullAsDefault: true,
});

export default database;