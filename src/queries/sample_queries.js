const neo4j = require('neo4j-driver');

// Neo4j connection configuration
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'talentpool123';

async function runQueries() {
    console.log('🔌 Connecting to Neo4j...');

    const driver = neo4j.driver(
        NEO4J_URI,
        neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
    );

    try {
        await driver.verifyConnectivity();
        console.log('✅ Connected to Neo4j\n');

        const session = driver.session();

        // Query 1: People with most certificates
        console.log('📊 Top 10 People with Most Certificates:');
        console.log('─'.repeat(60));
        const certQuery = await session.run(`
      MATCH (p:Person)-[:HAS_CERTIFICATE]->(c:Certificate)
      RETURN p.name as name, p.working_years as years, count(c) as cert_count
      ORDER BY cert_count DESC
      LIMIT 10
    `);
        certQuery.records.forEach((r, i) => {
            console.log(`${i + 1}. ${r.get('name')} - ${r.get('cert_count')} certs (${r.get('years')} years exp)`);
        });

        // Query 2: Most common skills
        console.log('\n📊 Top 15 Most Common Skills:');
        console.log('─'.repeat(60));
        const skillQuery = await session.run(`
      MATCH (p:Person)-[:HAS_SKILL]->(s:Skill)
      RETURN s.name as skill, s.category as category, count(p) as people_count
      ORDER BY people_count DESC
      LIMIT 15
    `);
        skillQuery.records.forEach((r, i) => {
            console.log(`${i + 1}. ${r.get('skill')} (${r.get('category')}) - ${r.get('people_count')} people`);
        });

        // Query 3: Companies with most employees (from experience)
        console.log('\n📊 Top 10 Companies by Employee Count:');
        console.log('─'.repeat(60));
        const companyQuery = await session.run(`
      MATCH (p:Person)-[:WORKED_AT]->(e:Experience)
      RETURN e.company as company, count(DISTINCT p) as employee_count
      ORDER BY employee_count DESC
      LIMIT 10
    `);
        companyQuery.records.forEach((r, i) => {
            console.log(`${i + 1}. ${r.get('company')} - ${r.get('employee_count')} employees`);
        });

        // Query 4: Average stats
        console.log('\n📊 Average Statistics Per Person:');
        console.log('─'.repeat(60));
        const avgQuery = await session.run(`
      MATCH (p:Person)
      OPTIONAL MATCH (p)-[:HAS_EDUCATION]->(edu:Education)
      OPTIONAL MATCH (p)-[:HAS_CERTIFICATE]->(cert:Certificate)
      OPTIONAL MATCH (p)-[:COMPLETED_TRAINING]->(tr:Training)
      OPTIONAL MATCH (p)-[:WORKED_AT]->(exp:Experience)
      OPTIONAL MATCH (p)-[:HAS_SKILL]->(s:Skill)
      WITH p, 
           count(DISTINCT edu) as edu_count,
           count(DISTINCT cert) as cert_count,
           count(DISTINCT tr) as tr_count,
           count(DISTINCT exp) as exp_count,
           count(DISTINCT s) as skill_count
      RETURN 
        round(avg(edu_count) * 10) / 10 as avg_education,
        round(avg(cert_count) * 10) / 10 as avg_certificates,
        round(avg(tr_count) * 10) / 10 as avg_trainings,
        round(avg(exp_count) * 10) / 10 as avg_experiences,
        round(avg(skill_count) * 10) / 10 as avg_skills,
        round(avg(p.working_years) * 10) / 10 as avg_working_years
    `);
        const avg = avgQuery.records[0];
        console.log(`   Avg Education: ${avg.get('avg_education')}`);
        console.log(`   Avg Certificates: ${avg.get('avg_certificates')}`);
        console.log(`   Avg Trainings: ${avg.get('avg_trainings')}`);
        console.log(`   Avg Experiences: ${avg.get('avg_experiences')}`);
        console.log(`   Avg Skills: ${avg.get('avg_skills')}`);
        console.log(`   Avg Working Years: ${avg.get('avg_working_years')}`);

        // Query 5: Find people with specific skill combination
        console.log('\n📊 People with Python AND Machine Learning skills:');
        console.log('─'.repeat(60));
        const skillComboQuery = await session.run(`
      MATCH (p:Person)-[:HAS_SKILL]->(s1:Skill {name: 'Python'})
      MATCH (p)-[:HAS_SKILL]->(s2:Skill {name: 'Machine Learning'})
      RETURN p.name as name, p.email as email, p.working_years as years
      LIMIT 10
    `);
        if (skillComboQuery.records.length > 0) {
            skillComboQuery.records.forEach((r, i) => {
                console.log(`${i + 1}. ${r.get('name')} (${r.get('years')} years) - ${r.get('email')}`);
            });
        } else {
            console.log('   No people found with this skill combination');
        }

        // Query 6: Social media platform popularity
        console.log('\n📊 Most Followed Social Media Platforms:');
        console.log('─'.repeat(60));
        const socialQuery = await session.run(`
      MATCH (p:Person)-[:FOLLOWS]->(sm:SocialMedia)
      RETURN sm.platform as platform, count(p) as follower_count
      ORDER BY follower_count DESC
      LIMIT 10
    `);
        socialQuery.records.forEach((r, i) => {
            console.log(`${i + 1}. ${r.get('platform')} - ${r.get('follower_count')} people follow`);
        });

        await session.close();
        console.log('\n✅ All queries completed!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await driver.close();
    }
}

runQueries();
