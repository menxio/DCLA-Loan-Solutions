# 30-Day Python, APIs, GenAI, and Cloud Interview Plan

## Goal

Prepare for the RELX Software Engineer interview by building practical Python backend, REST API, Docker, GenAI, and cloud skills—and one project that proves them.

This month will not turn one year of experience into three. The goal is to become a credible early-career candidate who can demonstrate the work, explain engineering decisions, and discuss limitations honestly.

## Time commitment

- Weekdays: 2–3 focused hours
- Weekends: 4–6 focused hours
- Target split: 70% building, 20% interview practice, 10% reading

## Portfolio project

Build an **AI-Assisted Loan Application API** using:

- Python and FastAPI
- Pydantic
- SQLAlchemy and Alembic
- PostgreSQL
- Pytest
- Docker and Docker Compose
- GitHub Actions
- One GenAI provider
- AWS or Azure—not both

The application should let an authenticated user:

- Create, view, update, and list loan applications.
- Store application data in PostgreSQL.
- Validate incoming JSON data.
- Submit text from a supporting document.
- Use GenAI to extract or summarize information.
- Flag missing information for human review.
- Run the API and database with Docker Compose.
- Run automated tests.
- Be deployed to AWS or Azure.

The AI must not autonomously approve or reject a loan. Use it for extraction, summarization, completeness checks, or policy questions, with human review.

## Definition of done

- [ ] Working FastAPI application
- [ ] RESTful CRUD endpoints
- [ ] PostgreSQL persistence and migrations
- [ ] Authentication and authorization
- [ ] Validation and useful errors
- [ ] One responsibly designed GenAI feature
- [ ] Unit and integration tests
- [ ] Docker Compose setup
- [ ] Basic CI workflow
- [ ] Cloud deployment, or documented deployment steps if access blocks it
- [ ] Clear README and architecture diagram
- [ ] Five-minute project demonstration
- [ ] Prepared technical and behavioral answers

---

# Week 1: Python and REST API foundations

## Day 1 — Setup and baseline

Learn virtual environments, dependency management, modules, project structure, type hints, and FastAPI basics.

Build:

- Create the project folder or repository.
- Create a virtual environment.
- Install FastAPI, an ASGI server, and Pytest.
- Add `/health` and `/version` endpoints.
- Confirm `/docs` displays generated API documentation.
- Make a small, focused Git commit.

## Day 2 — Python essentials

Study and practise:

- Functions, classes, dataclasses, and type hints
- Lists, dictionaries, sets, and comprehensions
- Exceptions and context managers
- `async`/`await` at a practical level
- FastAPI dependency injection

Practise explaining mutable versus immutable values, common collections, exception handling, and when asynchronous I/O helps.

## Day 3 — REST and validation

Learn HTTP methods, status codes, resource-oriented URLs, Pydantic models, and input validation.

Build an in-memory version of:

- `POST /applications`
- `GET /applications/{id}`
- `GET /applications`
- `PATCH /applications/{id}`
- `DELETE /applications/{id}`

Return suitable status codes, clear validation errors, and `404` for missing records.

## Day 4 — SQL and PostgreSQL

Learn tables, keys, constraints, CRUD queries, joins, transactions, indexes, and ORM trade-offs.

Build:

- Add PostgreSQL.
- Create an application database model.
- Replace in-memory storage with PostgreSQL.

Practise explaining transactions, indexes, and ORM versus raw SQL.

## Day 5 — SQLAlchemy and migrations

Learn sessions, connection lifecycle, SQLAlchemy models, queries, Alembic migrations, and separation between API, service, and repository layers.

Build:

- Create the first migration.
- Add status and timestamp fields.
- Keep database logic out of route handlers.
- Confirm a fresh database can be created from migrations.

## Day 6 — Testing

Learn unit versus integration tests, Arrange–Act–Assert, fixtures, mocks, and FastAPI endpoint testing.

Add at least eight meaningful tests covering:

- Successful creation
- Invalid input
- Missing records
- Updates and deletion
- Important service logic
- A separate test database configuration

## Day 7 — Review and mock interview

Do not add a major feature. Refactor unclear code, run the tests from a clean setup, and review Python, HTTP, SQL, and FastAPI.

Explain this flow aloud:

```text
HTTP request
  -> FastAPI route
  -> Pydantic validation
  -> service logic
  -> repository
  -> PostgreSQL
  -> response model
```

Record a five-minute explanation and review anything you cannot explain comfortably.

---

# Week 2: Production-style backend development

## Day 8 — Authentication

Learn authentication versus authorization, password hashing, JWTs, token expiry, and secret handling.

Build user registration, login, password hashing, and protected endpoints. Never store plaintext passwords.

## Day 9 — Authorization and ownership

Ensure users can access only their own applications. Optionally add a reviewer role. Return `401` for unauthenticated access and `403` for forbidden access.

Practise explaining `401` versus `403` and why JWT signatures must be validated.

## Day 10 — API usability

Add pagination, filtering by status, sorting, consistent response models, and a consistent error format.

Learn idempotency, backward-compatible API changes, and API versioning concepts.

## Day 11 — Logging and configuration

Add environment-based configuration, structured logs, request/correlation IDs, and centralized exception handling.

Check that:

- Secrets and personal data are not logged.
- Internal failures do not expose stack traces to clients.
- Logs have enough context to investigate failures.

## Day 12 — Docker

Learn images versus containers, Dockerfile layers, ports, networks, volumes, environment variables, and health checks.

Build:

- A Dockerfile for the API
- Docker Compose for the API and PostgreSQL
- Documented migration/setup commands

Confirm the containers communicate and database data persists after restart.

## Day 13 — CI and code quality

Add formatting, linting, and type checking if manageable. Create a GitHub Actions workflow that runs tests.

Learn continuous integration versus continuous delivery/deployment and why a passing pipeline does not replace code review.

## Day 14 — Microservices and system design

Keep the implementation as a modular monolith. Study service boundaries, REST versus messaging, background jobs, timeouts, retries, backoff, idempotency, eventual consistency, and circuit breakers.

Design—but do not necessarily build—a document worker:

```text
API -> job queue -> document worker -> GenAI provider
                      |
                      v
                  PostgreSQL
```

Be able to explain when separating this service would and would not be worthwhile.

---

# Week 3: Generative AI integration

## Day 15 — GenAI foundations

Learn tokens, context windows, system/user instructions, temperature conceptually, structured output, latency, cost, and hallucinations.

Create an AI provider interface, keep provider code outside routes, and add a fake provider for tests.

## Day 16 — Structured extraction

Build the core AI feature:

- Accept sample document text.
- Extract defined fields using the model.
- Require structured JSON output.
- Validate the result with Pydantic.
- Mark uncertain or missing fields instead of inventing values.

Possible fields include applicant name, requested amount, declared income, employment details, and missing-document notes.

## Day 17 — Reliability and failures

Handle provider timeouts, rate limits, invalid output, temporary failure, and oversized input.

Add timeouts, limited retries with backoff, a safe error state, and tests using a mocked provider. Learn why blind retries can duplicate work and how idempotency helps.

## Day 18 — Responsible AI and security

Study prompt injection, data leakage, personal information, human review, auditability, and bias.

Treat uploaded text as untrusted, limit input size/type, avoid logging document contents, and require human review. Be ready to explain why AI assists rather than makes the final lending decision.

## Day 19 — RAG fundamentals

Learn embeddings, chunking, vector similarity, retrieval, grounded answers, citations, and RAG versus fine-tuning.

Optional: add question answering over approved policy documents and return the supporting source. Skip this if core features, tests, or Docker remain incomplete.

## Day 20 — AI evaluation

Create a small evaluation set containing:

- A normal document
- Missing information
- Contradictory information
- A prompt-injection attempt
- Unexpected formatting
- Very long input

Evaluate required-field accuracy, invalid-output rate, latency, and failure behavior. Document limitations honestly.

## Day 21 — Integration review

Run the complete authentication-to-AI flow. Fix important bugs and test provider failure and invalid output.

Practise explaining RAG versus fine-tuning, structured output, hallucination mitigation, prompt injection, and cost/latency control.

---

# Week 4: Cloud and interview preparation

## Day 22 — Choose one cloud

Choose AWS or Azure based on the team's preference or your available access.

| Need | AWS example | Azure example |
|---|---|---|
| Container hosting | ECS/App Runner | Container Apps |
| Managed PostgreSQL | RDS | Azure Database for PostgreSQL |
| Object storage | S3 | Blob Storage |
| Secrets | Secrets Manager | Key Vault |
| Logs/metrics | CloudWatch | Azure Monitor |
| Identity/access | IAM | Entra ID/RBAC |

Study only the selected platform in depth.

## Day 23 — Prepare deployment

Create production configuration, move secrets to environment variables or a secrets service, configure origins, add health checks, document migrations, and disable unsafe development settings.

## Day 24 — Deploy

Deploy the containerized API, connect a managed database if practical, configure logs, and test the deployed health and core endpoints.

If account access or cost blocks deployment, document the exact design and demonstrate the complete system locally.

## Day 25 — Observability and operations

Learn logs, metrics, traces, availability, latency, alerts, horizontal scaling, load balancing, backups, and rollbacks.

Prepare answers for investigating a slow endpoint, database failure, AI-provider outage, and secure deployment.

## Day 26 — Documentation and architecture

Finish the project README with:

- Problem and scope
- Architecture diagram
- Technology choices
- Local setup and environment variables
- Migrations and tests
- API examples
- Deployment
- Security and AI-safety considerations
- Limitations and future improvements

Do not call the project production-ready; explain what production readiness would still require.

## Day 27 — Python and coding review

Practise collections, strings, loops, comprehensions, functions, classes, exceptions, basic complexity, data transformations, and testable code.

Solve two or three easy-to-medium problems without AI assistance. Explain the solution and complexity aloud. Do not spend the day on obscure algorithm tricks.

## Day 28 — Backend and system-design mock

Design a document-processing system on paper. Discuss requirements, endpoints, schema, authentication, file storage, background work, failures, AI integration, privacy, scaling, and monitoring.

Practise adapting the design when a new constraint is introduced.

## Day 29 — Behavioral preparation

Write honest STAR/STARR stories for:

- A difficult bug
- A technical disagreement
- Learning an unfamiliar technology
- Receiving critical feedback
- Making a mistake or missing a target
- Improving a process
- Working under a deadline
- Taking ownership

For each, identify the situation, task, action you personally took, result, and reflection. Never fabricate experience.

Prepare this experience-gap answer in your own words:

> I have one year of professional software-engineering experience, mainly in web development. I do not yet have three years specifically in Python, but my experience with APIs, databases, Git, deployment, and debugging transfers directly. I built this Python and GenAI service to close the technology gap, and I can walk through its architecture, tests, failure handling, and trade-offs.

## Day 30 — Final rehearsal

- Run the project from a clean environment using only the README.
- Run all tests.
- Check the repository for secrets.
- Deliver a timed five-minute demo.
- Complete one coding mock.
- Complete one system-design mock.
- Complete one behavioral mock.
- Stop early enough to sleep properly.

Questions to ask RELX:

- What would success look like in the first three months?
- How much is new Python development versus supporting existing systems?
- How does the team evaluate GenAI features?
- What testing and deployment practices does the team use?
- How does the team support early-career engineers?
- Which skills are essential on day one, and which can be learned in the role?

---

# Interview checklist

## Python

- [ ] Exceptions and error handling
- [ ] Type hints
- [ ] Context managers
- [ ] Practical uses of `async`
- [ ] Maintainable Python project structure

## REST and backend

- [ ] RESTful resource design
- [ ] `POST` versus `PUT` versus `PATCH`
- [ ] `400`, `401`, `403`, `404`, `409`, and `500`
- [ ] Idempotency
- [ ] Validation and authentication
- [ ] API versioning

## Databases

- [ ] Transactions
- [ ] Indexes and trade-offs
- [ ] N+1 query problem
- [ ] ORM versus SQL
- [ ] Safe schema migrations

## Docker and cloud

- [ ] Image versus container
- [ ] Container networking
- [ ] Secret handling
- [ ] Deployment and scaling
- [ ] Monitoring and troubleshooting

## GenAI

- [ ] Structured output
- [ ] RAG
- [ ] RAG versus fine-tuning
- [ ] Hallucination reduction
- [ ] Prompt injection defenses
- [ ] Testing AI calls
- [ ] Latency, cost, and provider failures
- [ ] Human oversight in lending workflows

## Microservices

- [ ] Benefits and costs of microservices
- [ ] When to prefer a modular monolith
- [ ] Timeouts, retries, and circuit breakers
- [ ] Eventual consistency
- [ ] Distributed-system complexity

---

# Daily study log

Copy this for each day:

```text
Date:
Time spent:

Built:
Learned:
Tests added:
Problem encountered:
How I solved it:
What I can now explain without notes:
First task for tomorrow:
```

# Rules for the month

1. Build before watching another tutorial.
2. Commit small, understandable changes.
3. Never copy code you cannot explain.
4. Test important success and failure paths.
5. Track interview questions discovered while building.
6. Use AI for explanations, review, and practice—not to fabricate experience or answer a live interview.
7. Prefer one small, complete system over many unfinished features.
8. Be honest about your experience and confident about demonstrated ability.

# Minimum viable version if behind schedule

Finish in this order:

1. FastAPI CRUD endpoints
2. PostgreSQL and migrations
3. Validation and error handling
4. Tests
5. Docker Compose
6. Authentication
7. One structured GenAI extraction feature
8. Mocked AI tests and failure handling
9. README and architecture diagram
10. Deployment

RAG, queues, advanced cloud infrastructure, and a separate microservice are stretch goals.
