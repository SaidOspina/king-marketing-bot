const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, delay } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const pino = require('pino');
const fs = require('fs');
const http = require('http');

// Variable global para almacenar el QR
let currentQR = null;
let botStatus = 'starting';

// Crear servidor HTTP para health check (requerido por Koyeb)
const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: botStatus,
            uptime: process.uptime(),
            memory: process.memoryUsage()
        }));
    } else if (req.url === '/qr' && currentQR) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>QR King Marketing Bot</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                    }
                    .container {
                        text-align: center;
                        background: white;
                        padding: 40px;
                        border-radius: 20px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        color: #333;
                    }
                    h1 { margin: 0 0 20px 0; color: #667eea; }
                    #qrcode { margin: 20px 0; }
                    .instructions {
                        text-align: left;
                        background: #f5f5f5;
                        padding: 20px;
                        border-radius: 10px;
                        margin-top: 20px;
                    }
                    .instructions li { margin: 10px 0; }
                    .status {
                        display: inline-block;
                        padding: 8px 16px;
                        background: #4caf50;
                        color: white;
                        border-radius: 20px;
                        font-size: 14px;
                        margin-top: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🤖 King Marketing Bot</h1>
                    <div class="status">✅ Bot en línea</div>
                    <div id="qrcode"></div>
                    <div class="instructions">
                        <h3>📱 Cómo conectar:</h3>
                        <ol>
                            <li>Abre <strong>WhatsApp</strong> en tu teléfono</li>
                            <li>Ve a <strong>Menú (⋮)</strong> > <strong>Dispositivos vinculados</strong></li>
                            <li>Toca en <strong>Vincular un dispositivo</strong></li>
                            <li>Escanea el código QR de arriba</li>
                            <li>¡Listo! El bot estará activo 24/7</li>
                        </ol>
                        <p><strong>⚠️ Importante:</strong> Usa WhatsApp NORMAL (no Business)</p>
                        <p><em>Esta página se actualizará automáticamente cada 5 segundos</em></p>
                    </div>
                </div>
                <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
                <script>
                    const qrData = '${currentQR.replace(/'/g, "\\'")}';
                    QRCode.toCanvas(document.getElementById('qrcode'), qrData, {
                        width: 300,
                        margin: 2,
                        color: {
                            dark: '#000000',
                            light: '#ffffff'
                        }
                    });
                    // Auto refresh cada 5 segundos
                    setTimeout(() => location.reload(), 5000);
                </script>
            </body>
            </html>
        `);
    } else if (req.url === '/qr') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Esperando QR...</title>
                <meta http-equiv="refresh" content="3">
            </head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>⏳ Generando código QR...</h1>
                <p>Esta página se actualizará automáticamente</p>
                <p><em>Por favor espera unos segundos</em></p>
            </body>
            </html>
        `);
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`🌐 Servidor HTTP corriendo en puerto ${PORT}`);
    console.log(`📱 QR disponible en: http://localhost:${PORT}/qr`);
});

// Almacenar sesiones de usuarios
const userSessions = new Map();

// Tu código del bot aquí (handleMessage, saveLead, etc.)
// ... [incluye todas las funciones que ya tienes]

// Función principal del bot
async function startBot() {
    try {
        botStatus = 'connecting';
        console.log('🚀 Iniciando Bot de King Marketing...\n');

        const { version } = await fetchLatestBaileysVersion();
        console.log(`📦 Usando Baileys v${version.join('.')}`);

        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        
        const sock = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: ['King Marketing', 'Chrome', '115.0'],
            defaultQueryTimeoutMs: 60000,
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                currentQR = qr;
                botStatus = 'qr_ready';
                console.log('\n📱 QR Generado!');
                console.log('🌐 Accede a: https://tu-app.koyeb.app/qr');
                qrcode.generate(qr, { small: true });
            }

            if (connection === 'close') {
                botStatus = 'disconnected';
                const shouldReconnect = (lastDisconnect?.error instanceof Boom) 
                    ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                    : true;

                console.log('⚠️ Conexión cerrada');
                if (shouldReconnect) {
                    console.log('🔄 Reconectando en 5 segundos...');
                    setTimeout(() => startBot(), 5000);
                }
            } else if (connection === 'open') {
                botStatus = 'connected';
                currentQR = null;
                console.log('\n✅ Bot de King Marketing conectado!');
                console.log('📞 Esperando mensajes...\n');
            }
        });

        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const from = msg.key.remoteJid;
            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            
            if (from.includes('@g.us')) return;

            console.log(`📩 Mensaje de ${from}: ${text}`);

            if (!userSessions.has(from)) {
                userSessions.set(from, { step: 'inicio', data: {} });
            }

            const session = userSessions.get(from);
            
            await delay(1000);
            await sock.sendMessage(from, { 
                text: '¡Hola! 👋 Bienvenido a *King Marketing*\n\nEscribe "menu" para ver las opciones disponibles.' 
            });
        });

    } catch (error) {
        botStatus = 'error';
        console.error('❌ Error:', error.message);
        setTimeout(() => startBot(), 10000);
    }
}

// Manejo de señales
process.on('SIGINT', () => {
    console.log('\n⚠️ Deteniendo bot...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n⚠️ Señal SIGTERM recibida');
    process.exit(0);
});

// Iniciar bot
startBot().catch(err => console.error('Error fatal:', err));