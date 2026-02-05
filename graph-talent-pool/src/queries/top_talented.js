const neo4j = require('neo4j-driver');

async function run() {
    const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'talentpool123'));
    const session = driver.session();

    console.log('📊 Top 5 Most Connected & Talented People');
    console.log('(Scored by: total_connections + certificates*2 + working_years)');
    console.log('─'.repeat(70));

    const result = await session.run(`
    MATCH (p:Person)
    OPTIONAL MATCH (p)-[:HAS_EDUCATION]->(edu:Education)
    OPTIONAL MATCH (p)-[:HAS_CERTIFICATE]->(cert:Certificate)
    OPTIONAL MATCH (p)-[:COMPLETED_TRAINING]->(tr:Training)
    OPTIONAL MATCH (p)-[:WORKED_AT]->(exp:Experience)
    OPTIONAL MATCH (p)-[:FOLLOWS]->(sm:SocialMedia)
    OPTIONAL MATCH (p)-[:HAS_SKILL]->(sk:Skill)
    WITH p,
         count(DISTINCT edu) + count(DISTINCT cert) + count(DISTINCT tr) + 
         count(DISTINCT exp) + count(DISTINCT sm) + count(DISTINCT sk) as total_connections,
         count(DISTINCT cert) as cert_count,
         count(DISTINCT sk) as skill_count,
         p.working_years as years
    WITH p, total_connections, cert_count, skill_count, years,
         (total_connections + cert_count * 2 + years) as talent_score
    RETURN p.name as name, p.email as email,
           total_connections, cert_count as certificates, 
           skill_count as skills, years as working_years,
           talent_score
    ORDER BY talent_score DESC
    LIMIT 5
  `);

    result.records.forEach((r, i) => {
        console.log(`\n${i + 1}. ${r.get('name')}`);
        console.log(`   Email: ${r.get('email')}`);
        console.log(`   Connections: ${r.get('total_connections')} | Certs: ${r.get('certificates')} | Skills: ${r.get('skills')} | Years: ${r.get('working_years')}`);
        console.log(`   Talent Score: ${r.get('talent_score')}`);
    });

    await session.close();
    await driver.close();
}

run();
