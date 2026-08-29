/** Returns the user-facing photo name while preserving compatibility with older uploads. */
export const getMaterialPhotoDisplayName = (photo) =>
  photo?.name?.trim() || photo?.originalName || 'Photo sans nom';
