const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { app } = require('electron');

// SECRET_KEY (In production, this should ideally be obfuscated)
const SECRET_KEY = 'NEM_PLANIFICADOR_PRO_2025_SECRET_XYZ';
const LICENSE_FILE = 'license.json';

function getMacAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal and non-mac addresses
            if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
                return iface.mac;
            }
        }
    }
    return 'UNKNOWN_MAC';
}

function generateInstallationCode() {
    const mac = getMacAddress();
    // Create a simple, readable hash of the MAC address
    const hash = crypto.createHash('sha256').update(mac + "SALT_NEM").digest('hex').substring(0, 10).toUpperCase();
    return `${hash.substring(0, 5)}-${hash.substring(5, 10)}`;
}

function verifyLicenseKey(installationCode, providedKey) {
    // A valid key is an HMAC of the installation code
    const expectedHash = crypto.createHmac('sha256', SECRET_KEY)
                               .update(installationCode)
                               .digest('hex')
                               .substring(0, 16)
                               .toUpperCase();
                               
    const formattedExpectedKey = `${expectedHash.substring(0,4)}-${expectedHash.substring(4,8)}-${expectedHash.substring(8,12)}-${expectedHash.substring(12,16)}`;
    
    return providedKey.trim().toUpperCase() === formattedExpectedKey;
}

function getLicenseDataPath() {
    return path.join(app.getPath('userData'), LICENSE_FILE);
}

function getLicenseStatus() {
    const dataPath = getLicenseDataPath();
    const instCode = generateInstallationCode();
    
    let status = {
        isActivated: false,
        isTrialValid: false,
        trialDaysRemaining: 0,
        installationCode: instCode
    };

    if (fs.existsSync(dataPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            
            // 1. Check full activation
            if (data.licenseKey && verifyLicenseKey(instCode, data.licenseKey)) {
                status.isActivated = true;
                return status;
            }
            
            // 2. Check trial
            if (data.trialStartDate) {
                const start = new Date(data.trialStartDate);
                const now = new Date();
                const diffTime = Math.abs(now - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                
                if (diffDays <= 7) {
                    status.isTrialValid = true;
                    status.trialDaysRemaining = 7 - diffDays + 1; // +1 to include current day
                }
            }
            
        } catch (e) {
            console.error("Error reading license file", e);
        }
    }
    
    return status;
}

function activateLicense(key) {
    const instCode = generateInstallationCode();
    if (verifyLicenseKey(instCode, key)) {
        const dataPath = getLicenseDataPath();
        let data = {};
        if (fs.existsSync(dataPath)) {
            try { data = JSON.parse(fs.readFileSync(dataPath, 'utf8')); } catch(e){}
        }
        data.licenseKey = key.trim().toUpperCase();
        fs.writeFileSync(dataPath, JSON.stringify(data));
        return { success: true };
    }
    return { success: false, error: 'Clave inválida para este equipo.' };
}

function startTrial() {
    const dataPath = getLicenseDataPath();
    let data = {};
    if (fs.existsSync(dataPath)) {
        try { data = JSON.parse(fs.readFileSync(dataPath, 'utf8')); } catch(e){}
    }
    
    if (!data.trialStartDate) {
        data.trialStartDate = new Date().toISOString();
        fs.writeFileSync(dataPath, JSON.stringify(data));
        return { success: true };
    }
    return { success: false, error: 'La prueba ya ha sido iniciada previamente.' };
}

module.exports = {
    getLicenseStatus,
    activateLicense,
    startTrial
};
