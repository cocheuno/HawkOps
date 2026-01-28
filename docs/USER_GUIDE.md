# HawkOps User Guide & Instruction Manual

**Rise Above the Chaos**

An ITSM Business Simulation for UW-Whitewater

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [ITSM Concepts Overview](#3-itsm-concepts-overview)
4. [Instructor Guide](#4-instructor-guide)
5. [Student Guide](#5-student-guide)
6. [Game Mechanics](#6-game-mechanics)
7. [Scoring & Leaderboards](#7-scoring--leaderboards)
8. [Achievements & Challenges](#8-achievements--challenges)
9. [Troubleshooting](#9-troubleshooting)
10. [Glossary](#10-glossary)

---

## 1. Introduction

### What is HawkOps?

HawkOps is an AI-powered IT Service Management (ITSM) business simulation designed to teach ITIL best practices through hands-on, multiplayer, real-time gameplay. Students work in teams to manage IT incidents, handle change requests, communicate with stakeholders, and maintain service levels under realistic pressure.

### Learning Objectives

By participating in HawkOps, students will learn to:

- Apply ITIL incident management best practices
- Make decisions under time pressure with competing priorities
- Collaborate effectively in cross-functional teams
- Communicate professionally with diverse stakeholders
- Understand the financial impact of IT service disruptions
- Practice root cause analysis and post-incident reviews
- Navigate change management approval workflows
- Balance speed with quality in IT operations

### Key Features

- **AI-Powered Scenarios**: Gemini AI generates realistic, contextual incidents
- **Real-Time Gameplay**: 75-minute sessions with live SLA tracking
- **Team Roles**: Service Desk, Technical Operations, and Management/CAB
- **Gamification**: Achievements, challenges, and competitive leaderboards
- **Comprehensive Analytics**: Detailed performance metrics and AI-generated evaluations

---

## 2. Getting Started

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, or Edge)
- Stable internet connection
- Screen resolution of 1024x768 or higher recommended

### Accessing HawkOps

1. Navigate to the HawkOps application URL provided by your instructor
2. You will see the login page with the HawkOps logo and "Rise Above the Chaos" tagline

### For Instructors

1. Enter your instructor email address
2. Click **"Sign In"**
3. You will be taken to the Instructor Dashboard

### For Students

1. Enter the email address your instructor registered you with
2. Click **"Join Game"**
3. You will be automatically directed to your assigned team's dashboard

---

## 3. ITSM Concepts Overview

HawkOps covers 10 key ITSM domains. Understanding these concepts will help you succeed in the simulation.

### 3.1 Incident Management

An **incident** is an unplanned interruption to an IT service or reduction in quality. The goal is to restore normal service operation as quickly as possible.

**Key Concepts:**
- **Incident Priority**: Critical, High, Medium, Low (determines SLA)
- **Incident Severity**: Technical impact level
- **SLA (Service Level Agreement)**: Maximum time allowed to resolve
- **Escalation**: Moving incidents to higher-level support

### 3.2 Change Management

A **change** is any addition, modification, or removal of anything that could affect IT services. Changes must be approved before implementation.

**Key Concepts:**
- **Change Types**: Standard (pre-approved), Normal (CAB review), Emergency (urgent)
- **CAB (Change Advisory Board)**: Group that reviews and approves changes
- **Risk Assessment**: Evaluating potential negative impacts
- **Rollback Plan**: How to undo a change if it fails

### 3.3 Problem Management

A **problem** is the underlying cause of one or more incidents. Problem management aims to prevent incidents from recurring.

**Key Concepts:**
- **Root Cause Analysis**: Determining why an incident occurred
- **Post-Incident Review (PIR)**: Formal review after major incidents
- **Lessons Learned**: Documentation to prevent future issues

### 3.4 Service Level Management

**Service Level Agreements (SLAs)** define the expected performance levels for IT services.

**Key Concepts:**
- **Response Time**: How quickly a team must acknowledge an incident
- **Resolution Time**: Maximum time to resolve (based on priority)
- **SLA Breach**: Failing to meet the agreed service level

### 3.5 Configuration Management

The **Configuration Management Database (CMDB)** tracks all IT assets and their relationships.

**Key Concepts:**
- **Configuration Item (CI)**: Any component that needs to be managed
- **Service Dependencies**: How services rely on each other
- **Impact Analysis**: Understanding cascading effects

### 3.6 Financial Management

IT services have real costs that must be managed within budget constraints.

**Key Concepts:**
- **Cost Per Incident**: Financial impact of service disruptions
- **Budget Allocation**: Resources available to each team
- **Resource Costs**: Hourly rates for staff and tools

### 3.7 Capacity Management

Ensuring IT resources can meet current and future service demands.

**Key Concepts:**
- **Resource Allocation**: Assigning staff to incidents
- **Workload Balancing**: Distributing work across teams
- **Shift Scheduling**: Managing 24/7 coverage

### 3.8 Availability Management

Ensuring IT services are available when needed.

**Key Concepts:**
- **Service Health**: Operational/Degraded/Down status
- **MTTR (Mean Time To Resolve)**: Average resolution time
- **Service Uptime**: Percentage of time service is available

### 3.9 Knowledge Management

Capturing and sharing information to improve service delivery.

**Key Concepts:**
- **Briefing Documents**: Scenario background and instructions
- **PIR Documentation**: Lessons learned from incidents
- **Best Practices**: Proven approaches to common problems

### 3.10 Service Continuity

Planning for and recovering from major disruptions.

**Key Concepts:**
- **Disaster Recovery**: Restoring services after major failure
- **Business Continuity**: Maintaining operations during disruption
- **Escalation Procedures**: Who to contact during crises

---

## 4. Instructor Guide

This section provides complete instructions for instructors to set up, run, and evaluate HawkOps simulation sessions.

### 4.1 Instructor Home Page

After logging in, you'll see the Instructor Home Page with:

- **AI Provider Display**: Shows current AI (Google Gemini or Anthropic Claude) and model
- **Create New Game** button
- **Your Games** list showing all games you've created

**AI Resilience**: The system includes automatic retry logic for AI operations. If the AI service is temporarily unavailable (rate limiting, network issues), the system will:
- Automatically retry up to 3 times with exponential backoff
- Show user-friendly error messages if all retries fail
- Allow you to retry manually after a brief wait

#### Game Status Indicators

| Status | Color | Meaning |
|--------|-------|---------|
| LOBBY | Blue | Game created but not started |
| ACTIVE | Green | Game is running |
| PAUSED | Yellow | Game temporarily stopped |
| COMPLETED | Gray | Game has ended |

#### Managing Games

For each game, you can:
- **Set Up** (Lobby): Configure and prepare the game
- **Manage** (Active): Monitor and control the running game
- **Resume** (Paused): Continue a paused game
- **View Results** (Completed): Review final scores and evaluations
- **Delete**: Remove a game permanently (not available for active games)

### 4.2 Creating a New Game

1. Click **"Create New Game"**
2. Fill in the game details:
   - **Game Name**: Descriptive name (e.g., "ITSM Simulation - Fall 2026")
   - **Duration**: Game length in minutes (default: 75)
   - **Teams**: Configure 2-3 teams with names and roles

#### Default Team Roles

| Team | Role | Primary Responsibilities |
|------|------|-------------------------|
| Team 1 | Service Desk | First-line support, triage, stakeholder communication |
| Team 2 | Technical Operations | Technical troubleshooting, implementation |
| Team 3 | Management/CAB | Change approval, resource allocation, strategic decisions |

3. Click **"Create Game"** to proceed to the Instructor Dashboard

### 4.3 AI Scenario Generation

Before starting a game, you must generate an AI scenario. This creates the simulation context and learning materials.

#### Step 1: Select ITSM Domains

Navigate to **"1. AI Generate Scenario"** from the dashboard and select which ITSM domains to include:

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

**Tip**: Select 3-5 domains for a focused learning experience.

#### Step 2: Configure Parameters

- **Additional Context** (Optional): Customize the scenario
  - Example: "Healthcare industry, focus on patient data protection, mid-sized hospital"
- **Difficulty Level**: 1-10 scale
  - 1-3: Beginner (longer SLAs, fewer cascading issues)
  - 4-6: Intermediate (standard complexity)
  - 7-8: Advanced (tight SLAs, complex dependencies)
  - 9-10: Expert (high pressure, multiple concurrent crises)
- **Estimated Duration**: 30-180 minutes

#### Step 3: Generate and Select Scenario

1. Click **"Generate 5 AI Scenarios"**
2. Review the 5 generated scenarios, each with:
   - Title and description
   - Learning objectives
   - Key challenges
   - Primary and secondary domains
   - Difficulty rating
3. Click to select the best scenario for your class
4. Click **"Generate Documents & Review"**

#### Generated Documents

The AI creates comprehensive briefing materials:

| Document Type | Visibility | Contents |
|--------------|------------|----------|
| Instructor Playbook | Instructor Only | Facilitation notes, solutions, timing guidance |
| General Briefing | All Participants | Scenario overview, objectives, rules |
| Team Packets | Team-Specific | Role-specific instructions, resources |
| Player Instructions | Individual | Personal objectives, scoring criteria |

### 4.4 Managing Students

Navigate to **"Manage Students"** from the dashboard.

#### Adding Individual Students

1. Click **"Add Student"**
2. Enter student details:
   - First Name (required)
   - Last Name (required)
   - Email (used for login)
   - Student ID (optional)
   - Department (optional)
3. Click **"Add Student"**

#### Bulk Import

1. Click **"Bulk Import"**
2. Enter students in CSV format:
   ```
   John,Doe,john@example.com,STU001,IT
   Jane,Smith,jane@example.com,STU002,HR
   ```
3. Click **"Import"**

#### Assigning Students to Teams

**Method 1: Drag and Drop**
- Drag student cards from "Unassigned Students" to team boxes

**Method 2: Quick Assign**
- Use the "Quick assign..." dropdown at the bottom of each team card

#### Removing Students

- Click the **X** icon next to a student's name in a team card

### 4.5 Document Manager

Navigate to **"Briefing Documents"** from the dashboard.

#### Managing Documents

For each document:
- **View/Edit**: Open document editor
- **Publish/Unpublish**: Control visibility to participants
- **Delete**: Remove document permanently

#### Creating Custom Documents

1. Click **"+ Create Document"**
2. Fill in:
   - Title
   - Document Type (Playbook, Briefing, Team Packet, Instructions)
   - Content (Markdown supported)
   - Visibility setting
   - Required reading checkbox
   - Estimated read time

### 4.6 Starting the Game

Once scenario is generated and students are assigned:

1. Verify all students are in teams
2. Click **"2. Start Game"** (only available after scenario generation)
3. The game will:
   - Initialize all services and dependencies
   - Set up escalation rules
   - Create team resources and budgets
   - Begin the simulation timer

**Important**: Ensure students are logged in before starting!

### 4.7 Running the Game

#### Dashboard Overview

The Instructor Dashboard provides real-time monitoring:

**Header Metrics:**
- Game status and round number
- Difficulty level
- AI model in use

**Quick Stats (5 cards):**
1. **Active Incidents**: Count of open/in-progress incidents
2. **Technical Debt**: Accumulated shortcuts and quick fixes
3. **SLA Status**: Breached/At Risk/OK counts
4. **System Health**: Overall service health percentage
5. **AI Interactions**: Count of AI-powered actions

**Team Cards:**
Each team shows:
- Current score
- Budget remaining
- Morale level (color-coded)
- Link to view team dashboard

#### Injecting AI Incidents

Click **"Inject AI Incident"** to generate a new incident:
- AI considers current game context
- Balances workload across teams
- Includes teaching points for educational value

**Best Practice**: Inject incidents every 5-10 minutes to maintain engagement.

#### Monitoring SLA Compliance

Click **"Check Now"** in the SLA Status card to:
- Detect SLA breaches
- Trigger automatic escalations
- Update team scores

#### Game Controls

| Button | Action | When Available |
|--------|--------|----------------|
| Pause Game | Temporarily stop simulation | Active games |
| Resume Game | Continue from pause | Paused games |
| End Game | Permanently complete | Active or paused |

**Warning**: Ending a game cannot be undone!

### 4.8 Instructor Playbook

Navigate to **"Instructor Playbook"** for facilitation support:

- **Scenario Overview**: Educational context and objectives
- **Team Guidance**: What each role should be doing
- **Incident Progression**: Expected timeline of events
- **Solution Approaches**: How to resolve key incidents
- **Teaching Points**: Discussion topics and learning moments
- **Evaluation Criteria**: How to assess student performance

**Security Warning**: Do not share or display the playbook to students!

**Tip**: Use the **Print** button to create a paper copy for facilitation.

### 4.9 Monitoring Panels

#### Leaderboard Panel
- Real-time team rankings
- Score breakdown by category
- Activity indicators

#### Challenges Panel
- Active challenges with progress
- Completion rates
- Reward point values

#### Escalation Panel
- Current escalation rules
- Active escalations
- Time thresholds

#### Resource Management Panel
- Team resource allocation
- Shift schedules
- Budget utilization

#### Change Request Panel
- Pending change requests
- Approval status
- Implementation tracking

#### Service Dependency Graph
- Visual service map
- Impact cascade visualization
- Status indicators per service

#### Analytics Dashboard
- Performance trends
- Team comparison metrics
- Historical snapshots

### 4.10 Student Evaluations

After ending a game, generate AI-powered evaluations:

1. Click **"Generate Evaluations"** in the Student Evaluations section
2. Wait for AI processing
3. Review evaluations for each student:
   - **Score**: 0-100 rating
   - **Evaluation**: Narrative feedback
   - **Strengths**: What the student did well
   - **Improvements**: Areas for growth
   - **Activity Summary**: Quantitative metrics

**Scoring Interpretation:**
- 80-100: Excellent performance
- 60-79: Satisfactory, room for improvement
- Below 60: Needs significant development

**Tip**: Export analytics for permanent records before game deletion.

### 4.11 Post-Game Activities

#### Reviewing Results

1. Navigate to the completed game
2. Click **"View Results"**
3. Review:
   - Final leaderboard standings
   - SLA compliance rates
   - Incident resolution statistics
   - Team performance comparisons

#### Exporting Data

Use the Analytics Dashboard to export:
- Full game data (JSON)
- Evaluation reports
- Performance metrics

#### Debriefing

Use the Instructor Playbook's discussion prompts for class debriefing:
- What went well?
- What could be improved?
- What ITSM concepts did you apply?
- How does this relate to real-world IT operations?

---

## 5. Student Guide

This section provides complete instructions for students participating in HawkOps.

### 5.1 Joining a Game

1. Navigate to the HawkOps application URL
2. Enter the email address your instructor registered
3. Click **"Join Game"**

**What Happens Next:**

- **If the game is in LOBBY status**: You'll enter the **Waiting Room** where you can:
  - See your team assignment and teammates
  - Mark yourself as "Ready" to let the instructor know you're prepared
  - Review your team role and quick start guide
  - See the ready status of all teams
  - Wait for the instructor to start the game

- **If the game is ACTIVE**: You'll be taken directly to your team's dashboard to start working

- **If the game is PAUSED**: You'll see a paused indicator and can rejoin once the instructor resumes

The Waiting Room is designed to help you prepare before the simulation begins, ensuring everyone understands their role and is ready to go when the instructor starts the game.

### 5.2 Understanding Your Dashboard

#### Header Information
- **Team Name**: Your assigned team
- **Team Role**: Your function (Service Desk, Technical Operations, or Management/CAB)
- **Game Name**: Current simulation
- **Round**: Current round / Total rounds
- **Score**: Your team's current score
- **Budget**: Remaining team budget
- **Morale**: Team morale percentage

#### Tab Navigation
- **Incidents**: Active incidents assigned to your team
- **Implementation Plans**: Solutions you're developing
- **Change Requests**: Changes requiring approval
- **CAB Approvals**: (Management/CAB only) Changes awaiting your review

### 5.3 Incident Management

#### Viewing Incidents

Each incident card shows:
- **Incident Number**: Unique identifier (e.g., INC-001)
- **Title**: Brief description
- **Priority**: Critical (red), High (orange), Medium (yellow), Low (green)
- **Severity**: Technical impact level
- **Status**: Open, In Progress, Resolved, Closed
- **SLA Timer**: Time remaining before breach

#### SLA Timer Colors

| Color | Status | Action Needed |
|-------|--------|--------------|
| Green | Plenty of time (>15 min) | Work at normal pace |
| Yellow | Warning (5-15 min) | Prioritize this incident |
| Red | Critical (<5 min) | Immediate attention required |
| Flashing Red | BREACHED | Escalate immediately |

#### Working on Incidents

1. **Click an incident** to view full details
2. Click **"Start Work"** to change status to "In Progress"
3. Investigate the issue using the information provided
4. Create an Implementation Plan (see Section 5.4)
5. Click **"Resolve"** when the issue is fixed
6. Complete the Post-Incident Review

#### AI Teaching Points

AI-generated incidents include teaching points - educational insights about the scenario. Use these to understand the ITSM concepts being demonstrated.

### 5.4 Implementation Plans

Implementation Plans document your approach to resolving incidents.

#### Creating a Plan

1. Go to the **Implementation Plans** tab
2. Click **"New Plan"**
3. Fill in the required fields:

| Field | Description |
|-------|-------------|
| Title | Brief name of the fix |
| Description | Overall approach |
| Linked Incident | Associated incident (optional) |
| Root Cause Analysis | Why this issue occurred |
| Implementation Steps | Numbered action items |
| Estimated Effort | Hours required |
| Risk Level | Low, Medium, High, Critical |
| Risk Mitigation | How to minimize risks |
| Rollback Plan | How to undo changes if needed |

4. Click **"Save Draft"**

#### AI Evaluation

1. Click **"Submit for AI Review"**
2. Wait for AI evaluation
3. Review your score (0-100):
   - **70+**: Approved - ready for implementation
   - **50-69**: Needs Revision - improve and resubmit
   - **<50**: Rejected - significant rework needed

4. Read AI feedback:
   - Overall assessment
   - Strengths identified
   - Suggested improvements
   - Critical issues to address

#### Converting to Change Request

Plans scoring 50+ can be converted to Change Requests:
1. Click **"Create Change Request"**
2. The plan details transfer to a new Change Request
3. Submit for CAB approval

### 5.5 Change Requests

#### Creating a Change Request

1. Go to the **Change Requests** tab
2. Click **"New Change Request"**
3. Fill in:
   - Title
   - Change Type (Standard, Normal, Emergency)
   - Risk Level
   - Description
   - Implementation Plan
   - Rollback Plan
   - Test Plan

4. Click **"Submit"**

#### Change Request Status

| Status | Meaning | Next Step |
|--------|---------|-----------|
| Pending | Awaiting CAB review | Wait for review |
| Under Review | Technical team reviewing | May receive questions |
| Review Complete | Technical review done | Awaiting CAB decision |
| Approved | Ready to implement | Begin implementation |
| Rejected | Not approved | Review feedback, revise |
| In Progress | Being implemented | Complete work |
| Completed | Successfully done | Document results |
| Failed | Implementation failed | Execute rollback |
| Rolled Back | Changes reverted | Investigate and retry |

### 5.6 CAB Workflow (Management/CAB Teams)

If you're on the Management/CAB team, you review and approve changes.

#### Reviewing Changes

1. Go to the **CAB Approvals** tab
2. View pending change requests
3. For each request, you can:
   - **Edit**: Modify details
   - **Send for Technical Review**: Request expert assessment
   - **Approve**: Accept the change
   - **Reject**: Decline with reason

#### Sending for Technical Review

1. Click **"Send for Technical Review"**
2. Select which team should review
3. Add notes about focus areas
4. Wait for technical recommendation

#### Making Decisions

After technical review:
1. Review the technical team's recommendation
2. Consider risks and benefits
3. Click **"Approve"** or **"Reject"**
4. Add decision notes

### 5.7 Technical Review (Non-CAB Teams)

If CAB sends a change request to your team for review:

1. Review the change details
2. Assess technical feasibility
3. Submit recommendation:
   - **Recommend Approval**: Technically sound
   - **Recommend Rejection**: Technical issues found
   - **Needs Rework**: Modifications required
4. Add detailed review notes

### 5.8 Post-Incident Reviews (PIR)

PIRs are required after resolving significant incidents.

#### Completing a PIR

1. When prompted, click **"Complete PIR"**
2. Fill in each section:

| Section | What to Include |
|---------|----------------|
| What Happened | Timeline of events from detection to resolution |
| Root Cause Analysis | Why this incident occurred |
| What Went Well | Positive aspects of the response |
| What Could Improve | Areas for better performance |
| Lessons Learned | Key takeaways and prevention strategies |
| Action Items | Specific follow-up tasks with owners and due dates |

3. Click **"Save Draft"** to save progress
4. Click **"Submit for Grading"** when complete

#### PIR Scoring

AI evaluates your PIR on:
- Completeness of analysis
- Quality of root cause identification
- Actionability of lessons learned
- Specificity of action items

### 5.9 Stakeholder Communications

You may receive messages from stakeholders requiring professional responses.

#### Stakeholder Types

| Icon | Type | Focus |
|------|------|-------|
| Tie | Executive | Business impact, strategic concerns |
| Building | Customer | Service impact, satisfaction |
| Newspaper | Media | Public relations, reputation |
| Scales | Regulator | Compliance, legal requirements |
| Handshake | Vendor | Third-party coordination |

#### Response Best Practices

1. **Read carefully**: Understand the stakeholder's concern
2. **Be professional**: Use appropriate tone and language
3. **Be specific**: Address their exact questions
4. **Show empathy**: Acknowledge their situation
5. **Provide updates**: Include timeline and next steps

#### Response Scoring

AI evaluates responses on:
- Professionalism and tone
- Completeness of information
- Appropriate stakeholder handling
- Clarity and actionability

### 5.10 Team-Specific Responsibilities

#### Service Desk Team

**Primary Duties:**
- First response to all incidents
- Initial triage and categorization
- Information gathering
- Stakeholder communication
- Escalation to Technical Operations when needed

**Success Metrics:**
- Fast first response time (<2 minutes)
- High first-call resolution rate
- Quality stakeholder communications
- Accurate incident categorization

**Tips:**
- Respond quickly - first responder achievements await!
- Gather complete information before escalating
- Maintain professional communication always
- Don't hold onto incidents beyond your expertise

#### Technical Operations Team

**Primary Duties:**
- Technical troubleshooting and diagnosis
- Implementation of solutions
- System changes and updates
- Service restoration
- Technical reviews for CAB

**Success Metrics:**
- Fast resolution times
- Low rework rate
- Quality implementation plans
- Thorough root cause analysis

**Tips:**
- Create detailed implementation plans
- Document everything for PIRs
- Consider dependencies and impacts
- Manage technical debt proactively

#### Management/CAB Team

**Primary Duties:**
- Change approval and governance
- Resource allocation decisions
- Budget management
- Strategic incident escalation handling
- Team coordination

**Success Metrics:**
- Timely change decisions
- Effective resource allocation
- Budget management
- Strategic oversight

**Tips:**
- Review changes thoroughly before approving
- Monitor team morale and budget
- Request technical reviews for complex changes
- Balance speed with risk management

### 5.11 Using the Leaderboard

The Live Leaderboard shows:
- Team rankings by score
- Trend indicators (improving/declining)
- Detailed metrics per team
- Recent achievements

**Leaderboard Metrics:**
- Overall Score
- Incidents Resolved
- Average Resolution Time
- SLA Compliance %
- Stakeholder Satisfaction
- PIR Quality Score
- Achievement Points

### 5.12 Monitoring Service Health

The Service Health Dashboard shows:
- **Total Services**: All monitored services
- **Operational** (Green): Running normally
- **Degraded** (Yellow): Reduced performance
- **Down** (Red): Offline or critical

Understanding service dependencies helps prioritize incidents - fixing a core service may restore multiple dependent services.

---

## 6. Game Mechanics

### 6.1 Game Structure

**Default Duration**: 75 minutes (configurable)

**Rounds**: Games are divided into rounds (typically 4)
- Each round: ~18 minutes
- Scores snapshot between rounds
- New incidents inject throughout

**Game States:**
1. **Lobby**: Setup phase, students join
2. **Active**: Simulation running
3. **Paused**: Temporarily stopped
4. **Completed**: Game ended

### 6.2 SLA System

#### Duration-Aware SLA Scaling

HawkOps automatically adjusts SLA targets based on your game duration. This ensures a realistic experience whether you're running a 30-minute demo or a full 75-minute session.

**How It Works:**
- SLA times are calculated as a percentage of game duration
- Minimum and maximum caps ensure targets remain realistic
- Escalation thresholds scale proportionally
- Challenge windows adjust to fit available time

#### SLA Targets by Priority

| Priority | Typical SLA (75 min game) | % of Game Duration |
|----------|---------------------------|-------------------|
| Critical | 15 min | 20% (min: 8, max: 25 min) |
| High | 26 min | 35% (min: 12, max: 40 min) |
| Medium | 41 min | 55% (min: 20, max: 55 min) |
| Low | 60 min | 80% (min: 30, max: 75 min) |

**At-Risk Warning**: Incidents become "At Risk" when only 25% of SLA time remains.

#### SLA Breach Consequences

When an SLA is breached:
1. Incident priority automatically escalates
2. Team morale decreases (-5 points)
3. Breach logged to timeline
4. Management notified
5. May affect team score

### 6.3 Budget System

**Initial Budget**: $100,000 per team

**Costs:**
- **Incident costs**: Accumulate per minute based on severity
  - Critical: ~$50/minute
  - High: ~$30/minute
  - Medium: ~$15/minute
  - Low: ~$5/minute
- **Resource costs**: Staff allocation at hourly rates
- **Change costs**: Implementation expenses

**Budget Impact:**
- Teams cannot allocate resources they can't afford
- Overspending affects morale and score
- Management can reallocate budget between teams

### 6.4 Morale System

**Initial Morale**: 75% per team

**Morale Changes:**

| Event | Impact |
|-------|--------|
| SLA breach | -5% |
| Escalation | -2 to -3% |
| Incident resolved | +2% |
| Achievement earned | +5% |
| Challenge completed | +10% |
| Budget exceeded | -10% |

**Morale Effects:**

| Level | Effect |
|-------|--------|
| 75%+ | +10% efficiency |
| 40-75% | Normal performance |
| Below 40% | -20% efficiency, more errors |

### 6.5 Technical Debt

**What is Technical Debt?**
Quick fixes and shortcuts that create future problems.

**Sources:**
- Quick-fix resolutions: 5-10 points
- Skipped documentation: 5 points
- Temporary patches: 10-15 points

**Impact of High Debt (>100 points):**
- 20% longer resolution times
- Decreased reliability
- Higher cascading failure risk
- Morale penalty

### 6.6 Service Health

**Service States:**
- **Operational**: Fully functional
- **Degraded**: Partial issues (50% weight)
- **Down**: Complete outage (0% weight)

**Health Score Calculation:**
```
Health = (Weighted Operational Capacity / Total Weighted Capacity) x 100
```

Weight = Service Criticality (1-10)

**Service Dependencies:**
- Hard dependency: If dependency down, service goes down
- Soft dependency: If dependency down, service degrades
- Cascading failures tracked and visualized

### 6.7 Escalation System

**Automatic Escalation Triggers:**

| Priority | Level 1 | Level 2 | Level 3 |
|----------|---------|---------|---------|
| Critical | 15 min | 30 min | 45 min |
| High | 30 min | 60 min | 120 min |
| Medium | 60 min | 120 min | 240 min |

**Escalation Consequences:**
- Priority bump
- Management notification
- Team penalty points
- Morale decrease

### 6.8 Resource Management

**Team Resources:**
- Total staff capacity
- Skill levels
- Shift schedules (efficiency varies by shift)
- Concurrent incident limits

**Fatigue System:**
- Fresh (0-39%): High energy
- Moderate (40-59%): Normal
- Tired (60-79%): Reduced efficiency
- Exhausted (80-100%): Significant penalties

---

## 7. Scoring & Leaderboards

### 7.1 Point System

**Base Points:**
- Resolved incident: 100 points

**Bonuses:**
- Achievement completion: 50-500 points
- Challenge completion: 250-500 points
- Fast resolution: Bonus multiplier
- Quality PIRs: Bonus points

**Penalties:**
- First escalation: -25 points
- Second escalation: -50 points
- Third escalation: -75 points

### 7.2 Composite Score Calculation

The leaderboard uses weighted scoring:

| Component | Weight |
|-----------|--------|
| SLA Compliance | 25% |
| Average Resolution Time | 20% |
| Stakeholder Satisfaction | 20% |
| PIR Quality Score | 20% |
| Achievement Points | 15% |

### 7.3 Leaderboard Features

- **Real-time updates**: Refreshes every 10 seconds
- **Trend indicators**: Up/down/stable arrows
- **Detailed metrics**: Expandable team statistics
- **Activity feed**: Recent accomplishments
- **Round snapshots**: Historical comparison

---

## 8. Achievements & Challenges

### 8.1 Achievement Categories

#### Speed Achievements
- **First Responder** (50 pts): Respond within 2 minutes
- **Speed Demon** (150 pts): 3 incidents under 10 min each
- **SLA Champion** (200 pts): 5 incidents with zero breaches

#### Quality Achievements
- **Root Cause Master** (200 pts): PIR score 90+
- **Zero Rework** (100 pts): 3 incidents without reopening
- **Documentation Hero** (150 pts): 5 complete PIRs

#### Teamwork Achievements
- **Helping Hand** (100 pts): Cross-team collaboration
- **Communication Pro** (150 pts): 5 high-score responses
- **Bridge Builder** (250 pts): 3 major coordinations

#### Leadership Achievements
- **Crisis Manager** (300 pts): Critical incident without escalation
- **Calm Under Pressure** (200 pts): Handle 3+ concurrent incidents
- **Mentor** (150 pts): Share lessons that help others

#### Learning Achievements
- **Continuous Learner** (100 pts): 100% PIR completion rate
- **Improvement Mindset** (150 pts): Create 10 action items
- **Knowledge Seeker** (75 pts): Review briefings before first incident

#### Special Achievements
- **Perfect Round** (500 pts): 100% SLA + no budget overruns
- **Comeback Kid** (300 pts): Last place to top 3 in one round
- **Early Bird** (50 pts): First to respond to incident

### 8.2 Achievement Rarity

| Rarity | Color | Point Bonus |
|--------|-------|-------------|
| Common | Gray | Standard |
| Uncommon | Green | +25% |
| Rare | Blue | +50% |
| Epic | Purple | +75% |
| Legendary | Gold | +100% |

### 8.3 Challenges

Challenges are time-limited opportunities for bonus points.

**Challenge Types:**
- **Speed Challenges**: Resolve quickly
- **Quality Challenges**: High PIR scores
- **Communication Challenges**: Stakeholder satisfaction
- **Efficiency Challenges**: Budget management
- **Collaboration Challenges**: Team coordination

**Challenge Mechanics:**
- Appear every 15-20 minutes
- 30-180 minute completion windows
- 250-500 point rewards
- Progress tracked in real-time

---

## 9. Troubleshooting

### 9.1 Common Issues

#### Can't Log In

**Symptom**: "Could not find your game assignment"

**Solutions:**
1. Verify email matches what instructor registered
2. Ask instructor to add you to a team
3. Check if game has started (students can only join active games)

#### Dashboard Not Loading

**Symptom**: Page loads but shows "Loading..."

**Solutions:**
1. Refresh the browser
2. Clear browser cache
3. Check internet connection
4. Try a different browser

#### Incidents Not Updating

**Symptom**: Status changes not reflected

**Solutions:**
1. Wait 5-10 seconds (automatic refresh)
2. Manually refresh the page
3. Check internet connection

#### SLA Timer Incorrect

**Symptom**: Timer shows wrong time

**Solutions:**
1. Check your device's clock
2. Refresh the page
3. Report to instructor if persists

### 9.2 Instructor Issues

#### Service Health Not Showing

**Solution**: Click "Initialize Services" button

#### AI Incident Injection Fails

**Solutions:**
1. Verify game status is "Active"
2. Check AI provider configuration
3. Wait 30 seconds and retry

#### Students Can't Join

**Solutions:**
1. Verify game status is "Lobby" or "Active" (students can join in either state)
2. Confirm student email is registered
3. Check student is assigned to a team
4. If game is in "Lobby", students will see a Waiting Room until the instructor starts the game

### 9.3 Getting Help

If issues persist:
1. Contact your instructor
2. Report issues at: https://github.com/cocheuno/HawkOps/issues
3. Check system status with IT support

---

## 10. Glossary

| Term | Definition |
|------|------------|
| **CAB** | Change Advisory Board - group that reviews and approves changes |
| **CI** | Configuration Item - any component that needs to be managed |
| **CMDB** | Configuration Management Database - tracks all IT assets |
| **Escalation** | Moving an incident to higher-level support |
| **Incident** | Unplanned interruption to an IT service |
| **ITIL** | IT Infrastructure Library - best practice framework |
| **ITSM** | IT Service Management |
| **MTTR** | Mean Time To Resolve - average resolution time |
| **PIR** | Post-Incident Review - formal review after incidents |
| **Priority** | Urgency of incident resolution (Critical/High/Medium/Low) |
| **Problem** | Root cause of one or more incidents |
| **RTO** | Recovery Time Objective - target time to restore service |
| **Severity** | Technical impact level of an incident |
| **SLA** | Service Level Agreement - performance targets |
| **Technical Debt** | Future work created by quick-fix solutions |

---

## Quick Reference Cards

### Instructor Quick Reference

| Task | Location | Steps |
|------|----------|-------|
| Create Game | Home Page | Click "Create New Game" |
| Generate Scenario | Dashboard | Click "1. AI Generate Scenario" |
| Add Students | Dashboard | Click "Manage Students" |
| Start Game | Dashboard | Click "2. Start Game" |
| Inject Incident | Dashboard | Click "Inject AI Incident" |
| Pause Game | Dashboard | Click "Pause Game" |
| End Game | Dashboard | Click "End Game" |
| Generate Evaluations | Dashboard | Click "Generate Evaluations" |
| Delete Game | Home Page | Click "Delete" on game card |

### Student Quick Reference

| Task | Location | Steps |
|------|----------|-------|
| View Incidents | Dashboard | Click "Incidents" tab |
| Start Work | Incident Detail | Click "Start Work" |
| Resolve Incident | Incident Detail | Click "Resolve" |
| Create Plan | Plans Tab | Click "New Plan" |
| Submit for Review | Plan Detail | Click "Submit for AI Review" |
| Create Change | Plans/Changes Tab | Click "Create Change Request" |
| Complete PIR | After Resolution | Fill all sections, click "Submit" |
| View Leaderboard | Dashboard | Scroll to Leaderboard section |

---

## Version Information

**HawkOps Version**: 1.0
**Documentation Version**: 1.0
**Last Updated**: January 2026
**AI Provider**: Google Gemini (gemini-2.5-flash-lite)

---

*HawkOps - Rise Above the Chaos*
*An ITSM Business Simulation for UW-Whitewater*
