/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('streams', (table) => {
    table.mediumint('user_id').notNullable();
    table.text('title');
    table.mediumint('stream_id').notNullable();
    table.string('message_id').notNullable();
    table.dateTime('started_at').notNullable();
    table.dateTime('ended_at');
    table.mediumint('video_id');
    table.primary(['user_id', 'stream_id']);
  })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('streams');
};
