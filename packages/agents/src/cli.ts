#!/usr/bin/env node

import { Command } from 'commander';
import { AgentManager, AgentRole } from './AgentManager.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('hawkops-agent')
  .description('HawkOps AI Agent - Autonomous IT Operations team member')
  .version('1.0.0');

program
  .command('run')
  .description('Run an AI agent for a HawkOps game')
  .requiredOption('-g, --game-id <id>', 'Game ID to join')
  .requiredOption('-t, --team-id <id>', 'Team ID to join')
  .requiredOption('-p, --player-id <id>', 'Player ID for the agent')
  .requiredOption('-a, --access-token <token>', 'Access token for authentication')
  .option('-u, --api-url <url>', 'API base URL', 'http://localhost:3000/api')
  .option('-r, --role <role>', 'Agent role: service_desk, tech_ops, management, full_team', 'full_team')
  .option('--personality <type>', 'Agent personality: cautious, balanced, aggressive', 'balanced')
  .option('--poll-interval <ms>', 'Polling interval in milliseconds', '5000')
  .option('--decision-delay <ms>', 'Decision delay in milliseconds', '3000')
  .option('-v, --verbose', 'Enable verbose logging', true)
  .option('-q, --quiet', 'Disable verbose logging')
  .action(async (options) => {
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      console.error('Error: GEMINI_API_KEY environment variable is required');
      console.error('Set it in your .env file or export it: export GEMINI_API_KEY=your_key');
      process.exit(1);
    }

    // Parse role(s)
    const roles = options.role.split(',').map((r: string) => r.trim()) as AgentRole[];

    // Validate roles
    const validRoles = ['service_desk', 'tech_ops', 'management', 'full_team'];
    for (const role of roles) {
      if (!validRoles.includes(role)) {
        console.error(`Error: Invalid role '${role}'. Valid roles: ${validRoles.join(', ')}`);
        process.exit(1);
      }
    }

    // Validate personality
    const validPersonalities = ['cautious', 'balanced', 'aggressive'];
    if (!validPersonalities.includes(options.personality)) {
      console.error(`Error: Invalid personality. Valid: ${validPersonalities.join(', ')}`);
      process.exit(1);
    }

    const manager = new AgentManager({
      gameId: options.gameId,
      teamId: options.teamId,
      playerId: options.playerId,
      accessToken: options.accessToken,
      apiBaseUrl: options.apiUrl,
      geminiApiKey,
      roles,
      personality: options.personality,
      pollIntervalMs: parseInt(options.pollInterval, 10),
      decisionDelayMs: parseInt(options.decisionDelay, 10),
      verbose: !options.quiet && options.verbose
    });

    // Handle graceful shutdown
    const shutdown = () => {
      console.log('\nShutting down agents...');
      manager.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                   HawkOps AI Agent System                     ║
╠═══════════════════════════════════════════════════════════════╣
║  Game ID:     ${options.gameId.padEnd(45)} ║
║  Team ID:     ${options.teamId.padEnd(45)} ║
║  Role(s):     ${roles.join(', ').padEnd(45)} ║
║  Personality: ${options.personality.padEnd(45)} ║
╚═══════════════════════════════════════════════════════════════╝
`);

    try {
      await manager.start();
    } catch (error) {
      console.error('Agent error:', error);
      process.exit(1);
    }
  });

program
  .command('demo')
  .description('Run a demo agent with test credentials (for development)')
  .option('-u, --api-url <url>', 'API base URL', 'http://localhost:3000/api')
  .option('-r, --role <role>', 'Agent role', 'full_team')
  .option('--personality <type>', 'Agent personality', 'balanced')
  .action(async (options) => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║               HawkOps Agent Demo Mode                         ║
╠═══════════════════════════════════════════════════════════════╣
║  This demo requires:                                          ║
║  1. A running HawkOps backend at ${options.apiUrl.padEnd(24)} ║
║  2. GEMINI_API_KEY environment variable set                   ║
║  3. A test game with credentials                              ║
╚═══════════════════════════════════════════════════════════════╝

To run an agent, use:

  hawkops-agent run \\
    --game-id <your-game-id> \\
    --team-id <your-team-id> \\
    --player-id <your-player-id> \\
    --access-token <your-token> \\
    --role ${options.role} \\
    --personality ${options.personality}

Or set these via environment variables:
  HAWKOPS_GAME_ID, HAWKOPS_TEAM_ID, HAWKOPS_PLAYER_ID, HAWKOPS_ACCESS_TOKEN
`);
  });

program
  .command('info')
  .description('Display information about agent roles and personalities')
  .action(() => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                 HawkOps Agent Roles & Personalities           ║
╚═══════════════════════════════════════════════════════════════╝

ROLES:
------
service_desk  - First-line support, triage, escalation
                Handles: Password resets, access issues, L1 tickets
                Escalates: Server issues, security, outages

tech_ops      - Technical investigation and resolution
                Handles: Root cause analysis, implementation plans
                Creates: Change requests, technical documentation

management    - Change Advisory Board (CAB) oversight
                Handles: Change approvals, risk assessment
                Reviews: Implementation plans, emergency changes

full_team     - All three roles working together
                Best for: Demos, testing, hands-free operation

PERSONALITIES:
--------------
cautious      - Conservative decision making
                • More likely to escalate
                • Requires thorough documentation for approvals
                • Avoids quick fixes

balanced      - Standard ITSM practices (default)
                • Follows best practices
                • Reasonable risk tolerance
                • Balanced escalation threshold

aggressive    - Fast-paced decision making
                • Quick resolutions for SLA breaches
                • More willing to approve changes
                • Handles more at L1 level

USAGE EXAMPLES:
---------------
# Run a cautious service desk agent
hawkops-agent run -g GAME_ID -t TEAM_ID -p PLAYER_ID -a TOKEN \\
  --role service_desk --personality cautious

# Run a full aggressive team
hawkops-agent run -g GAME_ID -t TEAM_ID -p PLAYER_ID -a TOKEN \\
  --role full_team --personality aggressive

# Run tech_ops and management together
hawkops-agent run -g GAME_ID -t TEAM_ID -p PLAYER_ID -a TOKEN \\
  --role tech_ops,management
`);
  });

program.parse();
