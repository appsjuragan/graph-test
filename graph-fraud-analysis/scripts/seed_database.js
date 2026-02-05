const neo4j = require('neo4j-driver');
const fs = require('fs');
const path = require('path');

// Neo4j connection configuration
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'fraudanalysis123';

async function seedDatabase() {
    console.log('🔌 Connecting to Neo4j...');

    const driver = neo4j.driver(
        NEO4J_URI,
        neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
    );

    try {
        await driver.verifyConnectivity();
        console.log('✅ Connected to Neo4j');

        const session = driver.session();

        // Load data
        const dataPath = path.join(__dirname, '..', 'data', 'registrations.json');
        if (!fs.existsSync(dataPath)) {
            console.error('❌ Data file not found. Run "npm run generate" first.');
            process.exit(1);
        }

        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        console.log(`📊 Loaded ${data.statistics.totalPersons} persons and ${data.statistics.totalRegistrations} registrations`);

        // Clear existing data
        console.log('\n🗑️  Clearing existing data...');
        await session.run('MATCH (n) DETACH DELETE n');

        // Create constraints and indexes
        console.log('\n📐 Creating constraints and indexes...');
        const constraints = [
            'CREATE CONSTRAINT person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE',
            // Removed UNIQUE constraint on KTP to allow Shared KTP fraud pattern
            'CREATE CONSTRAINT email_addr IF NOT EXISTS FOR (e:Email) REQUIRE e.address IS UNIQUE',
            'CREATE CONSTRAINT phone_number IF NOT EXISTS FOR (ph:Phone) REQUIRE ph.number IS UNIQUE',
            'CREATE CONSTRAINT registration_id IF NOT EXISTS FOR (r:Registration) REQUIRE r.id IS UNIQUE',
            'CREATE CONSTRAINT product_type IF NOT EXISTS FOR (pr:Product) REQUIRE pr.productType IS UNIQUE',
            'CREATE INDEX person_name IF NOT EXISTS FOR (p:Person) ON (p.name)',
            'CREATE INDEX registration_status IF NOT EXISTS FOR (r:Registration) ON (r.status)',
            'CREATE INDEX fraud_pattern_type IF NOT EXISTS FOR (f:FraudPattern) ON (f.type)'
        ];

        for (const constraint of constraints) {
            try {
                await session.run(constraint);
            } catch (e) {
                // Ignore if already exists
            }
        }
        console.log('✅ Constraints and indexes created');

        // Create Product nodes
        console.log('\n📦 Creating product nodes...');
        const products = Object.keys(data.productLimits);
        for (const product of products) {
            const limits = data.productLimits[product];
            await session.run(
                `CREATE (p:Product {
                    productType: $productType,
                    perKTPLimit: $perKTP,
                    perEmailLimit: $perEmail
                })`,
                {
                    productType: product,
                    perKTP: limits.perKTP || -1,
                    perEmail: limits.perEmail || -1
                }
            );
        }
        console.log(`✅ Created ${products.length} product nodes`);

        // Insert persons with batching
        console.log('\n👥 Inserting persons and relationships...');
        const BATCH_SIZE = 50;

        for (let i = 0; i < data.persons.length; i += BATCH_SIZE) {
            const batch = data.persons.slice(i, i + BATCH_SIZE);

            for (const person of batch) {
                const tx = session.beginTransaction();

                try {
                    // Create Person node
                    await tx.run(`
                        CREATE (p:Person {
                            id: $id,
                            ktpNumber: $ktpNumber,
                            name: $name,
                            gender: $gender,
                            birthDate: date($birthDate),
                            maritalStatus: $maritalStatus,
                            isAgent: $isAgent,
                            agentCompany: $agentCompany
                        })
                    `, {
                        id: person.id,
                        ktpNumber: person.ktpNumber,
                        name: person.name,
                        gender: person.gender,
                        birthDate: person.birthDate,
                        maritalStatus: person.maritalStatus,
                        isAgent: person.isAgent || false,
                        agentCompany: person.agentCompany || null
                    });

                    // Create Email nodes and relationships
                    for (const email of person.emails) {
                        await tx.run(`
                            MATCH (p:Person {id: $personId})
                            MERGE (e:Email {address: $email})
                            CREATE (p)-[:HAS_EMAIL]->(e)
                        `, { personId: person.id, email: email });
                    }

                    // Create Phone nodes and relationships
                    for (const phone of person.phones) {
                        await tx.run(`
                            MATCH (p:Person {id: $personId})
                            MERGE (ph:Phone {number: $number})
                            ON CREATE SET ph.type = $type
                            CREATE (p)-[:HAS_PHONE]->(ph)
                        `, {
                            personId: person.id,
                            number: phone.number,
                            type: phone.type
                        });
                    }

                    // Create Address node
                    await tx.run(`
                        MATCH (p:Person {id: $personId})
                        CREATE (a:Address {
                            province: $province,
                            city: $city,
                            district: $district,
                            postalCode: $postalCode,
                            street: $street,
                            rtRw: $rtRw,
                            fullAddress: $fullAddress
                        })
                        CREATE (p)-[:LIVES_AT]->(a)
                    `, {
                        personId: person.id,
                        province: person.address.province,
                        city: person.address.city,
                        district: person.address.district,
                        postalCode: person.address.postalCode,
                        street: person.address.street,
                        rtRw: person.address.rt_rw,
                        fullAddress: person.address.fullAddress
                    });

                    // Create BankAccount nodes
                    for (const bank of person.bankAccounts) {
                        await tx.run(`
                            MATCH (p:Person {id: $personId})
                            CREATE (b:BankAccount {
                                bankName: $bankName,
                                bankCode: $bankCode,
                                accountNumber: $accountNumber,
                                accountType: $accountType
                            })
                            CREATE (p)-[:HAS_BANK_ACCOUNT]->(b)
                        `, {
                            personId: person.id,
                            bankName: bank.bankName,
                            bankCode: bank.bankCode,
                            accountNumber: bank.accountNumber,
                            accountType: bank.accountType
                        });
                    }

                    // Create WorkHistory nodes
                    for (const work of person.workHistory) {
                        const workParams = {
                            personId: person.id,
                            company: work.company,
                            role: work.role,
                            startDate: work.startDate,
                            endDate: work.endDate,
                            isCurrent: work.isCurrent
                        };

                        if (work.endDate) {
                            await tx.run(`
                                MATCH (p:Person {id: $personId})
                                CREATE (w:WorkHistory {
                                    company: $company,
                                    role: $role,
                                    startDate: date($startDate),
                                    endDate: date($endDate),
                                    isCurrent: $isCurrent
                                })
                                CREATE (p)-[:WORKED_AT]->(w)
                            `, workParams);
                        } else {
                            await tx.run(`
                                MATCH (p:Person {id: $personId})
                                CREATE (w:WorkHistory {
                                    company: $company,
                                    role: $role,
                                    startDate: date($startDate),
                                    isCurrent: $isCurrent
                                })
                                CREATE (p)-[:WORKED_AT]->(w)
                            `, workParams);
                        }
                    }

                    // Create SocialMedia nodes
                    for (const social of person.socialMedia) {
                        await tx.run(`
                            MATCH (p:Person {id: $personId})
                            CREATE (s:SocialMedia {
                                platform: $platform,
                                handle: $handle,
                                followers: $followers
                            })
                            CREATE (p)-[:HAS_SOCIAL]->(s)
                        `, {
                            personId: person.id,
                            platform: social.platform,
                            handle: social.handle,
                            followers: social.followers
                        });
                    }

                    await tx.commit();
                } catch (error) {
                    await tx.rollback();
                    console.error(`Error inserting person ${person.id}:`, error.message);
                }
            }

            console.log(`  Inserted ${Math.min(i + BATCH_SIZE, data.persons.length)}/${data.persons.length} persons...`);
        }

        // Insert registrations
        console.log('\n📝 Inserting registrations...');
        for (let i = 0; i < data.registrations.length; i += BATCH_SIZE) {
            const batch = data.registrations.slice(i, i + BATCH_SIZE);

            for (const reg of batch) {
                try {
                    await session.run(`
                        MATCH (p:Person {id: $personId})
                        MATCH (e:Email {address: $email})
                        MATCH (pr:Product {productType: $productType})
                        CREATE (r:Registration {
                            id: $id,
                            ktpNumber: $ktpNumber,
                            registeredAt: datetime($registeredAt),
                            status: $status,
                            ipAddress: $ipAddress,
                            userAgent: $userAgent
                        })
                        CREATE (p)-[:REGISTERED]->(r)
                        CREATE (e)-[:USED_IN]->(r)
                        CREATE (r)-[:FOR_PRODUCT]->(pr)
                    `, {
                        id: reg.id,
                        personId: reg.personId,
                        ktpNumber: reg.ktpNumber,
                        email: reg.email,
                        productType: reg.productType,
                        registeredAt: reg.registeredAt,
                        status: reg.status,
                        ipAddress: reg.ipAddress,
                        userAgent: reg.userAgent
                    });
                } catch (error) {
                    // Handle duplicate or missing references
                }
            }

            console.log(`  Inserted ${Math.min(i + BATCH_SIZE, data.registrations.length)}/${data.registrations.length} registrations...`);
        }

        // Insert fraud patterns
        console.log('\n🚨 Inserting fraud patterns...');
        for (const pattern of data.fraudPatterns) {
            await session.run(`
                CREATE (f:FraudPattern {
                    type: $type,
                    severity: $severity,
                    description: $description,
                    detectedAt: datetime()
                })
            `, {
                type: pattern.type,
                severity: pattern.severity,
                description: pattern.description
            });

            // Link to affected persons
            if (pattern.affectedPersonIds) {
                for (const personId of pattern.affectedPersonIds) {
                    await session.run(`
                        MATCH (f:FraudPattern {description: $description})
                        MATCH (p:Person {id: $personId})
                        CREATE (f)-[:INVOLVES]->(p)
                    `, { description: pattern.description, personId: personId });
                }
            } else if (pattern.personId) {
                await session.run(`
                    MATCH (f:FraudPattern {description: $description})
                    MATCH (p:Person {id: $personId})
                    CREATE (f)-[:INVOLVES]->(p)
                `, { description: pattern.description, personId: pattern.personId });
            }
        }
        console.log(`✅ Inserted ${data.fraudPatterns.length} fraud patterns`);

        // Verify counts
        console.log('\n📊 Verifying data...');
        const counts = await session.run(`
            MATCH (p:Person) WITH count(p) as persons
            MATCH (e:Email) WITH persons, count(e) as emails
            MATCH (r:Registration) WITH persons, emails, count(r) as registrations
            MATCH (f:FraudPattern) WITH persons, emails, registrations, count(f) as fraudPatterns
            MATCH (pr:Product) 
            RETURN persons, emails, registrations, fraudPatterns, count(pr) as products
        `);

        const record = counts.records[0];
        console.log(`   Persons: ${record.get('persons')}`);
        console.log(`   Emails: ${record.get('emails')}`);
        console.log(`   Registrations: ${record.get('registrations')}`);
        console.log(`   Fraud Patterns: ${record.get('fraudPatterns')}`);
        console.log(`   Products: ${record.get('products')}`);

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
