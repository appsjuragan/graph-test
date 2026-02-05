const neo4j = require('neo4j-driver');

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'talentpool123';

// Indonesian companies for shared work history
const COMPANIES = [
    'Bank Central Asia', 'Bank Mandiri', 'Bank BRI', 'Bank BNI',
    'Telkom Indonesia', 'Telkomsel', 'Indosat Ooredoo', 'XL Axiata',
    'Pertamina', 'PLN', 'Garuda Indonesia', 'Lion Air',
    'Astra International', 'Sinar Mas', 'Salim Group', 'Lippo Group',
    'Gojek', 'Tokopedia', 'Bukalapak', 'Shopee Indonesia',
    'Traveloka', 'OVO', 'Dana', 'LinkAja',
    'Unilever Indonesia', 'Nestle Indonesia', 'Coca-Cola Amatil',
    'Samsung Indonesia', 'Microsoft Indonesia', 'Google Indonesia',
    'Accenture Indonesia', 'Deloitte Indonesia', 'PwC Indonesia', 'KPMG Indonesia',
    'McKinsey Jakarta', 'BCG Jakarta', 'Bain & Company Jakarta'
];

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFromArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

async function generateSocialNetwork() {
    const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
    const session = driver.session();

    try {
        console.log('🗑️  Clearing existing social connections...');
        await session.run(`MATCH ()-[r:FOLLOWS]->() DELETE r`);

        console.log('🏢 Augmenting shared work history...');

        // Get all people and their experiences
        const peopleResult = await session.run(`
            MATCH (p:Person)
            OPTIONAL MATCH (p)-[:WORKED_AT]->(e:Experience)
            RETURN p.id as id, p.name as name, 
                   collect({company: e.company, start: e.start_date, end: e.end_date, role: e.role}) as experiences
        `);

        const people = peopleResult.records.map(r => ({
            id: r.get('id'),
            name: r.get('name'),
            experiences: r.get('experiences').filter(e => e.company)
        }));

        console.log(`✅ Found ${people.length} people`);

        // Create company cohorts - people who worked at same companies
        const companyCohorts = new Map();

        for (const person of people) {
            for (const exp of person.experiences) {
                if (!companyCohorts.has(exp.company)) {
                    companyCohorts.set(exp.company, []);
                }
                companyCohorts.get(exp.company).push({
                    personId: person.id,
                    startYear: exp.start ? parseInt(exp.start.toString().substring(0, 4)) : 2020,
                    endYear: exp.end ? parseInt(exp.end.toString().substring(0, 4)) : 2024
                });
            }
        }

        // Add some people to popular companies to create more connections
        console.log('🔗 Creating shared company experiences...');

        const popularCompanies = shuffleArray(COMPANIES).slice(0, 15);
        let sharedExpCount = 0;

        for (const company of popularCompanies) {
            // Select 5-15 random people to have worked at this company
            const cohortSize = randomInt(5, 15);
            const cohort = shuffleArray([...people]).slice(0, cohortSize);

            // Create overlapping time periods
            const baseYear = randomInt(2015, 2020);

            for (const person of cohort) {
                const startYear = baseYear + randomInt(0, 2);
                const endYear = startYear + randomInt(1, 4);
                const roles = ['Staff', 'Senior Staff', 'Specialist', 'Analyst', 'Engineer', 'Manager'];

                // Check if they already have this company
                const existing = person.experiences.find(e => e.company === company);
                if (!existing) {
                    await session.run(`
                        MATCH (p:Person {id: $personId})
                        CREATE (e:Experience {
                            id: $expId,
                            company: $company,
                            role: $role,
                            start_date: $startDate,
                            end_date: $endDate,
                            description: $description
                        })
                        CREATE (p)-[:WORKED_AT]->(e)
                    `, {
                        personId: person.id,
                        expId: `exp_shared_${person.id}_${company.replace(/\s+/g, '_').toLowerCase()}`,
                        company: company,
                        role: randomFromArray(roles),
                        startDate: `${startYear}-01-01`,
                        endDate: endYear < 2024 ? `${endYear}-12-31` : null,
                        description: `Contributed to various initiatives at ${company}`
                    });
                    sharedExpCount++;
                }
            }
        }

        console.log(`✅ Created ${sharedExpCount} shared work experiences`);

        // Now create social connections
        console.log('👥 Generating social network connections...');

        // Strategy 1: Colleagues (same company, overlapping time)
        console.log('   - Creating colleague connections...');
        let colleagueConnections = 0;

        const updatedPeopleResult = await session.run(`
            MATCH (p:Person)
            OPTIONAL MATCH (p)-[:WORKED_AT]->(e:Experience)
            RETURN p.id as id, collect(DISTINCT e.company) as companies
        `);

        const peopleCompanies = new Map();
        for (const r of updatedPeopleResult.records) {
            peopleCompanies.set(r.get('id'), r.get('companies').filter(c => c));
        }

        // Connect people who share companies
        const companyConnections = [];
        const allPeopleIds = [...peopleCompanies.keys()];

        for (let i = 0; i < allPeopleIds.length; i++) {
            const p1 = allPeopleIds[i];
            const companies1 = peopleCompanies.get(p1);

            for (let j = i + 1; j < allPeopleIds.length; j++) {
                const p2 = allPeopleIds[j];
                const companies2 = peopleCompanies.get(p2);

                // Check for shared companies
                const shared = companies1.filter(c => companies2.includes(c));
                if (shared.length > 0 && Math.random() < 0.7) { // 70% chance to connect if shared company
                    companyConnections.push({ from: p1, to: p2 });
                    if (Math.random() < 0.6) { // 60% chance of mutual follow
                        companyConnections.push({ from: p2, to: p1 });
                    }
                }
            }
        }

        // Batch create colleague connections
        if (companyConnections.length > 0) {
            await session.run(`
                UNWIND $connections as conn
                MATCH (p1:Person {id: conn.from})
                MATCH (p2:Person {id: conn.to})
                MERGE (p1)-[:FOLLOWS]->(p2)
            `, { connections: companyConnections.slice(0, 2000) }); // Limit to prevent timeout
            colleagueConnections = Math.min(companyConnections.length, 2000);
        }

        console.log(`   ✅ Created ${colleagueConnections} colleague connections`);

        // Strategy 2: Project teammates
        console.log('   - Creating project teammate connections...');

        const projectConnections = await session.run(`
            MATCH (p1:Person)-[:WORKS_ON]->(proj:Project)<-[:WORKS_ON]-(p2:Person)
            WHERE p1.id < p2.id
            WITH p1, p2, count(proj) as sharedProjects
            WHERE sharedProjects >= 1 AND rand() < 0.8
            MERGE (p1)-[:FOLLOWS]->(p2)
            WITH p1, p2
            WHERE rand() < 0.5
            MERGE (p2)-[:FOLLOWS]->(p1)
            RETURN count(*) as created
        `);

        const projectConnsCreated = projectConnections.records[0]?.get('created')?.low || 0;
        console.log(`   ✅ Created project teammate connections`);

        // Strategy 3: Similar skills (industry networking)
        console.log('   - Creating skill-based network connections...');

        await session.run(`
            MATCH (p1:Person)-[:HAS_SKILL]->(s:Skill)<-[:HAS_SKILL]-(p2:Person)
            WHERE p1.id < p2.id
            WITH p1, p2, count(s) as sharedSkills
            WHERE sharedSkills >= 3 AND rand() < 0.4
            MERGE (p1)-[:FOLLOWS]->(p2)
        `);

        console.log(`   ✅ Created skill-based connections`);

        // Strategy 4: Random industry connections (networking events, conferences)
        console.log('   - Creating random network connections...');

        const randomConnections = [];
        const shuffledPeople = shuffleArray(allPeopleIds);

        for (let i = 0; i < shuffledPeople.length; i++) {
            // Each person randomly connects to 3-8 other people
            const numConnections = randomInt(3, 8);
            const targets = shuffleArray(shuffledPeople.filter(p => p !== shuffledPeople[i])).slice(0, numConnections);

            for (const target of targets) {
                randomConnections.push({ from: shuffledPeople[i], to: target });
            }
        }

        // Batch create random connections
        await session.run(`
            UNWIND $connections as conn
            MATCH (p1:Person {id: conn.from})
            MATCH (p2:Person {id: conn.to})
            MERGE (p1)-[:FOLLOWS]->(p2)
        `, { connections: randomConnections.slice(0, 3000) });

        console.log(`   ✅ Created random network connections`);

        // Verify results
        console.log('\n📊 Verification:');

        const stats = await session.run(`
            MATCH (p:Person)
            OPTIONAL MATCH (p)-[f:FOLLOWS]->()
            WITH p, count(f) as following
            OPTIONAL MATCH (p)<-[f2:FOLLOWS]-()
            WITH p, following, count(f2) as followers
            RETURN 
                count(p) as totalPeople,
                sum(following) as totalConnections,
                avg(following) as avgFollowing,
                avg(followers) as avgFollowers,
                min(following) as minFollowing,
                max(following) as maxFollowing
        `);

        const stat = stats.records[0];
        console.log(`   Total People: ${stat.get('totalPeople').low}`);
        console.log(`   Total Connections: ${stat.get('totalConnections').low}`);
        console.log(`   Avg Following: ${stat.get('avgFollowing').toFixed(1)}`);
        console.log(`   Avg Followers: ${stat.get('avgFollowers').toFixed(1)}`);
        console.log(`   Min Following: ${stat.get('minFollowing').low}`);
        console.log(`   Max Following: ${stat.get('maxFollowing').low}`);

        // Shared work history stats
        const workStats = await session.run(`
            MATCH (p1:Person)-[:WORKED_AT]->(e1:Experience)
            MATCH (p2:Person)-[:WORKED_AT]->(e2:Experience)
            WHERE p1.id < p2.id AND e1.company = e2.company
            WITH p1, p2, count(e1) as sharedCompanies
            WHERE sharedCompanies > 0
            RETURN count(*) as pairsWithSharedHistory
        `);

        console.log(`   Pairs with shared work history: ${workStats.records[0].get('pairsWithSharedHistory').low}`);

        console.log('\n✨ Social network generation complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await session.close();
        await driver.close();
    }
}

generateSocialNetwork();
