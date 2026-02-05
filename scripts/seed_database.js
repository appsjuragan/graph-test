const neo4j = require('neo4j-driver');
const fs = require('fs');
const path = require('path');

// Neo4j connection configuration
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'talentpool123';

async function seedDatabase() {
    console.log('🔌 Connecting to Neo4j...');

    const driver = neo4j.driver(
        NEO4J_URI,
        neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
    );

    try {
        // Verify connection
        await driver.verifyConnectivity();
        console.log('✅ Connected to Neo4j');

        const session = driver.session();

        // Load data
        const dataPath = path.join(__dirname, '..', 'data', 'people.json');
        if (!fs.existsSync(dataPath)) {
            console.error('❌ Data file not found. Run "npm run generate" first.');
            process.exit(1);
        }

        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        console.log(`📊 Loaded ${data.total_people} people from JSON`);

        // Create constraints
        console.log('\n📐 Creating constraints and indexes...');
        const constraints = [
            'CREATE CONSTRAINT person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE',
            'CREATE CONSTRAINT education_id IF NOT EXISTS FOR (e:Education) REQUIRE e.id IS UNIQUE',
            'CREATE CONSTRAINT certificate_id IF NOT EXISTS FOR (c:Certificate) REQUIRE c.id IS UNIQUE',
            'CREATE CONSTRAINT training_id IF NOT EXISTS FOR (t:Training) REQUIRE t.id IS UNIQUE',
            'CREATE CONSTRAINT experience_id IF NOT EXISTS FOR (e:Experience) REQUIRE e.id IS UNIQUE',
            'CREATE CONSTRAINT social_id IF NOT EXISTS FOR (s:SocialMedia) REQUIRE s.id IS UNIQUE',
            'CREATE CONSTRAINT skill_name IF NOT EXISTS FOR (s:Skill) REQUIRE s.name IS UNIQUE',
            'CREATE INDEX person_name IF NOT EXISTS FOR (p:Person) ON (p.name)',
            'CREATE INDEX person_working_years IF NOT EXISTS FOR (p:Person) ON (p.working_years)',
            'CREATE INDEX experience_company IF NOT EXISTS FOR (e:Experience) ON (e.company)',
            'CREATE INDEX skill_category IF NOT EXISTS FOR (s:Skill) ON (s.category)'
        ];

        for (const constraint of constraints) {
            try {
                await session.run(constraint);
            } catch (e) {
                // Ignore if already exists
            }
        }
        console.log('✅ Constraints and indexes created');

        // Create unique skills first
        console.log('\n🎯 Creating skill nodes...');
        const uniqueSkills = new Map();
        data.people.forEach(p => {
            p.skills.forEach(s => uniqueSkills.set(s.name, s.category));
        });

        for (const [name, category] of uniqueSkills) {
            await session.run(
                'MERGE (s:Skill {name: $name}) SET s.category = $category',
                { name, category }
            );
        }
        console.log(`✅ Created ${uniqueSkills.size} unique skills`);

        // Insert people with batching
        console.log('\n👥 Inserting people and relationships...');
        const BATCH_SIZE = 50;

        for (let i = 0; i < data.people.length; i += BATCH_SIZE) {
            const batch = data.people.slice(i, i + BATCH_SIZE);

            for (const personData of batch) {
                const tx = session.beginTransaction();

                try {
                    // Create person
                    await tx.run(`
            CREATE (p:Person {
              id: $id,
              name: $name,
              email: $email,
              phone: $phone,
              birth_date: date($birth_date),
              working_years: $working_years
            })
          `, personData.person);

                    // Create education
                    for (const edu of personData.education) {
                        await tx.run(`
              MATCH (p:Person {id: $personId})
              CREATE (e:Education {
                id: $id,
                degree: $degree,
                field: $field,
                institution: $institution,
                graduation_year: $graduation_year
              })
              CREATE (p)-[:HAS_EDUCATION]->(e)
            `, { personId: personData.person.id, ...edu });
                    }

                    // Create certificates
                    for (const cert of personData.certificates) {
                        const certParams = {
                            personId: personData.person.id,
                            id: cert.id,
                            name: cert.name,
                            issuer: cert.issuer,
                            issue_date: cert.issue_date,
                            expiry_date: cert.expiry_date
                        };

                        if (cert.expiry_date) {
                            await tx.run(`
                MATCH (p:Person {id: $personId})
                CREATE (c:Certificate {
                  id: $id,
                  name: $name,
                  issuer: $issuer,
                  issue_date: date($issue_date),
                  expiry_date: date($expiry_date)
                })
                CREATE (p)-[:HAS_CERTIFICATE]->(c)
              `, certParams);
                        } else {
                            await tx.run(`
                MATCH (p:Person {id: $personId})
                CREATE (c:Certificate {
                  id: $id,
                  name: $name,
                  issuer: $issuer,
                  issue_date: date($issue_date)
                })
                CREATE (p)-[:HAS_CERTIFICATE]->(c)
              `, certParams);
                        }
                    }

                    // Create trainings
                    for (const training of personData.trainings) {
                        await tx.run(`
              MATCH (p:Person {id: $personId})
              CREATE (t:Training {
                id: $id,
                name: $name,
                provider: $provider,
                completion_date: date($completion_date),
                duration_hours: $duration_hours
              })
              CREATE (p)-[:COMPLETED_TRAINING]->(t)
            `, { personId: personData.person.id, ...training });
                    }

                    // Create experiences
                    for (const exp of personData.experiences) {
                        const expParams = {
                            personId: personData.person.id,
                            id: exp.id,
                            company: exp.company,
                            role: exp.role,
                            start_date: exp.start_date,
                            end_date: exp.end_date,
                            description: exp.description
                        };

                        if (exp.end_date) {
                            await tx.run(`
                MATCH (p:Person {id: $personId})
                CREATE (e:Experience {
                  id: $id,
                  company: $company,
                  role: $role,
                  start_date: date($start_date),
                  end_date: date($end_date),
                  description: $description
                })
                CREATE (p)-[:WORKED_AT]->(e)
              `, expParams);
                        } else {
                            await tx.run(`
                MATCH (p:Person {id: $personId})
                CREATE (e:Experience {
                  id: $id,
                  company: $company,
                  role: $role,
                  start_date: date($start_date),
                  description: $description
                })
                CREATE (p)-[:WORKED_AT]->(e)
              `, expParams);
                        }
                    }

                    // Create social media
                    for (const social of personData.social_media) {
                        await tx.run(`
              MATCH (p:Person {id: $personId})
              CREATE (s:SocialMedia {
                id: $id,
                platform: $platform,
                handle: $handle,
                followers_count: $followers_count
              })
              CREATE (p)-[:FOLLOWS]->(s)
            `, { personId: personData.person.id, ...social });
                    }

                    // Connect to skills
                    for (const skill of personData.skills) {
                        await tx.run(`
              MATCH (p:Person {id: $personId})
              MATCH (s:Skill {name: $skillName})
              CREATE (p)-[:HAS_SKILL]->(s)
            `, { personId: personData.person.id, skillName: skill.name });
                    }

                    await tx.commit();
                } catch (error) {
                    await tx.rollback();
                    console.error(`Error inserting person ${personData.person.id}:`, error.message);
                }
            }

            console.log(`  Inserted ${Math.min(i + BATCH_SIZE, data.people.length)}/${data.people.length} people...`);
        }

        // Verify counts
        console.log('\n📊 Verifying data...');
        const counts = await session.run(`
      MATCH (p:Person) WITH count(p) as people
      MATCH (e:Education) WITH people, count(e) as education
      MATCH (c:Certificate) WITH people, education, count(c) as certificates
      MATCH (t:Training) WITH people, education, certificates, count(t) as trainings
      MATCH (exp:Experience) WITH people, education, certificates, trainings, count(exp) as experiences
      MATCH (sm:SocialMedia) WITH people, education, certificates, trainings, experiences, count(sm) as social_media
      MATCH (s:Skill) 
      RETURN people, education, certificates, trainings, experiences, social_media, count(s) as skills
    `);

        const record = counts.records[0];
        console.log(`   People: ${record.get('people')}`);
        console.log(`   Education: ${record.get('education')}`);
        console.log(`   Certificates: ${record.get('certificates')}`);
        console.log(`   Trainings: ${record.get('trainings')}`);
        console.log(`   Experiences: ${record.get('experiences')}`);
        console.log(`   Social Media: ${record.get('social_media')}`);
        console.log(`   Skills: ${record.get('skills')}`);

        await session.close();
        console.log('\n🎉 Database seeding complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await driver.close();
    }
}

seedDatabase();
