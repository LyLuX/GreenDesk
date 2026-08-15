'use strict';

const previousName = 'maintenance.execute_without_part_replacement';
const currentName = 'maintenance.execute.skip_parts';

/** Renames the exceptional execution permission while preserving its role grants. */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'UPDATE permissions SET name = :currentName, updated_at = :timestamp WHERE name = :previousName',
      { replacements: { previousName, currentName, timestamp: new Date() } },
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'UPDATE permissions SET name = :previousName, updated_at = :timestamp WHERE name = :currentName',
      { replacements: { previousName, currentName, timestamp: new Date() } },
    );
  },
};
