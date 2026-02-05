const neo4j = require('neo4j-driver');

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'fraudanalysis123';

async function runFraudQueries() {
    console.log('🔍 Running Fraud Detection Queries...\n');

    const driver = neo4j.driver(
        NEO4J_URI,
        neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
    );

    try {
        await driver.verifyConnectivity();
        const session = driver.session();

        // ====================================================================
        // 1. Find KTPs used by multiple persons/emails
        // ====================================================================
        console.log('='.repeat(60));
        console.log('📌 QUERY 1: Shared KTP Numbers (Multiple Emails per KTP)');
        console.log('='.repeat(60));

        const sharedKTP = await session.run(`
            MATCH (p:Person)-[:HAS_EMAIL]->(e:Email)
            WITH p.ktpNumber as ktp, p.name as name, collect(DISTINCT e.address) as emails
            WHERE size(emails) > 1
            RETURN ktp, name, emails, size(emails) as emailCount
            ORDER BY emailCount DESC
            LIMIT 10
        `);

        if (sharedKTP.records.length > 0) {
            console.log(`\n🚨 Found ${sharedKTP.records.length} suspicious KTPs with multiple emails:\n`);
            sharedKTP.records.forEach((record, i) => {
                console.log(`  ${i + 1}. KTP: ${record.get('ktp')}`);
                console.log(`     Name: ${record.get('name')}`);
                console.log(`     Emails (${record.get('emailCount')}): ${record.get('emails').slice(0, 3).join(', ')}${record.get('emailCount') > 3 ? '...' : ''}`);
                console.log();
            });
        } else {
            console.log('✅ No shared KTP fraud detected');
        }

        // ====================================================================
        // 2. Find emails with excessive registrations
        // ====================================================================
        console.log('='.repeat(60));
        console.log('📌 QUERY 2: Email Addresses with Excessive Registrations');
        console.log('='.repeat(60));

        const excessiveRegs = await session.run(`
            MATCH (e:Email)-[:USED_IN]->(r:Registration)
            WITH e.address as email, count(r) as regCount, collect(DISTINCT r.id) as registrations
            WHERE regCount > 5
            RETURN email, regCount
            ORDER BY regCount DESC
            LIMIT 10
        `);

        if (excessiveRegs.records.length > 0) {
            console.log(`\n🚨 Found ${excessiveRegs.records.length} emails with excessive registrations:\n`);
            excessiveRegs.records.forEach((record, i) => {
                console.log(`  ${i + 1}. Email: ${record.get('email')}`);
                console.log(`     Registrations: ${record.get('regCount')}`);
                console.log();
            });
        } else {
            console.log('✅ No excessive registrations detected');
        }

        // ====================================================================
        // 3. Find product limit violations per KTP
        // ====================================================================
        console.log('='.repeat(60));
        console.log('📌 QUERY 3: Product Limit Violations per KTP');
        console.log('='.repeat(60));

        const productViolations = await session.run(`
            MATCH (p:Person)-[:REGISTERED]->(r:Registration)-[:FOR_PRODUCT]->(pr:Product)
            WITH p.ktpNumber as ktp, p.name as name, pr.productType as product, 
                 pr.perKTPLimit as limit, count(r) as purchased
            WHERE limit > 0 AND purchased > limit
            RETURN ktp, name, product, limit, purchased, purchased - limit as exceeded
            ORDER BY exceeded DESC
            LIMIT 15
        `);

        if (productViolations.records.length > 0) {
            console.log(`\n🚨 Found ${productViolations.records.length} product limit violations:\n`);
            productViolations.records.forEach((record, i) => {
                console.log(`  ${i + 1}. KTP: ${record.get('ktp')}`);
                console.log(`     Name: ${record.get('name')}`);
                console.log(`     Product: ${record.get('product')}`);
                console.log(`     Limit: ${record.get('limit')}, Purchased: ${record.get('purchased')} (exceeded by ${record.get('exceeded')})`);
                console.log();
            });
        } else {
            console.log('✅ No product limit violations detected');
        }

        // ====================================================================
        // 4. Find potential agent/middleman patterns
        // ====================================================================
        console.log('='.repeat(60));
        console.log('📌 QUERY 4: Potential Agent/Middleman Patterns');
        console.log('='.repeat(60));

        const agentPatterns = await session.run(`
            MATCH (p:Person)-[:REGISTERED]->(r:Registration)
            WITH p, count(r) as regCount
            WHERE regCount > 10
            RETURN p.id as personId, p.name as name, p.isAgent as isAgent, 
                   p.agentCompany as company, regCount
            ORDER BY regCount DESC
            LIMIT 10
        `);

        if (agentPatterns.records.length > 0) {
            console.log(`\n🚨 Found ${agentPatterns.records.length} potential agent/middleman accounts:\n`);
            agentPatterns.records.forEach((record, i) => {
                console.log(`  ${i + 1}. Person: ${record.get('name')} (${record.get('personId')})`);
                console.log(`     Is Agent: ${record.get('isAgent')}`);
                console.log(`     Company: ${record.get('company') || 'N/A'}`);
                console.log(`     Total Registrations: ${record.get('regCount')}`);
                console.log();
            });
        } else {
            console.log('✅ No agent patterns detected');
        }

        // ====================================================================
        // 5. Summary of all fraud patterns
        // ====================================================================
        console.log('='.repeat(60));
        console.log('📌 QUERY 5: Fraud Pattern Summary');
        console.log('='.repeat(60));

        const fraudSummary = await session.run(`
            MATCH (f:FraudPattern)
            RETURN f.type as type, f.severity as severity, count(*) as count
            ORDER BY count DESC
        `);

        if (fraudSummary.records.length > 0) {
            console.log('\n📊 Fraud Pattern Distribution:\n');
            fraudSummary.records.forEach(record => {
                const type = record.get('type');
                const severity = record.get('severity');
                const count = record.get('count');
                const bar = '█'.repeat(Math.min(count.toNumber(), 30));
                console.log(`  ${type.padEnd(20)} [${severity.padEnd(6)}] ${bar} (${count})`);
            });
            console.log();
        }

        // ====================================================================
        // 6. Connected fraud network analysis
        // ====================================================================
        console.log('='.repeat(60));
        console.log('📌 QUERY 6: Connected Fraud Network (Shared Resources)');
        console.log('='.repeat(60));

        const connectedFraud = await session.run(`
            MATCH (p1:Person)-[:HAS_EMAIL]->(e:Email)<-[:HAS_EMAIL]-(p2:Person)
            WHERE p1.id < p2.id
            RETURN p1.name as person1, p2.name as person2, e.address as sharedEmail
            LIMIT 10
        `);

        if (connectedFraud.records.length > 0) {
            console.log(`\n🚨 Found ${connectedFraud.records.length} persons sharing email addresses:\n`);
            connectedFraud.records.forEach((record, i) => {
                console.log(`  ${i + 1}. ${record.get('person1')} <-> ${record.get('person2')}`);
                console.log(`     Shared Email: ${record.get('sharedEmail')}`);
                console.log();
            });
        } else {
            console.log('✅ No shared email connections detected');
        }

        // ====================================================================
        // Statistics
        // ====================================================================
        console.log('='.repeat(60));
        console.log('📊 DATABASE STATISTICS');
        console.log('='.repeat(60));

        const stats = await session.run(`
            MATCH (p:Person) WITH count(p) as persons
            MATCH (e:Email) WITH persons, count(e) as emails
            MATCH (r:Registration) WITH persons, emails, count(r) as registrations
            MATCH (f:FraudPattern) WITH persons, emails, registrations, count(f) as fraudPatterns
            RETURN persons, emails, registrations, fraudPatterns
        `);

        const statsRecord = stats.records[0];
        console.log(`\n  Total Persons: ${statsRecord.get('persons')}`);
        console.log(`  Total Emails: ${statsRecord.get('emails')}`);
        console.log(`  Total Registrations: ${statsRecord.get('registrations')}`);
        console.log(`  Total Fraud Patterns: ${statsRecord.get('fraudPatterns')}`);
        console.log();

        await session.close();
        console.log('✅ Fraud detection queries complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await driver.close();
    }
}

runFraudQueries();
