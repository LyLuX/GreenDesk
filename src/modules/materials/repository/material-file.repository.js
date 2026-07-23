import MaterialFile from '../model/material-file.model.js';
export default class MaterialFileRepository {
  async create(values) {
    return MaterialFile.create(values);
  }
  async findByUuid(uuid) {
    return MaterialFile.findOne({ where: { uuid } });
  }
  async countPhotos(materialId) {
    return MaterialFile.count({ where: { materialId, kind: 'photo' } });
  }
  async remove(file) {
    return file.destroy();
  }
  async setPrimary(file) {
    await MaterialFile.update(
      { isPrimary: false },
      { where: { materialId: file.materialId, kind: 'photo' } },
    );
    return file.update({ isPrimary: true });
  }
}
