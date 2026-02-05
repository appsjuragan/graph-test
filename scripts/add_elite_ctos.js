const neo4j = require('neo4j-driver');

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'talentpool123';

const ELITE_CTOS = [
    {
        name: 'Bambang Wijaya',
        email: 'bambang.wijaya.cto@tech-global.com',
        years: 28,
        skills: ['Quantum Computing', 'Distributed Systems', 'Generative AI', 'Zero Trust Security', 'Leadership', 'Multi-cloud Strategy'],
        company: 'Global Tech Nexus'
    },
    {
        name: 'Siti Kusuma',
        email: 'siti.kusuma@innovation-labs.id',
        years: 25,
        skills: ['LLMOps', 'Data Mesh', 'Blockchain Architecture', 'Strategic Planning', 'System Design', 'MLOps'],
        company: 'Innovation Labs Indonesia'
    },
    {
        name: 'Ahmad Sembiring',
        email: 'ahmad.sembiring@fintech-elite.com',
        years: 22,
        skills: ['High-Frequency Trading', 'Consensus Algorithms', 'Rust', 'Tech Strategy', 'Kubernetes', 'Cybersecurity'],
        company: 'Nexus Financial Systems'
    },
    {
        name: 'Dewi Lestari',
        email: 'dewi.lestari@earth-save.tech',
        years: 24,
        skills: ['ESG Technology', 'Cloud Native', 'Microservices', 'Enterprise Architecture', 'AI Ethics', 'Executive Management'],
        company: 'GreenEarth Solutions'
    },
    {
        name: 'Reza Pratama',
        email: 'reza.pratama@future-systems.io',
        years: 26,
        skills: ['Web3', 'Edge Computing', 'Next-gen Networking', 'Business Strategy', 'Digital Transformation', 'Problem Solving'],
        company: 'Future Systems Inc'
    }
];

async function addEliteCtos() {
    const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
    const session = driver.session();

    try {
        console.log('🚀 Adding 5 Elite CTOs...');

        for (const cto of ELITE_CTOS) {
            const id = 'elite_cto_' + Math.random().toString(36).substr(2, 5);

            // Create Person and Experience
            await session.run(`
                CREATE (p:Person {
                    id: $id,
                    name: $name,
                    email: $email,
                    working_years: $years,
                    phone: '+62 811 000 000',
                    birth_date: date('1975-01-01')
                })
                CREATE (e:Experience {
                    id: $expId,
                    company: $company,
                    role: 'CTO',
                    start_date: date('2018-01-01'),
                    description: 'Directing global technology strategy and sophisticated engineering teams.'
                })
                CREATE (p)-[:WORKED_AT]->(e)
            `, {
                id: id,
                name: cto.name,
                email: cto.email,
                years: cto.years,
                expId: 'exp_' + id,
                company: cto.company
            });

            // Create/Link Skills
            for (const skillName of cto.skills) {
                await session.run(`
                    MATCH (p:Person {id: $id})
                    MERGE (s:Skill {name: $skillName})
                    ON CREATE SET s.category = 'Elite'
                    CREATE (p)-[:HAS_SKILL]->(s)
                `, { id: id, skillName: skillName });
            }
            console.log(`✅ Added: ${cto.name}`);
        }

        console.log('\n✨ Elite CTOs successfully added to the Talent Pool.');
    } catch (error) {
        console.error('❌ Error adding CTOs:', error.message);
    } finally {
        await session.close();
        await driver.close();
    }
}

addEliteCtos();
