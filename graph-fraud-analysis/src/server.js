const express = require('express');
const path = require('path');
const neo4j = require('neo4j-driver');

const app = express();
const PORT = process.env.PORT || 3000;

// Neo4j connection
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'fraudanalysis123';

const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
);

// Middleware
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());

// API Routes
app.get('/api/stats', async (req, res) => {
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (p:Person) WITH count(p) as persons
            MATCH (e:Email) WITH persons, count(e) as emails
            MATCH (r:Registration) WITH persons, emails, count(r) as registrations
            MATCH (f:FraudPattern) WITH persons, emails, registrations, count(f) as fraudPatterns
            MATCH (f2:FraudPattern) WHERE f2.severity = 'HIGH' WITH persons, emails, registrations, fraudPatterns, count(f2) as highRisk
            RETURN persons, emails, registrations, fraudPatterns, highRisk
        `);
        const record = result.records[0];
        res.json({
            persons: record.get('persons').toNumber(),
            emails: record.get('emails').toNumber(),
            registrations: record.get('registrations').toNumber(),
            fraudPatterns: record.get('fraudPatterns').toNumber(),
            highRisk: record.get('highRisk').toNumber()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

app.get('/api/fraud-patterns', async (req, res) => {
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (f:FraudPattern)-[:INVOLVES]->(p:Person)
            WITH f, collect({id: p.id, name: p.name, ktp: p.ktpNumber}) as persons
            RETURN f.type as type, f.severity as severity, f.description as description, persons
            ORDER BY 
                CASE f.severity 
                    WHEN 'HIGH' THEN 1 
                    WHEN 'MEDIUM' THEN 2 
                    ELSE 3 
                END, f.type
            LIMIT 2000
        `);
        const patterns = result.records.map(r => ({
            type: r.get('type'),
            severity: r.get('severity'),
            description: r.get('description'),
            persons: r.get('persons')
        }));
        res.json(patterns);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

app.get('/api/fraud-summary', async (req, res) => {
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (f:FraudPattern)
            RETURN f.type as type, f.severity as severity, count(*) as count
            ORDER BY count DESC
        `);
        const summary = result.records.map(r => ({
            type: r.get('type'),
            severity: r.get('severity'),
            count: r.get('count').toNumber()
        }));
        res.json(summary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

app.get('/api/persons', async (req, res) => {
    const session = driver.session();
    try {
        const { search, limit = 50, offset = 0 } = req.query;
        let query = `
            MATCH (p:Person)
            ${search ? 'WHERE p.name CONTAINS $search OR p.ktpNumber CONTAINS $search' : ''}
            OPTIONAL MATCH (p)-[:HAS_EMAIL]->(e:Email)
            OPTIONAL MATCH (p)-[:REGISTERED]->(r:Registration)
            WITH p, collect(DISTINCT e.address) as emails, count(DISTINCT r) as regCount
            RETURN p.id as id, p.name as name, p.ktpNumber as ktp, p.gender as gender,
                   p.birthDate as birthDate, p.maritalStatus as maritalStatus,
                   p.isAgent as isAgent, emails, regCount
            ORDER BY regCount DESC
            SKIP toInteger($offset) LIMIT toInteger($limit)
        `;
        const result = await session.run(query, {
            search: search || '',
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        const persons = result.records.map(r => ({
            id: r.get('id'),
            name: r.get('name'),
            ktp: r.get('ktp'),
            gender: r.get('gender'),
            birthDate: r.get('birthDate')?.toString(),
            maritalStatus: r.get('maritalStatus'),
            isAgent: r.get('isAgent'),
            emails: r.get('emails'),
            registrations: r.get('regCount').toNumber()
        }));
        res.json(persons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

app.get('/api/person/:id', async (req, res) => {
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (p:Person {id: $id})
            OPTIONAL MATCH (p)-[:HAS_EMAIL]->(e:Email)
            OPTIONAL MATCH (p)-[:HAS_PHONE]->(ph:Phone)
            OPTIONAL MATCH (p)-[:LIVES_AT]->(a:Address)
            OPTIONAL MATCH (p)-[:HAS_BANK_ACCOUNT]->(b:BankAccount)
            OPTIONAL MATCH (p)-[:WORKED_AT]->(w:WorkHistory)
            OPTIONAL MATCH (p)-[:HAS_SOCIAL]->(s:SocialMedia)
            OPTIONAL MATCH (p)-[:REGISTERED]->(r:Registration)-[:FOR_PRODUCT]->(pr:Product)
            WITH p, 
                 collect(DISTINCT e.address) as emails,
                 collect(DISTINCT {number: ph.number, type: ph.type}) as phones,
                 a,
                 collect(DISTINCT {bank: b.bankName, account: b.accountNumber}) as banks,
                 collect(DISTINCT {company: w.company, role: w.role}) as work,
                 collect(DISTINCT {platform: s.platform, handle: s.handle}) as social,
                 collect(DISTINCT {id: r.id, product: pr.productType, status: r.status, date: r.registeredAt}) as registrations
            RETURN p, emails, phones, a, banks, work, social, registrations
        `, { id: req.params.id });

        if (result.records.length === 0) {
            return res.status(404).json({ error: 'Person not found' });
        }

        const r = result.records[0];
        const person = r.get('p').properties;
        const address = r.get('a')?.properties;

        res.json({
            ...person,
            birthDate: person.birthDate?.toString(),
            emails: r.get('emails'),
            phones: r.get('phones').filter(p => p.number),
            address: address,
            banks: r.get('banks').filter(b => b.bank),
            workHistory: r.get('work').filter(w => w.company),
            socialMedia: r.get('social').filter(s => s.platform),
            registrations: r.get('registrations').filter(reg => reg.id)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

app.get('/api/person/:id/graph', async (req, res) => {
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (p:Person {id: $id})
            OPTIONAL MATCH (p)-[r1]->(n1)
            OPTIONAL MATCH (n1)-[r2]->(n2)
            WITH p, collect(DISTINCT {source: p.id, target: id(n1), rel: type(r1), targetLabel: labels(n1)[0], targetName: coalesce(n1.address, n1.number, n1.platform, n1.productType, n1.company, '')}) as edges1,
                 collect(DISTINCT {source: id(n1), target: id(n2), rel: type(r2), targetLabel: labels(n2)[0], targetName: coalesce(n2.id, n2.productType, '')}) as edges2
            RETURN p, edges1, edges2
        `, { id: req.params.id });

        if (result.records.length === 0) {
            return res.status(404).json({ error: 'Person not found' });
        }

        const r = result.records[0];
        const person = r.get('p').properties;
        const edges1 = r.get('edges1');
        const edges2 = r.get('edges2');

        // Build nodes and edges for visualization
        const nodes = [{ id: person.id, label: person.name, type: 'Person' }];
        const edges = [];

        edges1.forEach(e => {
            if (e.target && e.targetLabel) {
                const nodeId = `${e.targetLabel}_${e.target}`;
                if (!nodes.find(n => n.id === nodeId)) {
                    nodes.push({ id: nodeId, label: e.targetName || e.targetLabel, type: e.targetLabel });
                }
                edges.push({ source: person.id, target: nodeId, label: e.rel });
            }
        });

        res.json({ nodes, edges });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

app.get('/api/ktp-analysis/:ktp', async (req, res) => {
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (p:Person {ktpNumber: $ktp})
            OPTIONAL MATCH (p)-[:HAS_EMAIL]->(e:Email)
            OPTIONAL MATCH (p)-[:REGISTERED]->(r:Registration)-[:FOR_PRODUCT]->(pr:Product)
            WITH p, collect(DISTINCT e.address) as emails, 
                 collect({product: pr.productType, id: r.id}) as registrations
            RETURN p.id as id, p.name as name, emails, registrations,
                   size(emails) as emailCount, size(registrations) as regCount
        `, { ktp: req.params.ktp });

        const analysis = result.records.map(r => ({
            id: r.get('id'),
            name: r.get('name'),
            emails: r.get('emails'),
            registrations: r.get('registrations'),
            emailCount: r.get('emailCount').toNumber(),
            regCount: r.get('regCount').toNumber()
        }));

        // Calculate violations
        const productCounts = {};
        analysis.forEach(a => {
            a.registrations.forEach(reg => {
                if (reg.product) {
                    productCounts[reg.product] = (productCounts[reg.product] || 0) + 1;
                }
            });
        });

        res.json({
            ktp: req.params.ktp,
            persons: analysis,
            productCounts,
            isSuspicious: analysis.length > 1 || Object.values(productCounts).some(c => c > 2)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Fraud Analytics Dashboard running at http://localhost:${PORT}`);
    console.log(`📊 Neo4j Browser at http://localhost:7474`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await driver.close();
    process.exit();
});
