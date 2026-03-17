# NEB Prizes 2026 — Application Answers (Strand A, Category 3)

**Project:** Cryptographic Beings
**Category:** 3 — Arts, Culture, and Heritage as Drivers of Change
**Strand:** A — Champions
**Deadline:** 22 March 2026 at 19:00 CET

---

## Section 1: Project Description

### 1.1 Describe your project in a short and engaging way (500 chars max)

> *Cryptographic Beings* is a bio-hybrid machine storing digital data in living algae. Marimo moss balls float or sink through photosynthesis, forming biological binary memory. Robotic arms control light to write; sensors read back. Each write consumes real metabolic resources — data permanence depends on ecological care, not silicon. The work stages the tension between accelerationist extraction and symbiotic stewardship: will our data infrastructures cultivate life, or consume it?

*(485 characters)*

### 1.2 Describe your project in detail

*Cryptographic Beings* is a technological proposal for a "living hard-drive" where digital information is stored in living (vegetal) media instead of silicon-based transistors. The project realises binary logic through photosynthetic buoyancy switching: each "living bit" is a Marimo algae sphere (*Aegagropila linnaei*). When illuminated, photosynthesis supersaturates the sphere with oxygen micro-bubbles, decreasing its density so the sphere rises and floats. In darkness the oxygen diffuses away and the sphere gradually sinks. These two states — High (1) and Low (0) — enable binary storage.

The installation comprises 18 transparent tubes arranged in a 3×6 grid, each containing a Marimo sphere in water. Robotic arms fitted with LED arrays control light exposure per tube. ESP32-CAM imaging and custom sensor arrays read the living state. A FastAPI controller orchestrates writing and reading operations through a web dashboard with WebSocket real-time updates.

The system is not a fixed sculpture but a reprogrammable living machine: the control code can be rewritten for each exhibition context. For the NOVA exhibition, an AI language model (Ollama qwen2.5:14b) was integrated to write daily text into the living array, learning how much information it can extract without destroying photosynthetic vitality.

**Key technical components:** LattePanda Alpha SBC (Ubuntu), Arduino Nanos with DM556 stepper drivers, ESP8266 HTTP proxy, ESP32-CAM, custom PCBs (EXP_012, level motor controller).

---

## Section 2: NEB Core Values (40 points)

### 2.1 Sustainability (environmental)

**How does your project contribute to environmental sustainability?**

Cryptographic Beings directly addresses the environmental cost of computation and data storage. By substituting silicon-based transistors with living photosynthetic organisms, it proposes an alternative substrate where data permanence depends on ecological stewardship rather than energy-intensive server farms.

Key sustainability aspects:
- **Resource critique:** Each "write" cycle consumes real metabolic resources (light, nutrients, recovery time), making the environmental cost of data tangible and visible
- **Biological tempo vs silicon speed:** Throughput is limited to the pace of photosynthesis, confronting viewers with the gap between silicon's near-instant switching and life's rhythms
- **Care-based permanence:** Data durability depends on the health of living organisms — over-extraction (too many writes) bleaches and kills the algae, permanently destroying stored data
- **Nature-based computation:** Uses photosynthesis — a carbon-absorbing process — as the core computational mechanism
- **Circular thinking:** Marimo algae are slow-growing, long-lived organisms (some specimens >100 years), embodying durability over planned obsolescence

### 2.2 Inclusion

**How does your project promote social inclusion?**

- **Accessibility:** The installation uses universally observable phenomena (floating/sinking balls, light/dark) making the binary logic understandable without technical background
- **Cross-generational appeal:** The living organisms engage viewers across all ages — children can observe biological processes while adults engage with philosophical implications
- **Open-source ethos:** The entire codebase, hardware designs, and PCB schematics are documented and shared as open-source resources
- **Participatory AI dimension:** In the NOVA configuration, visitors witness an AI negotiating with biology in real-time, democratising understanding of AI decision-making
- **Multi-lingual & multi-cultural:** The concept of using living organisms as memory transcends linguistic barriers; Marimo algae hold cultural significance in Japan (marimo matsuri festival)

### 2.3 Aesthetics & Quality of Experience

**How does your project contribute to aesthetics and quality of experience?**

- **Living sculpture:** 18 transparent tubes with luminous green algae spheres create a mesmerising kinetic display — spheres slowly rising and sinking in choreographed patterns
- **Temporal poetry:** The pace of photosynthesis (minutes to hours per state change) creates contemplative, meditative viewing experiences distinct from screen-based digital art
- **Material honesty:** Water, glass, light, and living organisms — the raw materials are transparent, legible, and emotionally resonant
- **Sensory richness:** The bubbling of oxygen, the gentle movement of water, the green glow of chlorophyll under light — engaging multiple senses
- **Conceptual depth:** Layers of reading from immediate (beautiful kinetic sculpture) to deep (critique of accelerationism, bio-extractive economies, ecological stewardship)

---

## Section 3: Working Principles (35 points)

### 3.1 Participatory process

**How were communities involved?**

- **Exhibition-as-experiment:** Each exhibition is configured as a live experiment where audience observation and presence directly affects the installation (body heat, CO2 from breathing affects algae metabolism)
- **Open lab practice:** The development process is fully documented through a public experiment notebook (14+ experiments documented), shared in real-time
- **Community of bio-artists:** The project has been developed in dialogue with the bio-art community through exhibitions, talks, and workshops at institutions like Ars Electronica, Sonar, and MAXXI
- **Student engagement:** Workshops at CRI Paris and LCC London where students built small-scale bioreactors

### 3.2 Multi-level engagement

**How does your project engage at multiple levels?**

- **Citizens:** Public exhibitions (MAXXI Rome, Sonar Barcelona, Japan Media Art Festival) engage general audiences with hands-on science communication
- **Institutions:** Partnerships with galleries, festivals, and science museums for touring exhibitions
- **Research community:** Published in IEEE, papers presented at academic conferences; research partnership with CRI Paris (synthetic biology lab)
- **Industry:** Position at OXMAN NYC (Head of Cyber Synthetic Biology) bridges art-science-industry at the highest level
- **Horizontal:** Engages across fields — art, biology, computer science, philosophy
- **Vertical:** From local maker communities to EU-level recognition (STARTS Prize nomination)

### 3.3 Transdisciplinary approach

**What fields does your project bring together?**

- **Biology:** Photosynthesis, algae ecology, buoyancy physics, biological habituation
- **Computer Science:** Binary logic, data storage, embedded systems, AI/LLM integration
- **Art & Design:** Kinetic sculpture, interaction design, installation art
- **Philosophy:** Accelerationism, Infocene theory, bio-ethics, post-human ontology
- **Engineering:** Custom PCB design (KiCad/Atopile), stepper motor control, IoT networking
- **Ecology:** Data infrastructure as ecosystem, care-based computing

---

## Section 4: Innovation (5 points)

**What is novel about your approach?**

Cryptographic Beings is, to our knowledge, the first working prototype of a bio-hybrid binary storage system using photosynthetic buoyancy as the switching mechanism. While bio-computing concepts exist in theoretical research, this project implements a fully functional read-write system with living organisms at installation scale.

Novel aspects:
- **Photosynthetic buoyancy switching** as a binary logic mechanism (no synthetic biology required — uses natural organism behaviour)
- **AI-biology co-adaptation** in the NOVA configuration: code and algae co-adapt in real time, a perpetually renegotiated frontier
- **Bio-ethical data storage** where information permanence is bound to ecological well-being

---

## Section 5: EU Competitiveness (5 points)

**What is the financial approach?**

- **Exhibition fees:** The installation is commissioned by major institutions (typical fee: €5,000–€15,000 + production costs)
- **Award recognition:** A' Design Award Gold (2023), Bio Arts and Design Award, Falling Walls winner — establishing commercial credibility
- **Patent-free:** Open-source approach encourages EU-based derivative innovation in bio-computation
- **Low-cost materials:** Uses widely available components (Marimo: ~€5/unit, Arduino: ~€20, LED arrays: ~€10) making the technology accessible for education and research
- **EU development:** Core project developed during Master studies at CRI Paris (EU); key exhibitions in EU institutions

---

## Section 6: Replicability (5 points)

**Can this be replicated in other contexts?**

- **Educational settings:** The binary logic demonstration is ideal for STEM education — a single-tube version can be built for <€50
- **Research platforms:** The open-source software stack (FastAPI + Arduino) is a reusable framework for any organism-based sensing/actuation project
- **Museum installations:** Scalable grid architecture (from 6 to 30+ tubes) adapts to different exhibition spaces
- **Cultural adaptation:** Marimo algae are available worldwide; the concept can be adapted to local organisms with photosynthetic or metabolic switching behaviour
- **Documentation:** Full experiment logs, PCB designs, firmware, and API documentation are publicly shared

---

## Section 7: Required Attachments

- [ ] 6+ photographs with copyright info
- [ ] Documentation of results (evaluation report / exhibition documentation)
- [ ] Signed Privacy Statement
- [ ] CV / portfolio
- [ ] Letters of recommendation (if available)
