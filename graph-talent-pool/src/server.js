const http = require('http');
const { handleRequest } = require('./api/routes');
const { closeConnection } = require('./database/connection');
const config = require('./config/database');

const PORT = config.PORT;

// Create HTTP server
const server = http.createServer(handleRequest);

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Talent Pool Dashboard running at http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at /api/*`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    server.close(async () => {
        await closeConnection();
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    server.close(async () => {
        await closeConnection();
        console.log('✅ Server closed');
        process.exit(0);
    });
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
