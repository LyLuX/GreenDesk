'use strict';

/** Make explicit the columns previously supplied by development synchronization. */
module.exports = {
  async up(queryInterface, Sequelize) {
    for (const table of [
      'revoked_access_tokens',
      'maintenance_interventions',
      'inventory_stock_movements',
    ]) {
      const columns = await queryInterface.describeTable(table);
      if (!columns.deleted_at)
        await queryInterface.addColumn(table, 'deleted_at', {
          type: Sequelize.DATE,
          allowNull: true,
        });
    }
    const references = await queryInterface.getForeignKeyReferencesForTable(
      'email_verification_tokens',
    );
    if (
      !references.some(
        (reference) =>
          reference.columnName === 'user_id' && reference.referencedTableName === 'users',
      )
    ) {
      const [orphans] = await queryInterface.sequelize.query(
        'SELECT COUNT(*) AS count FROM email_verification_tokens t LEFT JOIN users u ON u.id = t.user_id WHERE u.id IS NULL',
      );
      if (Number(orphans[0].count))
        throw new Error(
          'Jetons de vérification orphelins : corrigez les références avant de relancer la migration.',
        );
      await queryInterface.addConstraint('email_verification_tokens', {
        fields: ['user_id'],
        type: 'foreign key',
        name: 'fk_email_verification_tokens_user',
        references: { table: 'users', field: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }
  },
  async down() {
    throw new Error(
      'La complétude du schéma ne peut pas être annulée sans sauvegarde : les anciennes bases peuvent déjà contenir ces colonnes.',
    );
  },
};
