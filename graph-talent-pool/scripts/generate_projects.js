const neo4j = require('neo4j-driver');

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'talentpool123';

// Project templates by type
const PROJECT_TEMPLATES = {
    governance: [
        { name: 'ISO 27001 Compliance', scale: 'large', requiredSkills: ['IT Governance', 'Risk Management', 'Compliance', 'Security'] },
        { name: 'Risk Assessment Framework', scale: 'medium', requiredSkills: ['Risk Management', 'Audit', 'Compliance'] },
        { name: 'COBIT Implementation', scale: 'large', requiredSkills: ['IT Governance', 'COBIT', 'Strategic Planning'] },
        { name: 'Data Privacy Initiative', scale: 'medium', requiredSkills: ['Compliance', 'Security', 'Risk Management'] },
        { name: 'IT Audit Program', scale: 'small', requiredSkills: ['Audit', 'Compliance', 'IT Governance'] },
        { name: 'Business Continuity Plan', scale: 'medium', requiredSkills: ['Risk Management', 'Strategic Planning', 'Leadership'] }
    ],
    manufacture: [
        { name: 'Supply Chain Optimization', scale: 'large', requiredSkills: ['Operations Management', 'Data Analysis', 'Python'] },
        { name: 'Factory Automation System', scale: 'large', requiredSkills: ['System Design', 'IoT', 'Java', 'Python'] },
        { name: 'Quality Control Dashboard', scale: 'medium', requiredSkills: ['Data Visualization', 'Tableau', 'SQL'] },
        { name: 'Inventory Management System', scale: 'medium', requiredSkills: ['Database', 'Java', 'React'] },
        { name: 'Production Planning Tool', scale: 'small', requiredSkills: ['Data Analysis', 'Excel', 'Python'] },
        { name: 'Warehouse Management System', scale: 'medium', requiredSkills: ['System Design', 'Database', 'Java'] }
    ],
    digital: [
        { name: 'Cloud Migration Initiative', scale: 'large', requiredSkills: ['AWS', 'Azure', 'Cloud Architecture', 'DevOps'] },
        { name: 'Mobile App Development', scale: 'medium', requiredSkills: ['React', 'Node.js', 'Mobile Development'] },
        { name: 'AI-Powered Chatbot', scale: 'medium', requiredSkills: ['Machine Learning', 'Python', 'NLP'] },
        { name: 'E-commerce Platform', scale: 'large', requiredSkills: ['Microservices', 'React', 'Java', 'PostgreSQL'] },
        { name: 'Data Lake Implementation', scale: 'large', requiredSkills: ['Big Data', 'AWS', 'Python', 'Data Engineering'] },
        { name: 'Digital Transformation Roadmap', scale: 'large', requiredSkills: ['Digital Transformation', 'Strategic Planning', 'Leadership'] },
        { name: 'Web Portal Redesign', scale: 'small', requiredSkills: ['React', 'UX Design', 'JavaScript'] },
        { name: 'API Gateway Platform', scale: 'medium', requiredSkills: ['Microservices', 'Node.js', 'System Design'] }
    ],
    socials: [
        { name: 'Community Engagement Platform', scale: 'medium', requiredSkills: ['Social Media', 'Marketing', 'Communication'] },
        { name: 'Brand Awareness Campaign', scale: 'medium', requiredSkills: ['Digital Marketing', 'Brand Strategy', 'Analytics'] },
        { name: 'Customer Feedback System', scale: 'small', requiredSkills: ['User Research', 'Data Analysis', 'Communication'] },
        { name: 'CSR Initiative Dashboard', scale: 'small', requiredSkills: ['Reporting', 'Communication', 'Data Visualization'] },
        { name: 'Social Media Analytics', scale: 'medium', requiredSkills: ['Analytics', 'Marketing', 'Data Analysis'] },
        { name: 'Employee Engagement Portal', scale: 'medium', requiredSkills: ['Communication', 'UX Design', 'React'] }
    ]
};

const TEAM_SIZE_BY_SCALE = {
    small: { min: 3, max: 6 },
    medium: { min: 6, max: 12 },
    large: { min: 12, max: 20 }
};

const MANAGEMENT_LEVELS = {
    enterprise: ['CTO', 'CIO', 'CEO', 'COO', 'Division Head', 'VP'],
    division: ['Dept Head', 'Department Head', 'Software Architect', 'IT Gov', 'Manager'],
    department: ['Specialist', 'Analyst', 'Engineer', 'Developer', 'Coordinator']
};

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

function matchesLevel(role, level) {
    if (!role) return false;
    const upperRole = role.toUpperCase();
    return MANAGEMENT_LEVELS[level].some(r => upperRole.includes(r.toUpperCase()));
}

function hasRelevantSkills(personSkills, requiredSkills) {
    if (!requiredSkills || requiredSkills.length === 0) return true;
    if (!personSkills || personSkills.length === 0) return false;

    const personSkillNames = personSkills.map(s => s.toLowerCase());
    const matchCount = requiredSkills.filter(req =>
        personSkillNames.some(ps => ps.includes(req.toLowerCase()) || req.toLowerCase().includes(ps))
    ).length;

    // More lenient matching - at least 1 skill match or general tech skills
    return matchCount >= 1 || personSkillNames.some(s =>
        ['leadership', 'management', 'strategic', 'communication', 'team'].some(gen => s.includes(gen))
    );
}

async function generateProjects() {
    const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
    const session = driver.session();

    try {
        console.log('�️  Clearing existing projects...');
        await session.run(`
            MATCH (p:Person)-[r:WORKS_ON]->(proj:Project)
            DELETE r
        `);
        await session.run(`
            MATCH (proj:Project)
            DELETE proj
        `);

        console.log('�🚀 Fetching all candidates...');

        // Fetch all people with their skills and roles
        const result = await session.run(`
            MATCH (p:Person)
            OPTIONAL MATCH (p)-[:HAS_SKILL]->(s:Skill)
            OPTIONAL MATCH (p)-[:WORKED_AT]->(e:Experience)
            WHERE e.end_date IS NULL
            WITH p, collect(DISTINCT s.name) as skills, collect(DISTINCT e.role) as roles
            RETURN p.id as id, p.name as name, skills, roles
        `);

        const people = result.records.map(r => ({
            id: r.get('id'),
            name: r.get('name'),
            skills: r.get('skills'),
            currentRole: r.get('roles')[0] || 'Staff'
        }));

        console.log(`✅ Found ${people.length} candidates`);
        console.log('📋 Generating projects...');

        // Generate MORE projects to ensure coverage
        const projects = [];
        let projectId = 1;

        // Create multiple instances of each template
        for (const [type, templates] of Object.entries(PROJECT_TEMPLATES)) {
            for (const template of templates) {
                // Create 2-3 instances of each project type
                const instances = type === 'digital' ? 3 : 2;
                for (let i = 0; i < instances; i++) {
                    const teamSize = TEAM_SIZE_BY_SCALE[template.scale];
                    const targetSize = randomInt(teamSize.min, teamSize.max);

                    const projectName = instances > 1 ? `${template.name} ${String.fromCharCode(65 + i)}` : template.name;

                    projects.push({
                        id: `proj_${String(projectId++).padStart(4, '0')}`,
                        name: projectName,
                        type: type,
                        scale: template.scale,
                        requiredSkills: template.requiredSkills,
                        targetSize: targetSize,
                        team: []
                    });
                }
            }
        }

        console.log(`✅ Created ${projects.length} project templates`);
        console.log('👥 Assigning team members...');

        // Track assignments to ensure everyone gets at least 2
        const assignmentCount = new Map(people.map(p => [p.id, 0]));
        const shuffledPeople = shuffleArray([...people]);

        // First pass: Fill projects with skill-matched people
        for (const project of projects) {
            const candidates = shuffleArray([...people]);

            // Categorize by management level
            const enterprise = candidates.filter(p => matchesLevel(p.currentRole, 'enterprise'));
            const division = candidates.filter(p => matchesLevel(p.currentRole, 'division'));
            const department = candidates.filter(p => matchesLevel(p.currentRole, 'department'));

            // Add leadership (1-2 people)
            const numLeaders = project.scale === 'large' ? 2 : 1;
            const leaders = [...enterprise, ...division]
                .filter(p => hasRelevantSkills(p.skills, project.requiredSkills))
                .slice(0, numLeaders);

            project.team.push(...leaders.map(l => l.id));
            leaders.forEach(l => assignmentCount.set(l.id, assignmentCount.get(l.id) + 1));

            // Fill with specialists and staff
            const remaining = project.targetSize - project.team.length;
            const staff = department
                .filter(p => !project.team.includes(p.id))
                .filter(p => hasRelevantSkills(p.skills, project.requiredSkills))
                .slice(0, remaining);

            project.team.push(...staff.map(s => s.id));
            staff.forEach(s => assignmentCount.set(s.id, assignmentCount.get(s.id) + 1));

            // If still not enough, add anyone with general skills
            if (project.team.length < project.targetSize) {
                const anyRemaining = project.targetSize - project.team.length;
                const anyone = candidates
                    .filter(p => !project.team.includes(p.id))
                    .slice(0, anyRemaining);

                project.team.push(...anyone.map(a => a.id));
                anyone.forEach(a => assignmentCount.set(a.id, assignmentCount.get(a.id) + 1));
            }
        }

        // Second pass: Ensure EVERYONE has at least 2 projects
        console.log('🔄 Balancing assignments to ensure minimum 2 projects per person...');

        for (const person of people) {
            const currentCount = assignmentCount.get(person.id);
            if (currentCount < 2) {
                const needed = 2 - currentCount;

                // Find projects this person isn't on yet
                const availableProjects = shuffleArray(projects.filter(proj => !proj.team.includes(person.id)));

                for (let i = 0; i < Math.min(needed, availableProjects.length); i++) {
                    const proj = availableProjects[i];
                    proj.team.push(person.id);
                    assignmentCount.set(person.id, assignmentCount.get(person.id) + 1);
                }
            }
        }

        console.log('💾 Saving projects to database...');

        // Create Project nodes and relationships
        for (const project of projects) {
            // Create project node
            await session.run(`
                CREATE (proj:Project {
                    id: $id,
                    name: $name,
                    type: $type,
                    scale: $scale,
                    team_size: $teamSize,
                    start_date: date('2024-01-01'),
                    status: 'Active'
                })
            `, {
                id: project.id,
                name: project.name,
                type: project.type,
                scale: project.scale,
                teamSize: project.team.length
            });

            // Assign team members
            if (project.team.length > 0) {
                await session.run(`
                    UNWIND $teamIds as personId
                    MATCH (p:Person {id: personId})
                    MATCH (proj:Project {id: $projectId})
                    CREATE (p)-[:WORKS_ON]->(proj)
                `, {
                    teamIds: project.team,
                    projectId: project.id
                });
            }
        }

        // Verify
        console.log('\n📊 Verification:');
        const stats = await session.run(`
            MATCH (proj:Project)
            WITH count(proj) as totalProjects
            MATCH (p:Person)
            OPTIONAL MATCH (p)-[:WORKS_ON]->(proj2:Project)
            WITH totalProjects, p, count(proj2) as projectCount
            WHERE projectCount > 0
            RETURN totalProjects, 
                   count(p) as peopleAssigned,
                   min(projectCount) as minProjects,
                   max(projectCount) as maxProjects,
                   avg(projectCount) as avgProjects
        `);

        if (stats.records.length > 0) {
            const stat = stats.records[0];
            console.log(`   Total Projects: ${stat.get('totalProjects').low}`);
            console.log(`   People Assigned: ${stat.get('peopleAssigned').low}`);
            console.log(`   Min Projects per Person: ${stat.get('minProjects').low}`);
            console.log(`   Max Projects per Person: ${stat.get('maxProjects').low}`);
            console.log(`   Avg Projects per Person: ${stat.get('avgProjects').toFixed(2)}`);
        }

        // Check for people with 0 or 1 project
        const underAssignedCheck = await session.run(`
            MATCH (p:Person)
            OPTIONAL MATCH (p)-[:WORKS_ON]->(proj:Project)
            WITH p, count(proj) as projectCount
            WHERE projectCount < 2
            RETURN count(p) as underAssigned, collect(p.name)[0..5] as examples
        `);

        if (underAssignedCheck.records.length > 0) {
            const underCount = underAssignedCheck.records[0].get('underAssigned').low;
            if (underCount > 0) {
                console.log(`\n⚠️  Warning: ${underCount} people have less than 2 projects`);
                console.log(`   Examples: ${underAssignedCheck.records[0].get('examples').join(', ')}`);
            } else {
                console.log(`\n✅ All people have at least 2 projects!`);
            }
        }

        console.log('\n✨ Project generation complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await session.close();
        await driver.close();
    }
}

generateProjects();
