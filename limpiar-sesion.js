// Script para limpiar la sesión de WhatsApp en Windows
const fs = require('fs');
const path = require('path');

console.log('🧹 Limpiando sesión de WhatsApp...\n');

const sessionPath = path.join(__dirname, '.wwebjs_auth');

// Función recursiva para eliminar carpeta con reintentos
function deleteFolder(folderPath, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            if (fs.existsSync(folderPath)) {
                // Intentar cerrar cualquier proceso que esté usando los archivos
                const files = fs.readdirSync(folderPath);
                
                for (const file of files) {
                    const filePath = path.join(folderPath, file);
                    const stat = fs.statSync(filePath);
                    
                    if (stat.isDirectory()) {
                        deleteFolder(filePath, retries);
                    } else {
                        try {
                            fs.unlinkSync(filePath);
                        } catch (e) {
                            console.log(`⚠️ No se pudo eliminar ${file}, reintentando...`);
                        }
                    }
                }
                
                fs.rmdirSync(folderPath);
                console.log('✅ Sesión eliminada correctamente');
                return true;
            } else {
                console.log('ℹ️ No hay sesión guardada');
                return true;
            }
        } catch (error) {
            if (i < retries - 1) {
                console.log(`⚠️ Intento ${i + 1} fallido, esperando...`);
                // Esperar 2 segundos antes de reintentar
                const waitTime = 2000;
                const start = Date.now();
                while (Date.now() - start < waitTime) {
                    // Espera sincrónica
                }
            } else {
                console.error('❌ Error al eliminar sesión:', error.message);
                console.log('\n💡 SOLUCIÓN MANUAL:');
                console.log('1. Cierra todas las ventanas de Node.js');
                console.log('2. Abre el Administrador de Tareas (Ctrl+Shift+Esc)');
                console.log('3. En "Procesos", busca y finaliza cualquier proceso de "Node.js" o "Chrome"');
                console.log('4. Elimina manualmente la carpeta: .wwebjs_auth');
                console.log('5. Vuelve a ejecutar: npm start');
                return false;
            }
        }
    }
    return false;
}

// Ejecutar limpieza
const success = deleteFolder(sessionPath);

if (success) {
    console.log('\n✅ ¡Listo! Ahora puedes ejecutar el bot nuevamente:');
    console.log('   npm start');
    console.log('\n📱 Escanea el código QR cuando aparezca');
} else {
    console.log('\n⚠️ Sigue las instrucciones de arriba para limpiar manualmente');
}

// Crear un archivo .gitignore si no existe
const gitignorePath = path.join(__dirname, '.gitignore');
if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, `.wwebjs_auth/
node_modules/
leads_*.json
*.log`);
    console.log('\n✅ Archivo .gitignore creado');
}