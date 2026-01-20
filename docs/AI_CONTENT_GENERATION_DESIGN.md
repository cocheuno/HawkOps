# AI Content Generation System Design

## Overview
This system allows instructors to generate complete simulation scenarios using AI, including all briefing documents, team assignments, and player roles.

## User Flow

### 1. Domain Selection
- Instructor navigates to "Generate Scenario with AI" from Instructor Dashboard
- Selects one or more ITSM domain areas:
  - Incident Management
  - Problem Management
  - Release Management
  - Service Level Agreements
  - Customer Communications
  - Business Continuity
  - Disaster Recovery
  - Cybersecurity and Information Assurance
  - Project Management
  - Program Management
- Optionally provides additional context (e.g., industry, complexity level)

### 2. Scenario Generation
- AI generates 5 different scenario options based on selected domains
- Each scenario includes:
  - Title
  - Description (2-3 paragraphs)
  - Key learning objectives
  - Estimated difficulty (1-10)
  - Estimated duration
  - Primary and secondary ITSM domains involved

### 3. Scenario Selection
- Instructor reviews the 5 scenarios
- Can regenerate if needed
- Selects one scenario to proceed

### 4. Document Generation
- AI generates comprehensive simulation package:
  - **Instructor Playbook**
    - Detailed scenario overview
    - Timeline of events
    - Incident injection plan
    - Expected challenges
    - Evaluation criteria
    - Answer key/best practices
  - **General Briefing** (for all participants)
    - Scenario background
    - Objectives
    - Rules of engagement
    - Timeline
  - **Team Packets** (one per team)
    - Team-specific role
    - Team members (if assigned)
    - Resources and constraints
    - Success metrics
  - **Player Instructions** (optional, for specific roles)
    - Individual responsibilities
    - Special knowledge or constraints

### 5. Review and Edit
- Instructor can review all generated documents
- Edit any content
- Adjust team assignments
- Add/remove documents
- Publish when ready

## Database Schema Changes

### New Table: `scenario_templates`
```sql
CREATE TABLE scenario_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  learning_objectives TEXT,
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 10),
  estimated_duration_minutes INTEGER,
  primary_domain VARCHAR(100),
  secondary_domains JSONB,
  ai_generated BOOLEAN DEFAULT true,
  ai_prompt TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### New Table: `scenario_generations`
```sql
CREATE TABLE scenario_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  selected_domains JSONB NOT NULL,
  additional_context TEXT,
  scenarios_offered JSONB, -- Array of 5 generated scenarios
  selected_scenario_id UUID,
  generation_status VARCHAR(50) DEFAULT 'in_progress',
  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### POST /api/instructor/ai/generate-scenarios
Request:
```json
{
  "domains": ["Incident Management", "Cybersecurity and Information Assurance"],
  "additionalContext": "Healthcare industry, focus on patient data protection",
  "difficultyLevel": 7,
  "estimatedDuration": 90
}
```

Response:
```json
{
  "generationId": "uuid",
  "scenarios": [
    {
      "id": "uuid",
      "title": "Healthcare Data Breach Response",
      "description": "...",
      "learningObjectives": ["..."],
      "difficulty": 7,
      "duration": 90,
      "primaryDomain": "Cybersecurity and Information Assurance",
      "secondaryDomains": ["Incident Management", "Customer Communications"]
    },
    // ... 4 more scenarios
  ]
}
```

### POST /api/instructor/ai/generate-documents
Request:
```json
{
  "gameId": "uuid",
  "scenarioId": "uuid",
  "scenario": { /* full scenario object */ },
  "teams": [
    { "id": "uuid", "name": "Team Alpha", "role": "Operations" },
    { "id": "uuid", "name": "Team Bravo", "role": "Security" }
  ]
}
```

Response:
```json
{
  "documents": [
    {
      "type": "instructor_playbook",
      "title": "...",
      "content": "...",
      "metadata": { /* ... */ }
    },
    {
      "type": "general_briefing",
      "title": "...",
      "content": "...",
      "metadata": { /* ... */ }
    },
    {
      "type": "team_packet",
      "title": "...",
      "content": "...",
      "teamId": "uuid",
      "metadata": { /* ... */ }
    }
    // ... more documents
  ]
}
```

## Frontend Components

### 1. `/instructor/game/:gameId/ai-generate` - AIScenarioGeneratorPage
- Domain selection with checkboxes
- Additional context textarea
- Difficulty and duration sliders
- "Generate Scenarios" button

### 2. ScenarioSelector Component (Modal)
- Displays 5 generated scenarios as cards
- Each card shows title, description, difficulty, domains
- "Select This Scenario" button
- "Regenerate" button

### 3. DocumentReviewPage
- Lists all generated documents
- Edit button for each document
- Preview in modal
- "Publish All" button
- "Save as Drafts" button

## AI Integration

### Scenario Generation Prompt Template
```
Generate 5 distinct ITSM simulation scenarios based on the following criteria:

Selected ITSM Domains: {domains}
Additional Context: {context}
Difficulty Level: {difficulty}/10
Target Duration: {duration} minutes

For each scenario, provide:
1. A compelling title
2. A detailed 2-3 paragraph description of the situation
3. 3-5 specific learning objectives
4. Primary and secondary ITSM domains involved
5. Key challenges participants will face

Ensure scenarios are realistic, engaging, and appropriate for the difficulty level.
Format as JSON array.
```

### Document Generation Prompt Template
```
Generate comprehensive simulation documents for the following ITSM scenario:

Scenario: {scenario_title}
Description: {scenario_description}
Learning Objectives: {learning_objectives}

Teams:
{team_list}

Generate the following documents:

1. INSTRUCTOR PLAYBOOK
- Detailed scenario timeline
- Incident injection plan (when and what to inject)
- Expected participant challenges
- Evaluation criteria
- Answer key with best practices

2. GENERAL BRIEFING
- Scenario background for all participants
- Mission objectives
- Rules of engagement
- Timeline and structure

3. TEAM PACKETS (one for each team)
- Team-specific role and responsibilities
- Available resources
- Success metrics
- Team-specific challenges

Use markdown formatting. Be specific and detailed.
```

## Implementation Phases

### Phase 1: Database & Backend API
- Create new database tables
- Implement scenario generation endpoint
- Implement document generation endpoint
- Add AI service integration

### Phase 2: Frontend UI
- Create AIScenarioGeneratorPage
- Create ScenarioSelector component
- Add link from Instructor Dashboard

### Phase 3: Document Review & Edit
- Integrate generated documents with existing DocumentEditor
- Add batch publish functionality
- Add preview functionality

### Phase 4: Testing & Refinement
- Test with various domain combinations
- Refine AI prompts based on output quality
- Add error handling and loading states

## Success Criteria
- Instructor can generate 5 scenarios in < 30 seconds
- Scenarios are relevant to selected domains
- Generated documents are coherent and usable
- Documents can be edited before publishing
- System handles errors gracefully
