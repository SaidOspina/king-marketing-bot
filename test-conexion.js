// Script para diagnosticar problemas de conexión
const https = require('https');
const dns = require('dns');

console.log('🔍 Diagnóstico de conexión para WhatsApp Bot\n');
console.log('═'.repeat(50));

// Test 1: Conexión a internet básica
function testInternetConnection() {
    return new Promise((resolve) => {
        console.log('\n📡 Test 1: Conectividad a Internet');
        
        https.get('https://www.google.com', (res) => {
            if (res.statusCode === 200) {
                console.log('   ✅ Conexión a internet: OK');
                resolve(true);
            } else {
                console.log('   ⚠️ Conexión a internet: Parcial');
                resolve(false);
            }
        }).on('error', (err) => {
            console.log('   ❌ Conexión a internet: FALLA');
            console.log(`      Error: ${err.message}`);
            resolve(false);
        });
    });
}

// Test 2: DNS Resolution
function testDNS() {
    return new Promise((resolve) => {
        console.log('\n🌐 Test 2: Resolución DNS');
        
        dns.resolve('web.whatsapp.com', (err, addresses) => {
            if (err) {
                console.log('   ❌ DNS: FALLA');
                console.log(`      Error: ${err.message}`);
                console.log('      💡 Intenta cambiar tu DNS a 8.8.8.8 (Google)');
                resolve(false);
            } else {
                console.log('   ✅ DNS: OK');
                console.log(`      IP: ${addresses[0]}`);
                resolve(true);
            }
        });
    });
}

// Test 3: Acceso a servidores de WhatsApp
function testWhatsAppServers() {
    return new Promise((resolve) => {
        console.log('\n💬 Test 3: Servidores de WhatsApp');
        
        const servers = [
            'web.whatsapp.com',
            'v.whatsapp.net',
            'media.fna.whatsapp.net'
        ];
        
        let completed = 0;
        let success = 0;
        
        servers.forEach(server => {
            https.get(`https://${server}`, (res) => {
                console.log(`   ✅ ${server}: OK (${res.statusCode})`);
                success++;
                completed++;
                if (completed === servers.length) {
                    resolve(success === servers.length);
                }
            }).on('error', (err) => {
                console.log(`   ❌ ${server}: FALLA`);
                console.log(`      Error: ${err.message}`);
                completed++;
                if (completed === servers.length) {
                    resolve(success === servers.length);
                }
            });
        });
    });
}

// Test 4: Verificar firewall/antivirus
function checkFirewall() {
    console.log('\n🛡️ Test 4: Firewall/Antivirus');
    console.log('   ℹ️ Verifica manualmente:');
    console.log('      - Windows Defender no está bloqueando Node.js');
    console.log('      - Firewall permite conexiones salientes en puerto 443');
    console.log('      - Antivirus no está bloqueando whatsapp-web');
}

// Test 5: Verificar proxy/VPN
function checkProxyVPN() {
    console.log('\n🔐 Test 5: Proxy/VPN');
    
    if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
        console.log('   ⚠️ Proxy detectado:');
        console.log(`      HTTP_PROXY: ${process.env.HTTP_PROXY || 'No'}`);
        console.log(`      HTTPS_PROXY: ${process.env.HTTPS_PROXY || 'No'}`);
        console.log('      💡 Intenta desactivar el proxy');
    } else {
        console.log('   ✅ No hay proxy configurado');
    }
    
    console.log('\n   ℹ️ Si usas VPN:');
    console.log('      - Intenta desactivarla temporalmente');
    console.log('      - Algunos VPNs bloquean WhatsApp');
}

// Test 6: Verificar Node.js y dependencias
function checkNodeVersion() {
    console.log('\n📦 Test 6: Versión de Node.js');
    const version = process.version;
    const majorVersion = parseInt(version.split('.')[0].replace('v', ''));
    
    console.log(`   Versión actual: ${version}`);
    
    if (majorVersion >= 16) {
        console.log('   ✅ Versión de Node.js: OK');
    } else {
        console.log('   ❌ Versión muy antigua');
        console.log('      💡 Actualiza a Node.js 18 o superior');
    }
}

// Test 7: Verificar carpeta de autenticación
function checkAuthFolder() {
    const fs = require('fs');
    const path = require('path');
    
    console.log('\n🔑 Test 7: Carpeta de autenticación');
    
    const authPath = path.join(process.cwd(), 'auth_info_baileys');
    
    if (fs.existsSync(authPath)) {
        const files = fs.readdirSync(authPath);
        console.log(`   ✅ Carpeta existe con ${files.length} archivos`);
        
        if (files.includes('creds.json')) {
            console.log('   ✅ Credenciales encontradas');
            
            // Verificar si están corruptas
            try {
                const creds = JSON.parse(fs.readFileSync(path.join(authPath, 'creds.json')));
                if (creds.me && creds.me.id) {
                    console.log('   ✅ Credenciales válidas');
                } else {
                    console.log('   ⚠️ Credenciales incompletas');
                }
            } catch (e) {
                console.log('   ❌ Credenciales corruptas');
                console.log('      💡 Elimina la carpeta: rmdir /s /q auth_info_baileys');
            }
        } else {
            console.log('   ⚠️ No hay credenciales guardadas');
            console.log('      💡 Necesitas escanear el QR');
        }
    } else {
        console.log('   ℹ️ No hay sesión guardada (primera vez)');
        console.log('      💡 Al ejecutar el bot, escanea el QR');
    }
}

// Ejecutar todos los tests
async function runAllTests() {
    await testInternetConnection();
    await testDNS();
    await testWhatsAppServers();
    checkFirewall();
    checkProxyVPN();
    checkNodeVersion();
    checkAuthFolder();
    
    console.log('\n' + '═'.repeat(50));
    console.log('\n📋 RESUMEN Y RECOMENDACIONES:\n');
    
    console.log('Si todos los tests pasaron pero el bot falla:');
    console.log('  1. Elimina auth_info_baileys y escanea QR de nuevo');
    console.log('  2. Usa WhatsApp NORMAL (no Business)');
    console.log('  3. Desactiva VPN/Proxy temporalmente');
    console.log('  4. Verifica que el firewall no bloquee Node.js');
    console.log('  5. Intenta desde otra red WiFi');
    
    console.log('\nSi los tests de WhatsApp fallan:');
    console.log('  1. Cambia tu DNS a 8.8.8.8 (Google DNS)');
    console.log('  2. Desactiva temporalmente antivirus/firewall');
    console.log('  3. Verifica que no estés en una red corporativa restrictiva');
    console.log('  4. Intenta usando datos móviles en lugar de WiFi');
    
    console.log('\nComandos útiles:');
    console.log('  - Limpiar sesión: rmdir /s /q auth_info_baileys');
    console.log('  - Reinstalar: npm install --force');
    console.log('  - Iniciar bot: npm start');
    
    console.log('\n' + '═'.repeat(50) + '\n');
}

// Ejecutar
runAllTests().catch(err => {
    console.error('Error en diagnóstico:', err);
});