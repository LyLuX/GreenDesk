import sequelize from '../src/config/database.js';
import '../src/modules/auth/model/revoked-access-token.model.js';
import { initializeModels } from '../src/core/database/models.js';
import { assertSchemaCompatible } from '../src/core/database/schema-check.js';
import { assertMigrationsCurrent } from '../src/core/database/migration-check.js';

try {
  initializeModels();
  await assertMigrationsCurrent(sequelize);
  await assertSchemaCompatible(sequelize);
  process.stdout.write('Schéma MySQL compatible avec les modèles.\n');
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
