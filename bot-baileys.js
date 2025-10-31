// Chatbot WhatsApp usando Baileys - VERSIÓN MEJORADA CON MEJOR CONEXIÓN
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, delay, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const fs = require('fs');

// Almacenar el estado de cada conversación
const userSessions = new Map();

// Logger silencioso (para no ver tanto spam)
const logger = pino({ level: 'warn' });

// Variable para control de reintentos
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Función para guardar leads
function saveLead(tipo, data) {
    try {
        const fecha = new Date().toISOString();
        const lead = {
            tipo,
            fecha,
            ...data
        };
        
        const filename = `leads_${tipo}.json`;
        let leads = [];
        
        if (fs.existsSync(filename)) {
            const content = fs.readFileSync(filename, 'utf8');
            try {
                leads = JSON.parse(content);
            } catch (e) {
                leads = [];
            }
        }
        
        leads.push(lead);
        fs.writeFileSync(filename, JSON.stringify(leads, null, 2));
        console.log(`💾 Lead guardado en ${filename}`);
    } catch (error) {
        console.error('❌ Error al guardar lead:', error.message);
    }
}

// Mensajes del bot
const MESSAGES = {
    welcome: `¡Hola! 👋 Bienvenido a *King Marketing*
Tu aliado en marketing digital 🚀

Soy tu asistente virtual y estoy aquí para ayudarte.

¿En qué puedo asistirte hoy?

1️⃣ Conocer nuestros servicios
2️⃣ Solicitar una cotización
3️⃣ Agendar una reunión
4️⃣ Ver casos de éxito
5️⃣ Hablar con un asesor

_Escribe el número de la opción que prefieras_ ✍️`,

    services: `Excelente! En *King Marketing* ofrecemos:

📱 *Social Media Management*
- Gestión de redes sociales
- Creación de contenido
- Community management

🎯 *Publicidad Digital*
- Google Ads
- Facebook & Instagram Ads
- TikTok Ads

🌐 *Diseño Web & SEO*
- Páginas web corporativas
- E-commerce
- Posicionamiento SEO

📊 *Email Marketing & Automation*
- Campañas de email
- Automatización de marketing
- CRM

¿Qué te gustaría hacer?
1️⃣ Solicitar cotización
2️⃣ Agendar reunión
3️⃣ Ver casos de éxito
4️⃣ Volver al menú

_Escribe el número de tu elección_ ✍️`,

    cases: `¡Nos encanta compartir nuestros resultados! 🏆

📈 *E-commerce de Moda*
• 300% aumento en ventas online
• ROAS de 5.2x en Facebook Ads
• 50K+ nuevos seguidores

🍔 *Restaurante Local*
• 85% incremento en pedidos
• 200+ reseñas positivas
• Presencia en 4 plataformas

🏥 *Clínica Dental*
• 120 pacientes nuevos/mes
• Posicionamiento #1 en Google
• 40% reducción en costo por lead

¿Te gustaría?
1️⃣ Solicitar una cotización
2️⃣ Agendar una reunión
3️⃣ Volver al menú principal`
};

// Función principal del bot
async function startBot() {
    try {
        // Obtener última versión de Baileys
        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`📦 Usando Baileys v${version.join('.')} ${isLatest ? '(última versión)' : ''}`);

        // Cargar estado de autenticación
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        
        // Crear socket con configuración mejorada
        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            logger,
            browser: ['King Marketing', 'Chrome', '115.0'],
            defaultQueryTimeoutMs: 60000, // 60 segundos timeout
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            retryRequestDelayMs: 250,
            markOnlineOnConnect: true,
            syncFullHistory: false,
            getMessage: async (key) => {
                return { conversation: '' };
            }
        });

        // Guardar credenciales cuando cambien
        sock.ev.on('creds.update', saveCreds);

        // Manejo de conexión mejorado
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('\n📱 Escanea este código QR con WhatsApp:\n');
                qrcode.generate(qr, { small: true });
                console.log('\n⚠️ IMPORTANTE:');
                console.log('1. Usa WhatsApp NORMAL (app azul), NO Business');
                console.log('2. Mantén esta ventana abierta');
                console.log('3. Si el QR expira, el bot generará uno nuevo automáticamente\n');
            }

            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error instanceof Boom) 
                    ? lastDisconnect.error.output?.statusCode
                    : null;

                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                console.log('⚠️ Conexión cerrada.');
                if (statusCode) {
                    console.log(`   Código: ${statusCode}`);
                    console.log(`   Razón: ${getDisconnectReason(statusCode)}`);
                }

                if (shouldReconnect) {
                    reconnectAttempts++;
                    
                    if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
                        const waitTime = Math.min(reconnectAttempts * 2, 10); // Max 10 segundos
                        console.log(`🔄 Reconectando en ${waitTime} segundos... (intento ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
                        
                        setTimeout(() => {
                            console.log('🔌 Intentando reconectar...');
                            startBot();
                        }, waitTime * 1000);
                    } else {
                        console.log('\n❌ Máximo de reintentos alcanzado.');
                        console.log('💡 Posibles soluciones:');
                        console.log('   1. Verifica tu conexión a internet');
                        console.log('   2. Espera 5 minutos y vuelve a ejecutar: npm start');
                        console.log('   3. Si persiste, elimina auth_info_baileys y escanea de nuevo');
                        console.log('   4. Verifica que tu firewall no esté bloqueando la conexión\n');
                        process.exit(1);
                    }
                } else {
                    console.log('\n❌ Sesión cerrada por WhatsApp.');
                    console.log('💡 Solución: Elimina la carpeta auth_info_baileys y escanea el QR nuevamente');
                    console.log('   Comando: rmdir /s /q auth_info_baileys (Windows)');
                    console.log('            rm -rf auth_info_baileys (Linux/Mac)\n');
                    process.exit(1);
                }
            } else if (connection === 'open') {
                reconnectAttempts = 0; // Resetear contador
                console.log('\n✅ Bot de King Marketing conectado exitosamente!');
                console.log('📞 Esperando mensajes...');
                console.log('💡 Presiona Ctrl+C para detener el bot\n');
            } else if (connection === 'connecting') {
                console.log('🔌 Conectando a WhatsApp...');
            }
        });

        // Manejo de mensajes
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;

            for (const msg of messages) {
                try {
                    // Ignorar mensajes propios
                    if (!msg.message || msg.key.fromMe) continue;

                    const from = msg.key.remoteJid;
                    const messageText = msg.message?.conversation || 
                                      msg.message?.extendedTextMessage?.text || '';
                    
                    const userMessage = messageText.toLowerCase().trim();

                    // Ignorar grupos y broadcasts
                    if (from.includes('@g.us') || from.includes('@broadcast')) continue;

                    // Extraer número de teléfono para log
                    const phoneNumber = from.split('@')[0];
                    console.log(`\n📩 [${new Date().toLocaleTimeString()}] Mensaje de +${phoneNumber}`);
                    console.log(`   "${messageText}"`);

                    // Obtener o crear sesión
                    if (!userSessions.has(from)) {
                        userSessions.set(from, {
                            step: 'inicio',
                            data: {}
                        });
                    }

                    const session = userSessions.get(from);

                    // Procesar mensaje
                    await handleMessage(sock, from, userMessage, messageText, session);
                } catch (error) {
                    console.error('❌ Error procesando mensaje:', error.message);
                }
            }
        });

        // Registrar cuando el socket se cierra
        sock.ws.on('close', () => {
            console.log('🔌 WebSocket cerrado');
        });

        return sock;
    } catch (error) {
        console.error('❌ Error iniciando el bot:', error.message);
        
        if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
            console.log('\n💡 Error de conexión a internet:');
            console.log('   1. Verifica tu conexión a internet');
            console.log('   2. Desactiva VPN si tienes una activa');
            console.log('   3. Verifica que no haya un firewall bloqueando');
            console.log('   4. Intenta usar otra red WiFi/datos móviles\n');
        }
        
        throw error;
    }
}

// Obtener razón de desconexión legible
function getDisconnectReason(statusCode) {
    const reasons = {
        [DisconnectReason.badSession]: 'Sesión corrupta - Elimina auth_info_baileys',
        [DisconnectReason.connectionClosed]: 'Conexión cerrada - Reintentando',
        [DisconnectReason.connectionLost]: 'Conexión perdida - Verifica tu internet',
        [DisconnectReason.connectionReplaced]: 'Otra sesión se conectó en este número',
        [DisconnectReason.loggedOut]: 'Sesión cerrada desde WhatsApp - Escanea QR nuevamente',
        [DisconnectReason.restartRequired]: 'Reinicio requerido',
        [DisconnectReason.timedOut]: 'Tiempo de espera agotado - Verifica tu conexión',
        401: 'No autorizado - Escanea el QR nuevamente',
        408: 'Timeout - Verifica tu conexión a internet',
        411: 'Conflicto de múltiples dispositivos',
        428: 'Conexión perdida',
        440: 'Sesión expirada',
        500: 'Error interno de WhatsApp',
        503: 'Servicio no disponible - Intenta más tarde'
    };
    
    return reasons[statusCode] || `Error desconocido (${statusCode})`;
}

// Función para manejar mensajes
async function handleMessage(sock, from, userMessage, messageText, session) {
    let response = '';

    switch (session.step) {
        case 'inicio':
            response = MESSAGES.welcome;
            session.step = 'menu_principal';
            break;

        case 'menu_principal':
            if (userMessage === '1') {
                response = MESSAGES.services;
                session.step = 'servicios';
            } else if (userMessage === '2') {
                response = 'Perfecto! Para brindarte una cotización personalizada necesito algunos datos:\n\n📝 ¿Cuál es tu nombre?';
                session.step = 'cotizacion_nombre';
            } else if (userMessage === '3') {
                response = '¡Genial! Agendemos una reunión 📅\n\n¿Qué tipo de reunión prefieres?\n\n1️⃣ Videollamada (Google Meet/Zoom)\n2️⃣ Llamada telefónica\n3️⃣ Presencial (si estás en Cúcuta)';
                session.step = 'reunion_tipo';
            } else if (userMessage === '4') {
                response = MESSAGES.cases;
            } else if (userMessage === '5') {
                response = '¡Claro! Te conectaré con uno de nuestros asesores expertos. 👨‍💼\n\nPor favor déjanos:\n- Tu nombre:\n- Tu empresa:\n- Tu consulta específica:\n\nUn asesor humano tomará tu conversación en breve ⏱️';
            } else if (userMessage.includes('precio') || userMessage.includes('costo')) {
                response = 'Los precios varían según tus necesidades específicas.\n\n¿Te gustaría que te enviemos una cotización personalizada?\n\n1️⃣ Sí, solicitar cotización\n2️⃣ Ver más información primero\n\nEscribe *menu* para volver al inicio';
            } else if (userMessage.includes('horario')) {
                response = '📅 *Horario de atención:*\nLunes a Viernes: 8am - 6pm\nSábados: 9am - 1pm\nDomingos: Cerrado\n\n¿Necesitas algo más?\n\nEscribe *menu* para ver las opciones';
            } else if (userMessage.includes('ubicacion') || userMessage.includes('direccion')) {
                response = '📍 *King Marketing*\nCúcuta, Norte de Santander, Colombia\n📞 WhatsApp: +57 350 3899157\n📧 info@kingmarketing.com\n\nEscribe *menu* para volver al inicio';
            } else {
                response = 'No entendí tu mensaje. 🤔\n\nEscribe *menu* para ver las opciones disponibles.';
            }
            break;

        case 'servicios':
            if (userMessage === '1') {
                response = 'Perfecto! Para brindarte una cotización personalizada necesito algunos datos:\n\n📝 ¿Cuál es tu nombre?';
                session.step = 'cotizacion_nombre';
            } else if (userMessage === '2') {
                response = '¡Genial! Agendemos una reunión 📅\n\n¿Qué tipo de reunión prefieres?\n\n1️⃣ Videollamada (Google Meet/Zoom)\n2️⃣ Llamada telefónica\n3️⃣ Presencial (si estás en Cúcuta)';
                session.step = 'reunion_tipo';
            } else if (userMessage === '3') {
                response = MESSAGES.cases;
                session.step = 'menu_principal';
            } else if (userMessage === '4' || userMessage === 'menu') {
                response = MESSAGES.welcome;
                session.step = 'menu_principal';
            } else {
                response = 'Por favor selecciona una opción válida (1-4) o escribe *menu*';
            }
            break;

        case 'cotizacion_nombre':
            session.data.nombre = messageText;
            response = `Mucho gusto *${session.data.nombre}*! 😊\n\n¿Cuál es el nombre de tu empresa o proyecto?`;
            session.step = 'cotizacion_empresa';
            break;

        case 'cotizacion_empresa':
            session.data.empresa = messageText;
            response = 'Perfecto! Ahora dime, ¿qué servicio te interesa cotizar?\n\n1️⃣ Social Media Management\n2️⃣ Publicidad Digital (Ads)\n3️⃣ Diseño Web\n4️⃣ Email Marketing\n5️⃣ Paquete completo';
            session.step = 'cotizacion_servicio';
            break;

        case 'cotizacion_servicio':
            const servicios = {
                '1': 'Social Media Management',
                '2': 'Publicidad Digital',
                '3': 'Diseño Web',
                '4': 'Email Marketing',
                '5': 'Paquete Completo'
            };
            session.data.servicio = servicios[userMessage] || messageText;
            response = 'Excelente elección! 🎯\n\n¿Cuál es tu presupuesto aproximado mensual?\n\n1️⃣ $500 - $1,000 USD\n2️⃣ $1,000 - $3,000 USD\n3️⃣ $3,000 - $5,000 USD\n4️⃣ Más de $5,000 USD\n5️⃣ Por definir';
            session.step = 'cotizacion_presupuesto';
            break;

        case 'cotizacion_presupuesto':
            const presupuestos = {
                '1': '$500 - $1,000 USD',
                '2': '$1,000 - $3,000 USD',
                '3': '$3,000 - $5,000 USD',
                '4': 'Más de $5,000 USD',
                '5': 'Por definir'
            };
            session.data.presupuesto = presupuestos[userMessage] || messageText;
            response = `¡Excelente *${session.data.nombre}*! ✅\n\n📋 *Resumen de tu solicitud:*\n👤 Nombre: ${session.data.nombre}\n🏢 Empresa: ${session.data.empresa}\n🎯 Servicio: ${session.data.servicio}\n💰 Presupuesto: ${session.data.presupuesto}\n\nUn asesor especializado te contactará en las próximas 24 horas para:\n✅ Entender tus objetivos\n✅ Diseñar una estrategia personalizada\n✅ Enviarte una propuesta detallada\n\n¿Hay algo más que quieras agregar sobre tu proyecto? (o escribe *menu* para volver al inicio)`;
            saveLead('cotizacion', session.data);
            session.step = 'cotizacion_final';
            break;

        case 'cotizacion_final':
            if (userMessage === 'menu') {
                response = MESSAGES.welcome;
                session.step = 'menu_principal';
            } else {
                session.data.comentarios = messageText;
                response = 'Gracias por la información adicional! 📝\n\nHemos registrado tu comentario y lo incluiremos en la propuesta.\n\n¿Necesitas algo más?\n\nEscribe *menu* para volver al menú principal';
                session.step = 'menu_principal';
            }
            break;

        case 'reunion_tipo':
            const tiposReunion = {
                '1': 'Videollamada (Google Meet/Zoom)',
                '2': 'Llamada telefónica',
                '3': 'Presencial en Cúcuta'
            };
            session.data.tipoReunion = tiposReunion[userMessage] || messageText;
            response = `Perfecto! ${session.data.tipoReunion} 📅\n\n¿Qué día te vendría mejor?\n\n1️⃣ Esta semana\n2️⃣ Próxima semana\n3️⃣ En dos semanas`;
            session.step = 'reunion_fecha';
            break;

        case 'reunion_fecha':
            const fechas = {
                '1': 'Esta semana',
                '2': 'Próxima semana',
                '3': 'En dos semanas'
            };
            session.data.fecha = fechas[userMessage] || messageText;
            response = 'Genial! ⏰\n\n¿Qué horario prefieres?\n\n1️⃣ Mañana (9am - 12pm)\n2️⃣ Tarde (2pm - 5pm)\n3️⃣ Flexible';
            session.step = 'reunion_horario';
            break;

        case 'reunion_horario':
            const horarios = {
                '1': 'Mañana (9am - 12pm)',
                '2': 'Tarde (2pm - 5pm)',
                '3': 'Flexible'
            };
            session.data.horario = horarios[userMessage] || messageText;
            response = 'Perfecto! Para confirmar tu reunión, por favor proporcióname:\n\n📝 Tu nombre completo:\n📞 Tu teléfono:\n📧 Tu email:\n\n(Puedes enviarlos todos juntos o uno por uno)';
            session.step = 'reunion_datos';
            break;

        case 'reunion_datos':
            session.data.contacto = messageText;
            response = `¡Listo! ✅\n\n*Solicitud de reunión registrada:*\n📅 Tipo: ${session.data.tipoReunion}\n🗓️ Fecha: ${session.data.fecha}\n⏰ Horario: ${session.data.horario}\n📋 Contacto: ${session.data.contacto}\n\nUn asesor confirmará tu reunión en las próximas horas y te enviará el enlace/detalles.\n\n¡Gracias por confiar en King Marketing! 🚀\n\nEscribe *menu* para volver al inicio`;
            saveLead('reunion', session.data);
            session.step = 'menu_principal';
            break;

        default:
            response = MESSAGES.welcome;
            session.step = 'menu_principal';
    }

    userSessions.set(from, session);
    
    // Delay para parecer más humano
    await delay(1000);
    
    // Enviar mensaje
    await sock.sendMessage(from, { text: response });
    console.log(`✅ Respuesta enviada\n`);
}

// Manejo de cierre
process.on('SIGINT', () => {
    console.log('\n\n⚠️ Deteniendo bot...');
    console.log('✅ Bot cerrado. ¡Hasta pronto!\n');
    process.exit(0);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ Error no manejado:', err.message);
});

// Iniciar bot
console.log('🚀 Iniciando Bot de King Marketing con Baileys...\n');
startBot().catch(err => {
    console.error('\n❌ Error fatal:', err.message);
    console.log('\n💡 Intenta:');
    console.log('   1. Verifica tu internet');
    console.log('   2. Elimina auth_info_baileys y vuelve a intentar');
    console.log('   3. Ejecuta: npm install --force\n');
    process.exit(1);
});