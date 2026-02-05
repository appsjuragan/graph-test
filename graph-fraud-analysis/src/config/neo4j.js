const neo4j = require('neo4j-driver');

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'fraudanalysis123';

let driver = null;

function getDriver() {
    if (!driver) {
        driver = neo4j.driver(
            NEO4J_URI,
            neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
            { maxConnectionPoolSize: 50 }
        );
    }
    return driver;
}

async function closeDriver() {
    if (driver) {
        await driver.close();
        driver = null;
    }
}

module.exports = {
    getDriver,
    closeDriver,
    NEO4J_URI,
    NEO4J_USER,
    NEO4J_PASSWORD
};
