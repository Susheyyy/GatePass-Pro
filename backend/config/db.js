const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const SystemCredential = require('../models/SystemCredential');

const seedCredentials = async () => {
    try {
        const adminExist = await SystemCredential.findOne({ role: 'admin' });
        if (!adminExist) {
            const defaultAdminPass = process.env.ADMIN_PASSWORD || 'admin123';
            const hashedAdmin = await bcrypt.hash(defaultAdminPass, 10);
            await SystemCredential.create({ role: 'admin', password: hashedAdmin });
            console.log('Seeded default admin credential.');
        }

        const securityExist = await SystemCredential.findOne({ role: 'security' });
        if (!securityExist) {
            const defaultSecurityPass = process.env.SECURITY_PASSWORD || 'security123';
            const hashedSecurity = await bcrypt.hash(defaultSecurityPass, 10);
            await SystemCredential.create({ role: 'security', password: hashedSecurity });
            console.log('Seeded default security credential.');
        }
    } catch (err) {
        console.error('Error seeding credentials:', err.message);
    }
};

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        await seedCredentials();
    } catch (error) {
        console.error(`Error Message: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
