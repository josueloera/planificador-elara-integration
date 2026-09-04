const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { app } = require('electron');

// SECRET_KEY (Keep in sync across generators)
const SECRET_KEY = 'NEM_PLANIFICADOR_PRO_2025_SECRET_XYZ';
const LICENSE_FILE = 'license.json';

// Detección robusta de direcciones MAC físicas (incluso con medios desconectados u offline)
function getSystemPhysicalMacs() {
    const macs = new Set();
    
    // 1. En Windows, getmac lista todas las interfaces físicas incluso si dicen "Medios desconectados"
    if (process.platform === 'win32') {
        try {
            const out = execSync('getmac /fo csv /nh', { encoding: 'utf8', timeout: 3000 });
            for (const line of out.split('\n')) {
                const parts = line.split(',');
                if (parts.length > 0) {
                    let mac = parts[0].replace(/["\r\s]/g, '').trim();
                    if (/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac)) {
                        mac = mac.replace(/-/g, ':').toLowerCase();
                        if (mac !== '00:00:00:00:00:00') {
                            macs.add(mac);
                        }
                    }
                }
            }
        } catch (e) {
            // Silencioso si falla getmac
        }
    }
    
    // 2. Revisión de os.networkInterfaces() para adaptadores activos y soporte multiplataforma
    try {
        const interfaces = os.networkInterfaces();
        const sortedNames = Object.keys(interfaces).sort();
        for (const name of sortedNames) {
            if (/virtual|vbox|veth|wsl|docker|hyper-v|bluetooth|loopback|npcap|tap|tun|pseudo/i.test(name)) continue;
            for (const iface of interfaces[name]) {
                if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
                    macs.add(iface.mac.toLowerCase());
                }
            }
        }
    } catch (e) {
        // Silencioso
    }

    return Array.from(macs).sort();
}

// Obtener MachineGuid de Windows como respaldo permanente independiente de la red
function getMachineGuid() {
    if (process.platform === 'win32') {
        try {
            const out = execSync('reg query HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid', { encoding: 'utf8', timeout: 2000 });
            const match = out.match(/MachineGuid\s+REG_SZ\s+([a-f0-9-]+)/i);
            if (match && match[1]) {
                return match[1].trim().toLowerCase();
            }
        } catch (e) {}
    }
    return null;
}

function codeFromHardwareSignature(signature) {
    if (!signature) return 'UNKNOWN';
    const hash = crypto.createHash('sha256').update(signature + "SALT_NEM").digest('hex').substring(0, 10).toUpperCase();
    return `${hash.substring(0, 5)}-${hash.substring(5, 10)}`;
}

function getLicenseDataPath() {
    if (app && typeof app.getPath === 'function') {
        return path.join(app.getPath('userData'), LICENSE_FILE);
    }
    const baseDir = process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : path.join(os.homedir(), '.config'));
    return path.join(baseDir, 'planificador-docente', LICENSE_FILE);
}

function readLicenseData() {
    const dataPath = getLicenseDataPath();
    if (!fs.existsSync(dataPath)) {
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {
        console.error("Error reading license file", e);
        return {};
    }
}

function writeLicenseData(data) {
    const dataPath = getLicenseDataPath();
    try {
        const dir = path.dirname(dataPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error("Error writing license file", e);
    }
}

// Obtiene todos los códigos de instalación posibles para este equipo físico
function getAllPossibleInstallationCodes() {
    const codes = new Set();
    const macs = getSystemPhysicalMacs();

    for (const mac of macs) {
        codes.add(codeFromHardwareSignature(mac));
    }

    const guid = getMachineGuid();
    if (guid) {
        codes.add(codeFromHardwareSignature(guid));
    }

    // Código ya guardado previamente en el equipo
    const savedData = readLicenseData();
    if (savedData.installationCode) {
        codes.add(savedData.installationCode.trim().toUpperCase());
    }

    if (codes.size === 0) {
        codes.add(codeFromHardwareSignature('UNKNOWN_MAC'));
    }

    return Array.from(codes);
}

// Genera o recupera el código de instalación primario permanente del equipo
function generateInstallationCode() {
    const savedData = readLicenseData();
    // Si ya existe un código guardado previamente en este equipo, mantenerlo de por vida
    if (savedData.installationCode && typeof savedData.installationCode === 'string') {
        return savedData.installationCode.trim().toUpperCase();
    }

    // Si no está guardado, determinar el código a partir del primer adaptador físico disponible
    const macs = getSystemPhysicalMacs();
    let primaryCode = '';
    if (macs.length > 0) {
        primaryCode = codeFromHardwareSignature(macs[0]);
    } else {
        const guid = getMachineGuid();
        primaryCode = codeFromHardwareSignature(guid || 'UNKNOWN_MAC');
    }

    // Guardar para evitar cualquier fluctuación futura
    savedData.installationCode = primaryCode;
    writeLicenseData(savedData);

    return primaryCode;
}

function verifyLicenseKey(installationCode, providedKey) {
    if (!providedKey || !installationCode) return false;
    
    // Normalizar la clave provista
    const cleanProvided = String(providedKey).replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // 1. Coincidencia con código estándar con guion (ej. "276D5-941E6")
    const hashWithHyphen = crypto.createHmac('sha256', SECRET_KEY)
                                 .update(installationCode)
                                 .digest('hex')
                                 .substring(0, 16)
                                 .toUpperCase();
    if (cleanProvided.startsWith(hashWithHyphen)) {
        return true;
    }
    
    // 2. Coincidencia con código sin guion (ej. "276D5941E6")
    const cleanInstCode = installationCode.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const hashWithoutHyphen = crypto.createHmac('sha256', SECRET_KEY)
                                    .update(cleanInstCode)
                                    .digest('hex')
                                    .substring(0, 16)
                                    .toUpperCase();
    if (cleanProvided.startsWith(hashWithoutHyphen)) {
        return true;
    }
    
    return false;
}

// Verifica si una clave coincide con CUALQUIERA de las firmas de hardware válidas de este equipo
function verifyAgainstMachine(providedKey) {
    if (!providedKey) return { valid: false };
    const allCodes = getAllPossibleInstallationCodes();
    for (const code of allCodes) {
        if (verifyLicenseKey(code, providedKey)) {
            return { valid: true, matchingCode: code };
        }
    }
    return { valid: false };
}

function getLicenseStatus() {
    const primaryCode = generateInstallationCode();
    const data = readLicenseData();
    
    let status = {
        isActivated: false,
        isTrialValid: false,
        trialDaysRemaining: 0,
        installationCode: primaryCode
    };

    // 1. Comprobar activación permanente contra todas las identidades del equipo
    if (data.licenseKey) {
        const verification = verifyAgainstMachine(data.licenseKey);
        if (verification.valid) {
            status.isActivated = true;
            status.installationCode = data.installationCode || verification.matchingCode || primaryCode;
            // Asegurar que installationCode coincida con el validado
            if (data.installationCode !== status.installationCode) {
                data.installationCode = status.installationCode;
                writeLicenseData(data);
            }
            return status;
        }
    }
    
    // 2. Comprobar periodo de prueba (7 días)
    if (data.trialStartDate) {
        const start = new Date(data.trialStartDate);
        const now = new Date();
        const diffTime = Math.abs(now - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (diffDays <= 7) {
            status.isTrialValid = true;
            status.trialDaysRemaining = 7 - diffDays + 1;
        }
    }
    
    return status;
}

function getLicenseProof() {
    const status = getLicenseStatus();
    const data = readLicenseData();
    return {
        ...status,
        licenseKey: data.licenseKey ? String(data.licenseKey).trim().toUpperCase() : null
    };
}

function activateLicense(key) {
    if (!key) return { success: false, error: 'Por favor, introduce una clave de activación.' };
    
    const verification = verifyAgainstMachine(key);
    if (verification.valid) {
        const data = readLicenseData();
        data.licenseKey = key.trim().toUpperCase();
        data.installationCode = verification.matchingCode || generateInstallationCode();
        data.activatedAt = new Date().toISOString();
        writeLicenseData(data);
        return { success: true };
    }
    return { success: false, error: 'Clave inválida para este equipo.' };
}

function startTrial() {
    const data = readLicenseData();
    if (!data.trialStartDate) {
        data.trialStartDate = new Date().toISOString();
        data.installationCode = data.installationCode || generateInstallationCode();
        writeLicenseData(data);
        return { success: true };
    }
    return { success: false, error: 'La prueba ya ha sido iniciada previamente.' };
}

module.exports = {
    getLicenseStatus,
    getLicenseProof,
    activateLicense,
    startTrial,
    generateInstallationCode,
    verifyLicenseKey,
    getAllPossibleInstallationCodes
};
