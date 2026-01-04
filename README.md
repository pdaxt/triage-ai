# TriageAI

> **Intelligent Patient Triage System** — AI-powered symptom collection, severity assessment, and doctor routing that transforms virtual consultations and enables rapid digital prescriptions.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)
[![AWS](https://img.shields.io/badge/AWS-Deployed-FF9900.svg)](https://aws.amazon.com/)

---

## The Problem

**Healthcare is drowning in inefficiency.**

- Patients wait hours for consultations that could be triaged in minutes
- Doctors spend 40% of their time on cases that don't match their specialty
- Emergency rooms are overwhelmed with non-urgent cases
- Rural and underserved areas lack access to timely medical guidance

**The cost:** Delayed treatment, burned-out physicians, preventable escalations, and lives at risk.

---

## The Solution

**TriageAI** is an AI-powered patient intake and triage system that:

1. **Triages patient symptoms** through natural conversation (not forms)
2. **Generates recommendations** using clinically-validated algorithms + LLM reasoning
3. **Summarizes findings for doctors** before virtual consultation
4. **Routes patients** to the right doctor, specialty, or care level
5. **Enables rapid consultations** so doctors can issue digital prescriptions faster
6. **Provides transparency** with full audit trails for compliance

### How It Works

```
Patient describes symptoms
         ↓
    [AI Symptom Parser]
         ↓
  Structured clinical data
         ↓
    [Triage Engine]
    ├── Severity Score (1-5)
    ├── Urgency Flag
    ├── Specialty Match
    └── AI Recommendations
         ↓
  [Doctor Summary Generator]
    └── Pre-consultation briefing
         ↓
  Doctor Queue Assignment
         ↓
    Rapid Virtual Consultation
         ↓
    Digital Prescription
```

---

## Key Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Conversational Intake** | Natural language symptom collection | 🔨 Building |
| **AI Triage Scoring** | Evidence-based severity assessment | 🔨 Building |
| **Doctor Summaries** | AI-generated pre-consultation briefings | 🔨 Building |
| **Smart Routing** | Match patients to right specialty | 📋 Planned |
| **Priority Queue** | Urgent cases surface automatically | 📋 Planned |
| **Digital Prescriptions** | Rapid Rx after virtual consultation | 📋 Planned |
| **Audit Trail** | Every AI decision logged for compliance | 📋 Planned |
| **Doctor Dashboard** | Real-time queue with patient context | 📋 Planned |
| **Patient Portal** | Track status, estimated wait times | 📋 Planned |
| **API First** | Integrate with existing EMR/EHR systems | 📋 Planned |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PATIENT LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  Web App (React)  │  Mobile (React Native)  │  SMS/WhatsApp    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                             │
│                    (Node.js + Express)                          │
├─────────────────────────────────────────────────────────────────┤
│  Authentication  │  Rate Limiting  │  Request Validation        │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  INTAKE SERVICE │ │  TRIAGE ENGINE  │ │  QUEUE SERVICE  │
│                 │ │                 │ │                 │
│ • Symptom Parse │ │ • AI Assessment │ │ • Priority Calc │
│ • NLP Extract   │ │ • Severity Score│ │ • Doctor Match  │
│ • History Link  │ │ • Red Flags     │ │ • Wait Estimate │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Patient Data)  │  Redis (Queues)  │  S3 (Audit)   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Frontend** | React 18 + TypeScript | Type safety, component reuse |
| **Backend** | Node.js + Express | Fast, scalable, async-first |
| **AI/LLM** | Claude API | Best reasoning, medical safety |
| **Database** | PostgreSQL | HIPAA-ready, relational integrity |
| **Cache/Queue** | Redis | Real-time queue management |
| **Deployment** | AWS (ECS/Lambda) | Healthcare compliance, scale |
| **Auth** | Auth0/Cognito | Enterprise SSO, MFA |

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/pdaxt/triage-ai.git
cd triage-ai

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your API keys (ANTHROPIC_API_KEY, DATABASE_URL, etc.)

# Run database migrations
npm run db:migrate

# Start development server
npm run dev

# Open http://localhost:3000
```

---

## Project Structure

```
triage-ai/
├── apps/
│   ├── web/                 # React frontend (patient + doctor)
│   └── api/                 # Node.js backend
│
├── packages/
│   ├── triage-engine/       # Core AI triage logic
│   ├── symptom-parser/      # NLP symptom extraction
│   └── shared/              # Shared types, utilities
│
├── docs/
│   ├── REQUIREMENTS.md      # Detailed requirements
│   ├── ARCHITECTURE.md      # System design
│   ├── API.md               # API documentation
│   └── COMPLIANCE.md        # HIPAA/regulatory notes
│
├── scripts/                 # Build, deploy, seed scripts
└── infrastructure/          # AWS CDK / Terraform
```

---

## Development Approach

### AI-Agents-First

This project is built using an **AI-agents-first methodology**:

1. **Rapid prototyping** — Features built in hours, not weeks
2. **Continuous iteration** — Ship, learn, improve
3. **Documentation-driven** — Specs written before code
4. **Test coverage** — AI-generated tests for edge cases

### Why This Matters

Traditional healthcare software takes 12-18 months to MVP.

With AI-assisted development:
- **Week 1:** Core triage engine + patient intake
- **Week 2:** Doctor dashboard + queue management
- **Week 3:** Integrations + compliance hardening
- **Week 4:** Production deployment + monitoring

**Speed without sacrificing quality.**

### Business-First Philosophy

This isn't an academic exercise. It's built for **commercial outcomes**:

- **Australia first, then global** — Designed for Australian telehealth regulations with clear path to international markets
- **Revenue from day one** — Integrates with existing virtual consultation platforms
- **100M+ patient opportunity** — Addressing the global telehealth triage gap
- **Defensible moat** — Clinical validation data + provider relationships

**Technical excellence in service of business impact.**

---

## Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Patient symptom intake (conversational)
- [ ] AI triage scoring engine
- [ ] Basic severity classification
- [ ] Audit logging

### Phase 2: Routing (Week 2)
- [ ] Doctor specialty matching
- [ ] Priority queue system
- [ ] Wait time estimation
- [ ] Doctor dashboard

### Phase 3: Integration (Week 3)
- [ ] EMR/EHR API connectors
- [ ] SMS/WhatsApp notifications
- [ ] Analytics dashboard
- [ ] Multi-tenant support

### Phase 4: Scale (Week 4)
- [ ] Load testing + optimization
- [ ] HIPAA compliance audit
- [ ] Production deployment
- [ ] Monitoring + alerting

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Contact

**Built by [Pranjal Gupta](https://linkedin.com/in/pranjalgupta)**

Questions? Reach out: [Email](mailto:pran@dataxlr8.ai) | [LinkedIn](https://linkedin.com/in/pranjalgupta)

---

<p align="center">
  <strong>Healthcare deserves better technology. Let's build it.</strong>
</p>
