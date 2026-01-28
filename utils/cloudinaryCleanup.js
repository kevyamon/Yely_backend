// utils/cloudinaryCleanup.js

import cloudinary from '../config/cloudinary.js';

const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      console.log('⚠️ Pas de publicId, rien à supprimer');
      return;
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      console.log(`✅ Image supprimée : ${publicId}`);
    } else {
      console.log(`⚠️ Image non trouvée : ${publicId}`);
    }

    return result;

  } catch (error) {
    console.error('❌ Erreur suppression Cloudinary:', error.message);
  }
};

const bulkDeleteFromCloudinary = async (publicIds) => {
  try {
    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      console.log('⚠️ Aucun publicId fourni');
      return;
    }

    const result = await cloudinary.api.delete_resources(publicIds);

    console.log(`✅ ${publicIds.length} images supprimées`);
    return result;

  } catch (error) {
    console.error('❌ Erreur suppression massive:', error.message);
  }
};

export { deleteFromCloudinary, bulkDeleteFromCloudinary }; 
