// Update with your config settings.

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {

  development: {
    client: 'better-sqlite3',
    connection: {
      filename: './notifier.db'
    },
    useNullAsDefault: false,
  },

  staging: {
    client: 'better-sqlite3',
    connection: {
      filename: './notifier.db'
    },
    migrations: {
      tableName: 'knex_migrations'
    },
    useNullAsDefault: false,
  },

  production: {
    client: 'better-sqlite3',
    connection: {
      filename: './notifier.db'
    },
    migrations: {
      tableName: 'knex_migrations'
    },
    useNullAsDefault: false,
  }

};
