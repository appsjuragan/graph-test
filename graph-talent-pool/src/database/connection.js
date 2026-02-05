const neo4j = require('neo4j-driver');
const config = require('../config/database');

let driver = null;

/**
 * Get or create Neo4j driver instance (singleton pattern)
 */
function getDriver() {
    if (!driver) {
        driver = neo4j.driver(
            config.NEO4J_URI,
            neo4j.auth.basic(config.NEO4J_USER, config.NEO4J_PASSWORD)
        );
    }
    return driver;
}

/**
 * Execute a query with automatic session management
 * @param {string} query - Cypher query
 * @param {object} params - Query parameters
 * @returns {Promise<object>} Query result
 */
async function executeQuery(query, params = {}) {
    const driver = getDriver();
    const session = driver.session();
    try {
        return await session.run(query, params);
    } finally {
        await session.close();
    }
}

/**
 * Close the driver connection
 */
async function closeConnection() {
    if (driver) {
        await driver.close();
        driver = null;
    }
}

module.exports = {
    getDriver,
    executeQuery,
    closeConnection
};
