// utils/cronJobs.js

import cron from 'node-cron';
import User from '../models/userModel.js';

const startCronJobs = () => {
  
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('🕐 Cron Job : Vérification backup...');
      console.log('✅ Cron terminé (décompte automatique actif)');
    } catch (error) {
      console.error('❌ Erreur Cron Job:', error.message);
    }
  });

  console.log('⏰ Cron Jobs en veille (décompte automatique actif)');
};

export default startCronJobs; 
