// Chatbot de WhatsApp para King Marketing - VERSIÓN MEJORADA PARA WINDOWS
// Instalación previa: npm install whatsapp-web.js qrcode-terminal

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Configuración mejorada para Windows
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: '.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-extensions'
        ]
    }
});

// Almacenar el estado de cada conversación
const userSessions = new Map();

// Variable para controlar reconexión
let isReconnecting = false;

// Generar código QR para autenticación
client.on('qr', (qr) => {
    console.log('📱 Escanea este código QR con WhatsApp:');
    qrcode.generate(qr, { small: true });
    console.log('\n⚠️ IMPORTANTE: Mantén esta ventana abierta después de escanear');
});

// Cliente listo
client.on('ready', () => {
    console.log('✅ Bot de King Marketing conectado!');
    console.log('📞 Esperando mensajes...\n');
    isReconnecting = false;
});

// Mensaje de autenticación exitosa
client.on('authenticated', () => {
    console.log('🔐 Autenticación exitosa');
});

// Manejo de mensajes
client.on('message', async (message) => {
    try {
        const userId = message.from;
        const userMessage = message.body.toLowerCase().trim();
        
        // Ignorar mensajes de grupos y estados
        if (message.from.includes('@g.us') || message.isStatus) return;
        
        console.log(`📩 Mensaje de ${userId}: ${message.body}`);
        
        // Obtener o crear sesión del usuario
        if (!userSessions.has(userId)) {
            userSessions.set(userId, {
                step: 'inicio',
                data: {}
            });
        }
        
        const session = userSessions.get(userId);
        
        // Lógica del flujo conversacional
        await handleConversation(message, session, userMessage);
    } catch (error) {
        console.error('❌ Error al procesar mensaje:', error.message);
    }
});

// Función principal del flujo conversacional
async function handleConversation(message, session, userMessage) {
    const userId = message.from;
    
    try {
        switch (session.step) {
            case 'inicio':
                await sendWelcomeMessage(message);
                session.step = 'menu_principal';
                break;
                
            case 'menu_principal':
                await handleMainMenu(message, session, userMessage);
                break;
                
            case 'servicios':
                await handleServicesMenu(message, session, userMessage);
                break;
                
            case 'cotizacion_nombre':
                session.data.nombre = message.body;
                await message.reply(`Mucho gusto *${session.data.nombre}*! 😊\n\n¿Cuál es el nombre de tu empresa o proyecto?`);
                session.step = 'cotizacion_empresa';
                break;
                
            case 'cotizacion_empresa':
                session.data.empresa = message.body;
                await message.reply(`Perfecto! Ahora dime, ¿qué servicio te interesa cotizar?\n\n1️⃣ Social Media Management\n2️⃣ Publicidad Digital (Ads)\n3️⃣ Diseño Web\n4️⃣ Email Marketing\n5️⃣ Paquete completo`);
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
                session.data.servicio = servicios[userMessage] || message.body;
                await message.reply(`Excelente elección! 🎯\n\n¿Cuál es tu presupuesto aproximado mensual?\n\n1️⃣ $500 - $1,000 USD\n2️⃣ $1,000 - $3,000 USD\n3️⃣ $3,000 - $5,000 USD\n4️⃣ Más de $5,000 USD\n5️⃣ Por definir`);
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
                session.data.presupuesto = presupuestos[userMessage] || message.body;
                
                await message.reply(`¡Excelente *${session.data.nombre}*! ✅\n\n📋 *Resumen de tu solicitud:*\n👤 Nombre: ${session.data.nombre}\n🏢 Empresa: ${session.data.empresa}\n🎯 Servicio: ${session.data.servicio}\n💰 Presupuesto: ${session.data.presupuesto}\n\nUn asesor especializado te contactará en las próximas 24 horas para:\n✅ Entender tus objetivos\n✅ Diseñar una estrategia personalizada\n✅ Enviarte una propuesta detallada\n\n¿Hay algo más que quieras agregar sobre tu proyecto? (o escribe *menu* para volver al inicio)`);
                
                // Guardar cotización en archivo
                saveLead('cotizacion', session.data);
                
                session.step = 'cotizacion_final';
                break;
                
            case 'cotizacion_final':
                if (userMessage === 'menu') {
                    await sendWelcomeMessage(message);
                    session.step = 'menu_principal';
                } else {
                    session.data.comentarios = message.body;
                    await message.reply(`Gracias por la información adicional! 📝\n\nHemos registrado tu comentario y lo incluiremos en la propuesta.\n\n¿Necesitas algo más?\n\nEscribe *menu* para volver al menú principal`);
                    session.step = 'menu_principal';
                }
                break;
                
            case 'reunion_tipo':
                const tiposReunion = {
                    '1': 'Videollamada (Google Meet/Zoom)',
                    '2': 'Llamada telefónica',
                    '3': 'Presencial en Cúcuta'
                };
                session.data.tipoReunion = tiposReunion[userMessage] || message.body;
                await message.reply(`Perfecto! ${session.data.tipoReunion} 📅\n\n¿Qué día te vendría mejor?\n\n1️⃣ Esta semana\n2️⃣ Próxima semana\n3️⃣ En dos semanas`);
                session.step = 'reunion_fecha';
                break;
                
            case 'reunion_fecha':
                const fechas = {
                    '1': 'Esta semana',
                    '2': 'Próxima semana',
                    '3': 'En dos semanas'
                };
                session.data.fecha = fechas[userMessage] || message.body;
                await message.reply(`Genial! ⏰\n\n¿Qué horario prefieres?\n\n1️⃣ Mañana (9am - 12pm)\n2️⃣ Tarde (2pm - 5pm)\n3️⃣ Flexible`);
                session.step = 'reunion_horario';
                break;
                
            case 'reunion_horario':
                const horarios = {
                    '1': 'Mañana (9am - 12pm)',
                    '2': 'Tarde (2pm - 5pm)',
                    '3': 'Flexible'
                };
                session.data.horario = horarios[userMessage] || message.body;
                await message.reply(`Perfecto! Para confirmar tu reunión, por favor proporcióname:\n\n📝 Tu nombre completo:\n📞 Tu teléfono:\n📧 Tu email:\n\n(Puedes enviarlos todos juntos o uno por uno)`);
                session.step = 'reunion_datos';
                break;
                
            case 'reunion_datos':
                session.data.contacto = message.body;
                await message.reply(`¡Listo! ✅\n\n*Solicitud de reunión registrada:*\n📅 Tipo: ${session.data.tipoReunion}\n🗓️ Fecha: ${session.data.fecha}\n⏰ Horario: ${session.data.horario}\n📋 Contacto: ${session.data.contacto}\n\nUn asesor confirmará tu reunión en las próximas horas y te enviará el enlace/detalles.\n\n¡Gracias por confiar en King Marketing! 🚀\n\nEscribe *menu* para volver al inicio`);
                
                saveLead('reunion', session.data);
                
                session.step = 'menu_principal';
                break;
                
            default:
                await sendWelcomeMessage(message);
                session.step = 'menu_principal';
        }
        
        userSessions.set(userId, session);
    } catch (error) {
        console.error('❌ Error en handleConversation:', error.message);
        await message.reply('Disculpa, hubo un error. Escribe *menu* para volver a empezar.');
    }
}

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
        
        // Leer leads existentes
        if (fs.existsSync(filename)) {
            const content = fs.readFileSync(filename, 'utf8');
            try {
                leads = JSON.parse(content);
            } catch (e) {
                leads = [];
            }
        }
        
        // Agregar nuevo lead
        leads.push(lead);
        
        // Guardar
        fs.writeFileSync(filename, JSON.stringify(leads, null, 2));
        console.log(`💾 Lead guardado en ${filename}`);
    } catch (error) {
        console.error('❌ Error al guardar lead:', error.message);
    }
}

// Mensaje de bienvenida
async function sendWelcomeMessage(message) {
    const welcomeMsg = `¡Hola! 👋 Bienvenido a *King Marketing*
Tu aliado en marketing digital 🚀

Soy tu asistente virtual y estoy aquí para ayudarte.

¿En qué puedo asistirte hoy?

1️⃣ Conocer nuestros servicios
2️⃣ Solicitar una cotización
3️⃣ Agendar una reunión
4️⃣ Ver casos de éxito
5️⃣ Hablar con un asesor

_Escribe el número de la opción que prefieras_ ✍️`;
    
    await message.reply(welcomeMsg);
}

// Manejo del menú principal
async function handleMainMenu(message, session, userMessage) {
    switch (userMessage) {
        case '1':
            await showServices(message);
            session.step = 'servicios';
            break;
            
        case '2':
            await message.reply(`Perfecto! Para brindarte una cotización personalizada necesito algunos datos:\n\n📝 ¿Cuál es tu nombre?`);
            session.step = 'cotizacion_nombre';
            break;
            
        case '3':
            await message.reply(`¡Genial! Agendemos una reunión 📅\n\n¿Qué tipo de reunión prefieres?\n\n1️⃣ Videollamada (Google Meet/Zoom)\n2️⃣ Llamada telefónica\n3️⃣ Presencial (si estás en Cúcuta)`);
            session.step = 'reunion_tipo';
            break;
            
        case '4':
            await showSuccessCases(message);
            break;
            
        case '5':
            await message.reply(`¡Claro! Te conectaré con uno de nuestros asesores expertos. 👨‍💼\n\nPor favor déjanos:\n- Tu nombre:\n- Tu empresa:\n- Tu consulta específica:\n\nUn asesor humano tomará tu conversación en breve ⏱️\n\n_Nota: Este es un bot de demostración. En producción, aquí se transferiría el chat a un operador real._`);
            break;
            
        default:
            if (userMessage.includes('precio') || userMessage.includes('costo') || userMessage.includes('cuanto')) {
                await message.reply(`Los precios varían según tus necesidades específicas.\n\n¿Te gustaría que te enviemos una cotización personalizada?\n\n1️⃣ Sí, solicitar cotización\n2️⃣ Ver más información primero\n\nEscribe *menu* para volver al inicio`);
            } else if (userMessage.includes('horario') || userMessage.includes('hora')) {
                await message.reply(`📅 *Horario de atención:*\nLunes a Viernes: 8am - 6pm\nSábados: 9am - 1pm\nDomingos: Cerrado\n\n¿Necesitas algo más?\n\nEscribe *menu* para ver las opciones`);
            } else if (userMessage.includes('ubicacion') || userMessage.includes('direccion') || userMessage.includes('donde')) {
                await message.reply(`📍 *King Marketing*\nCúcuta, Norte de Santander, Colombia\n📞 WhatsApp: +57 350 3899157\n📧 info@kingmarketing.com\n\nEscribe *menu* para volver al inicio`);
            } else {
                await message.reply(`No entendí tu mensaje. 🤔\n\nEscribe *menu* para ver las opciones disponibles.`);
            }
    }
}

// Mostrar servicios
async function showServices(message) {
    const servicesMsg = `Excelente! En *King Marketing* ofrecemos:

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

_Escribe el número de tu elección_ ✍️`;
    
    await message.reply(servicesMsg);
}

// Mostrar casos de éxito
async function showSuccessCases(message) {
    const casesMsg = `¡Nos encanta compartir nuestros resultados! 🏆

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
3️⃣ Volver al menú principal`;
    
    await message.reply(casesMsg);
}

// Manejo del menú de servicios
async function handleServicesMenu(message, session, userMessage) {
    switch (userMessage) {
        case '1':
            await message.reply(`Perfecto! Para brindarte una cotización personalizada necesito algunos datos:\n\n📝 ¿Cuál es tu nombre?`);
            session.step = 'cotizacion_nombre';
            break;
        case '2':
            await message.reply(`¡Genial! Agendemos una reunión 📅\n\n¿Qué tipo de reunión prefieres?\n\n1️⃣ Videollamada (Google Meet/Zoom)\n2️⃣ Llamada telefónica\n3️⃣ Presencial (si estás en Cúcuta)`);
            session.step = 'reunion_tipo';
            break;
        case '3':
            await showSuccessCases(message);
            session.step = 'menu_principal';
            break;
        case '4':
        case 'menu':
            await sendWelcomeMessage(message);
            session.step = 'menu_principal';
            break;
        default:
            await message.reply(`Por favor selecciona una opción válida (1-4) o escribe *menu*`);
    }
}

// Manejo de errores mejorado
client.on('auth_failure', (msg) => {
    console.error('❌ Error de autenticación:', msg);
    console.log('💡 Solución: Elimina la carpeta .wwebjs_auth y vuelve a escanear el QR');
});

client.on('disconnected', async (reason) => {
    console.log('⚠️ Cliente desconectado:', reason);
    
    if (!isReconnecting && reason !== 'LOGOUT') {
        isReconnecting = true;
        console.log('🔄 Intentando reconectar en 5 segundos...');
        
        setTimeout(() => {
            try {
                client.initialize();
            } catch (error) {
                console.error('❌ Error al reconectar:', error.message);
            }
        }, 5000);
    }
});

// Manejo de cierre de proceso
process.on('SIGINT', async () => {
    console.log('\n⚠️ Cerrando bot de forma segura...');
    try {
        await client.destroy();
        console.log('✅ Bot cerrado correctamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al cerrar:', error.message);
        process.exit(1);
    }
});

// Iniciar el cliente
console.log('🚀 Iniciando Bot de King Marketing...');
console.log('📁 Directorio de trabajo:', __dirname);
client.initialize();