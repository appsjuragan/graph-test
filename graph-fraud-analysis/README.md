# Fraud Analytics Dashboard

A comprehensive fraud detection and analytics system using Neo4j graph database to identify suspicious registration patterns.

## Features

- 🛡️ **Real-time Fraud Detection**: Identify suspicious patterns in user registrations
- 📊 **Dashboard Analytics**: Visual statistics and fraud pattern distribution
- 🔍 **KTP Lookup**: Analyze any KTP number for fraud patterns
- 👥 **User Management**: Browse and search all registered users
- 🔗 **Graph Relationships**: Visualize connections between entities

## Fraud Patterns Detected

| Pattern | Severity | Description |
|---------|----------|-------------|
| Shared KTP | HIGH | Multiple emails using the same KTP number |
| Email Cluster | MEDIUM | Excessive registrations from same user |
| Agent/Middleman | LOW | High-volume registrations from business accounts |
| Policy Violation | HIGH | Exceeding product purchase limits |

## Quick Start

```powershell
# 1. Start Neo4j
docker compose up -d

# 2. Install dependencies
npm install

# 3. Generate 1000+ dummy records
npm run generate

# 4. Seed the database
npm run seed

# 5. Start the dashboard
npm run start
```

Access:
- **Dashboard**: http://localhost:3000
- **Neo4j Browser**: http://localhost:7474 (neo4j/fraudanalysis123)

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/stats` | Dashboard statistics |
| `GET /api/fraud-patterns` | All detected fraud patterns |
| `GET /api/persons` | List users (with search) |
| `GET /api/person/:id` | User details |
| `GET /api/ktp-analysis/:ktp` | KTP fraud analysis |

## Product Limits

- **DigitalCertificate**: 1 per KTP
- **DigitalToken**: max 2 per KTP  
- **DigitalSign**: up to 10 per email
- **DigitalJump**: up to 100 per email per KTP

## ⚠️ Data Disclaimer

All data generated and displayed in this dashboard is **strictly synthetic** and created for testing purposes only. No real personal identifiable information (PII) is used. Any resemblance to actual persons, living or dead, is purely coincidental.
