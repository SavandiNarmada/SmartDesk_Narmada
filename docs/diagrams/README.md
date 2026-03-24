# Smart Desk Assistant — System Documentation
## Final Year University Thesis Diagrams

**Project:** Smart Desk Assistant (SDA)
**Platform:** IoT + Mobile Application
**Institution:** Institute of Information Technology (IIT)

---

## Overview

The Smart Desk Assistant is an end-to-end IoT system that continuously monitors workplace environmental conditions — air quality, noise level, and ambient light — using a custom-built ESP32-S3 sensor node. Data flows from the hardware through the MQTT Connect cloud broker, into a Node.js backend, and is presented in real time on a React Native mobile application with AI-powered health insights.

---

## Document Index

| # | Document | Description |
|---|----------|-------------|
| 01 | [Concept Map](01_concept_map.md) | High-level mind-map of system concepts and their relationships |
| 02 | [Rich Picture](02_rich_picture.md) | Narrative landscape showing stakeholders, concerns, and interactions |
| 03 | [Stakeholder Onion Diagram](03_stakeholder_onion.md) | Concentric influence rings for all project stakeholders |
| 04 | [Context Diagram](04_context_diagram.md) | System boundary and external entity interactions |
| 05 | [Use Case Diagram](05_use_case_diagram.md) | Actor goals and system capabilities |
| 06 | [System Architecture Diagram](06_system_architecture.md) | Four-layer architecture with component breakdown |
| 07 | [Class Diagram](07_class_diagram.md) | UML class model for backend domain entities |
| 08 | [Sequence Diagram](08_sequence_diagram.md) | Key interaction flows across system layers |
| 09 | [Algorithm Diagram](09_algorithm_diagram.md) | Core algorithms: provisioning, sync, and insight generation |
| 10 | [Technology Stack Diagram](10_technology_stack.md) | All technologies grouped by architectural layer |

---

## System at a Glance

```
[ ESP32-S3 Sensor Node ]
         |
         | MQTTS (TLS, port 8883)
         v
[ MQTT Connect Cloud Broker ]
         |
         | REST API + WebSocket
         v
[ Node.js / PostgreSQL Backend ]
         |
         | WebSocket + REST API
         v
[ React Native / Expo Mobile App ]
         |
         | Google Gemini / OpenAI
         v
[ AI Workspace Insights ]
```

---

> All diagrams use [Mermaid](https://mermaid.js.org/) syntax and render natively in GitHub, GitLab, and most modern documentation tools.
