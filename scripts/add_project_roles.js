const neo4j = require('neo4j-driver');

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'talentpool123';

// Project roles by hierarchy
const PROJECT_ROLES = {
    leadership: [
        'Project Sponsor',
        'Project Director',
        'Program Manager'
    ],
    management: [
        'Project Manager',
        'Scrum Master',
        'Product Owner',
        'Technical Lead',
        'Team Lead'
    ],
    technical: [
        'Solution Architect',
        'Senior Developer',
        'Backend Developer',
        'Frontend Developer',
        'Full Stack Developer',
        'DevOps Engineer',
        'Data Engineer',
        'QA Lead',
        'Security Specialist'
    ],
    specialist: [
        'Business Analyst',
        'System Analyst',
        'Data Analyst',
        'UX Designer',
        'UI Designer',
        'QA Engineer',
        'Documentation Specialist'
    ],
    support: [
        'Developer',
        'Tester',
        'Support Engineer',
        'Implementation Specialist',
        'Training Coordinator'
    ]
};

// Role assignment based on person's current role
function getProjectRole(personRole, teamIndex, teamSize) {
    const upperRole = (personRole || '').toUpperCase();

    // Leadership roles for executives
    if (upperRole.includes('CTO') || upperRole.includes('CIO') || upperRole.includes('CEO') || upperRole.includes('VP')) {
        return randomFromArray(PROJECT_ROLES.leadership);
    }

    // Management roles for managers/heads
    if (upperRole.includes('HEAD') || upperRole.includes('DIRECTOR') || upperRole.includes('MANAGER')) {
        if (teamIndex === 0) return 'Project Manager';
        return randomFromArray(PROJECT_ROLES.management);
    }

    // Architect roles
    if (upperRole.includes('ARCHITECT')) {
        return 'Solution Architect';
    }

    // Technical leads for first few technical people
    if (teamIndex < 3 && (upperRole.includes('SENIOR') || upperRole.includes('LEAD'))) {
        return randomFromArray(['Technical Lead', 'Team Lead', 'Senior Developer']);
    }

    // Analysts
    if (upperRole.includes('ANALYST')) {
        return randomFromArray(['Business Analyst', 'System Analyst', 'Data Analyst']);
    }

    // Engineers/Developers
    if (upperRole.includes('ENGINEER') || upperRole.includes('DEVELOPER')) {
        return randomFromArray(PROJECT_ROLES.technical.slice(2));
    }

    // Specialists
    if (upperRole.includes('SPECIALIST')) {
        return randomFromArray(PROJECT_ROLES.specialist);
    }

    // Default based on position in team
    if (teamIndex < 2) {
        return randomFromArray(PROJECT_ROLES.management);
    } else if (teamIndex < teamSize * 0.4) {
        return randomFromArray(PROJECT_ROLES.technical);
    } else if (teamIndex < teamSize * 0.7) {
        return randomFromArray(PROJECT_ROLES.specialist);
    } else {
        return randomFromArray(PROJECT_ROLES.support);
    }
}

function randomFromArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function addProjectRoles() {
    const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
    const session = driver.session();

    try {
        console.log('🚀 Fetching all projects and team members...');

        // Get all projects with their team members
        const result = await session.run(`
            MATCH (proj:Project)
            OPTIONAL MATCH (p:Person)-[r:WORKS_ON]->(proj)
            OPTIONAL MATCH (p)-[:WORKED_AT]->(e:Experience)
            WHERE e.end_date IS NULL
            WITH proj, p, r, collect(e.role)[0] as currentRole
            ORDER BY proj.id, p.id
            RETURN proj.id as projectId, proj.name as projectName, proj.scale as scale,
                   collect({personId: p.id, personName: p.name, currentRole: currentRole, relId: id(r)}) as team
        `);

        console.log(`✅ Found ${result.records.length} projects`);
        console.log('📝 Assigning project roles...');

        let updatedCount = 0;

        for (const record of result.records) {
            const projectId = record.get('projectId');
            const team = record.get('team').filter(t => t.personId);
            const teamSize = team.length;

            for (let i = 0; i < team.length; i++) {
                const member = team[i];
                const projectRole = getProjectRole(member.currentRole, i, teamSize);

                // Update the WORKS_ON relationship with the role
                await session.run(`
                    MATCH (p:Person {id: $personId})-[r:WORKS_ON]->(proj:Project {id: $projectId})
                    SET r.role = $role,
                        r.joined_date = $joinedDate,
                        r.contribution = $contribution
                `, {
                    personId: member.personId,
                    projectId: projectId,
                    role: projectRole,
                    joinedDate: `2024-${String(randomInt(1, 6)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
                    contribution: randomFromArray(['Core', 'Active', 'Advisory', 'Part-time'])
                });

                updatedCount++;
            }
        }

        console.log(`✅ Updated ${updatedCount} project assignments with roles`);

        // Verify
        console.log('\n📊 Verification:');

        const verify = await session.run(`
            MATCH (p:Person)-[r:WORKS_ON]->(proj:Project)
            RETURN r.role as role, count(*) as count
            ORDER BY count DESC
            LIMIT 15
        `);

        console.log('   Top 15 Project Roles:');
        for (const r of verify.records) {
            console.log(`     - ${r.get('role')}: ${r.get('count').low} assignments`);
        }

        // Sample project
        const sample = await session.run(`
            MATCH (p:Person)-[r:WORKS_ON]->(proj:Project)
            WHERE proj.scale = 'large'
            WITH proj, p, r
            ORDER BY 
                CASE 
                    WHEN r.role CONTAINS 'Director' OR r.role CONTAINS 'Sponsor' THEN 1
                    WHEN r.role CONTAINS 'Manager' OR r.role CONTAINS 'Lead' THEN 2
                    WHEN r.role CONTAINS 'Architect' THEN 3
                    ELSE 4
                END
            LIMIT 1
            WITH proj
            MATCH (p2:Person)-[r2:WORKS_ON]->(proj)
            RETURN proj.name as project, p2.name as person, r2.role as role
            LIMIT 10
        `);

        console.log('\n   Sample Large Project Team:');
        console.log(`   Project: ${sample.records[0]?.get('project')}`);
        for (const r of sample.records) {
            console.log(`     - ${r.get('person')}: ${r.get('role')}`);
        }

        console.log('\n✨ Project roles assignment complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await session.close();
        await driver.close();
    }
}

addProjectRoles();
