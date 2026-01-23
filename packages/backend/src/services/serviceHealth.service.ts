import { Pool } from 'pg';
import logger from '../utils/logger';

interface ServiceStatus {
  id: string;
  name: string;
  type: string;
  status: 'operational' | 'degraded' | 'down';
  criticality: number;
  description: string | null;
  activeIncidents: number;
}

interface ServiceHealthSummary {
  total: number;
  operational: number;
  degraded: number;
  down: number;
  healthScore: number;
  services: ServiceStatus[];
}

/**
 * Service Health Service
 * Manages configuration items (services) and their health status
 */
export class ServiceHealthService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get all services with their current status and active incident count
   */
  async getServiceHealth(gameId: string): Promise<ServiceHealthSummary> {
    try {
      // Get all configuration items with incident counts using enhanced keyword matching
      const result = await this.pool.query(
        `SELECT
           ci.id,
           ci.name,
           ci.type,
           ci.status,
           ci.criticality,
           ci.description,
           COUNT(DISTINCT i.id) FILTER (
             WHERE i.status NOT IN ('resolved', 'closed')
             AND (
               i.affected_ci_id = ci.id
               OR i.ai_context->>'affectedService' ILIKE '%' || ci.name || '%'
               OR ci.name ILIKE '%' || COALESCE(i.ai_context->>'affectedService', '') || '%'
               -- Keyword matching for Database/DB
               OR (LOWER(ci.name) LIKE '%database%' AND (
                 LOWER(COALESCE(i.ai_context->>'affectedService', '')) LIKE '%db%'
                 OR LOWER(COALESCE(i.ai_context->>'affectedService', '')) LIKE '%database%'
                 OR LOWER(i.title) LIKE '%db%' OR LOWER(i.title) LIKE '%database%'
               ))
               -- Keyword matching for Auth
               OR (LOWER(ci.name) LIKE '%authentication%' AND (
                 LOWER(COALESCE(i.ai_context->>'affectedService', '')) LIKE '%auth%'
                 OR LOWER(i.title) LIKE '%auth%' OR LOWER(i.title) LIKE '%login%'
               ))
               -- Title/description matching
               OR i.title ILIKE '%' || ci.name || '%'
               OR i.description ILIKE '%' || ci.name || '%'
             )
           ) as active_incidents
         FROM configuration_items ci
         LEFT JOIN incidents i ON i.game_id = ci.game_id
         WHERE ci.game_id = $1
         GROUP BY ci.id, ci.name, ci.type, ci.status, ci.criticality, ci.description
         ORDER BY
           CASE ci.status
             WHEN 'down' THEN 1
             WHEN 'degraded' THEN 2
             ELSE 3
           END,
           ci.criticality DESC,
           ci.name`,
        [gameId]
      );

      const services: ServiceStatus[] = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        status: row.status as 'operational' | 'degraded' | 'down',
        criticality: row.criticality,
        description: row.description,
        activeIncidents: parseInt(row.active_incidents) || 0,
      }));

      // Calculate summary
      const operational = services.filter(s => s.status === 'operational').length;
      const degraded = services.filter(s => s.status === 'degraded').length;
      const down = services.filter(s => s.status === 'down').length;

      // Calculate health score (weighted by criticality)
      let totalCriticality = 0;
      let healthyWeight = 0;

      services.forEach(service => {
        totalCriticality += service.criticality;
        if (service.status === 'operational') {
          healthyWeight += service.criticality;
        } else if (service.status === 'degraded') {
          healthyWeight += service.criticality * 0.5;
        }
      });

      const healthScore = totalCriticality > 0
        ? Math.round((healthyWeight / totalCriticality) * 100)
        : 100;

      return {
        total: services.length,
        operational,
        degraded,
        down,
        healthScore,
        services,
      };
    } catch (error) {
      logger.error('Error getting service health:', error);
      throw error;
    }
  }

  /**
   * Update service status based on active incidents
   * This should be called when incidents are created, updated, or resolved
   */
  async updateServiceStatuses(gameId: string): Promise<void> {
    try {
      // Get all services with their active incident counts and severities
      // Uses flexible matching with multiple strategies:
      // 1. Direct affected_ci_id link
      // 2. Full name matching (bidirectional LIKE)
      // 3. Keyword matching for common abbreviations (DB = Database, Auth = Authentication, etc.)
      // 4. Title/description containing service name
      const servicesResult = await this.pool.query(
        `SELECT
           ci.id,
           ci.name,
           ci.status as current_status,
           COUNT(i.id) FILTER (WHERE i.status NOT IN ('resolved', 'closed')) as incident_count,
           MAX(CASE i.severity
             WHEN 'critical' THEN 4
             WHEN 'high' THEN 3
             WHEN 'medium' THEN 2
             WHEN 'low' THEN 1
             ELSE 0
           END) FILTER (WHERE i.status NOT IN ('resolved', 'closed')) as max_severity
         FROM configuration_items ci
         LEFT JOIN incidents i ON (
           i.game_id = ci.game_id
           AND (
             -- Direct CI link
             i.affected_ci_id = ci.id
             -- Bidirectional text matching on affectedService
             OR LOWER(i.ai_context->>'affectedService') LIKE '%' || LOWER(ci.name) || '%'
             OR LOWER(ci.name) LIKE '%' || LOWER(COALESCE(i.ai_context->>'affectedService', '')) || '%'
             -- Keyword matching for Database/DB
             OR (LOWER(ci.name) LIKE '%database%' AND (
               LOWER(COALESCE(i.ai_context->>'affectedService', '')) LIKE '%db%'
               OR LOWER(COALESCE(i.ai_context->>'affectedService', '')) LIKE '%database%'
               OR LOWER(i.title) LIKE '%db%'
               OR LOWER(i.title) LIKE '%database%'
               OR LOWER(i.description) LIKE '%database%'
             ))
             -- Keyword matching for Authentication/Auth
             OR (LOWER(ci.name) LIKE '%authentication%' AND (
               LOWER(COALESCE(i.ai_context->>'affectedService', '')) LIKE '%auth%'
               OR LOWER(i.title) LIKE '%auth%'
               OR LOWER(i.title) LIKE '%login%'
               OR LOWER(i.description) LIKE '%authentication%'
             ))
             -- Keyword matching for API/Gateway
             OR (LOWER(ci.name) LIKE '%api%' OR LOWER(ci.name) LIKE '%gateway%') AND (
               LOWER(COALESCE(i.ai_context->>'affectedService', '')) LIKE '%api%'
               OR LOWER(i.title) LIKE '%api%'
               OR LOWER(i.description) LIKE '%api%'
             )
             -- Keyword matching for Web Application
             OR (LOWER(ci.name) LIKE '%web%' AND (
               LOWER(COALESCE(i.ai_context->>'affectedService', '')) LIKE '%web%'
               OR LOWER(COALESCE(i.ai_context->>'affectedService', '')) LIKE '%website%'
               OR LOWER(i.title) LIKE '%web%'
             ))
             -- Title/description containing service name
             OR LOWER(i.title) LIKE '%' || LOWER(ci.name) || '%'
             OR LOWER(i.description) LIKE '%' || LOWER(ci.name) || '%'
           )
         )
         WHERE ci.game_id = $1
         GROUP BY ci.id, ci.name, ci.status`,
        [gameId]
      );

      // Update each service's status based on incidents
      for (const service of servicesResult.rows) {
        const incidentCount = parseInt(service.incident_count) || 0;
        const maxSeverity = parseInt(service.max_severity) || 0;

        let newStatus = 'operational';

        if (incidentCount > 0) {
          if (maxSeverity >= 4) { // critical
            newStatus = 'down';
          } else if (maxSeverity >= 3 || incidentCount >= 3) { // high or multiple incidents
            newStatus = 'degraded';
          } else if (maxSeverity >= 2 || incidentCount >= 2) { // medium or multiple
            newStatus = 'degraded';
          }
          // low severity single incident keeps operational
        }

        // Only update if status changed
        if (service.current_status !== newStatus) {
          await this.pool.query(
            `UPDATE configuration_items
             SET status = $1, updated_at = NOW()
             WHERE id = $2`,
            [newStatus, service.id]
          );

          // Log status change event
          await this.pool.query(
            `INSERT INTO game_events
             (game_id, event_type, event_category, severity, event_data, actor_type)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              gameId,
              'service_status_changed',
              'infrastructure',
              newStatus === 'down' ? 'critical' : newStatus === 'degraded' ? 'warning' : 'info',
              JSON.stringify({
                serviceId: service.id,
                serviceName: service.name,
                previousStatus: service.current_status,
                newStatus,
                activeIncidents: incidentCount,
              }),
              'system',
            ]
          );

          logger.info(`Service ${service.name} status changed: ${service.current_status} → ${newStatus}`);
        }
      }
    } catch (error) {
      logger.error('Error updating service statuses:', error);
      throw error;
    }
  }

  /**
   * Initialize default services for a game based on scenario
   */
  async initializeServicesForGame(gameId: string, scenarioType: string): Promise<void> {
    try {
      // Check if services already exist
      const existingCheck = await this.pool.query(
        'SELECT COUNT(*) FROM configuration_items WHERE game_id = $1',
        [gameId]
      );

      if (parseInt(existingCheck.rows[0].count) > 0) {
        logger.info(`Services already exist for game ${gameId}, skipping initialization`);
        return;
      }

      // Default services based on scenario type
      const defaultServices = this.getDefaultServicesForScenario(scenarioType);

      for (const service of defaultServices) {
        await this.pool.query(
          `INSERT INTO configuration_items
           (game_id, name, type, status, criticality, description)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [gameId, service.name, service.type, 'operational', service.criticality, service.description]
        );
      }

      logger.info(`Initialized ${defaultServices.length} services for game ${gameId} (scenario: ${scenarioType})`);
    } catch (error) {
      logger.error('Error initializing services:', error);
      throw error;
    }
  }

  /**
   * Get default services for a scenario type
   */
  private getDefaultServicesForScenario(scenarioType: string): Array<{
    name: string;
    type: string;
    criticality: number;
    description: string;
  }> {
    const baseServices = [
      { name: 'Authentication Service', type: 'service', criticality: 10, description: 'User authentication and authorization' },
      { name: 'Primary Database', type: 'database', criticality: 10, description: 'Main application database' },
      { name: 'Web Application', type: 'application', criticality: 9, description: 'Customer-facing web application' },
      { name: 'API Gateway', type: 'service', criticality: 9, description: 'Central API routing and management' },
      { name: 'Email Service', type: 'service', criticality: 6, description: 'Email notification system' },
      { name: 'Backup System', type: 'server', criticality: 7, description: 'Data backup and recovery' },
      { name: 'Monitoring Service', type: 'service', criticality: 7, description: 'System monitoring and alerting' },
      { name: 'CDN', type: 'network', criticality: 5, description: 'Content delivery network' },
    ];

    // Add scenario-specific services
    if (scenarioType.toLowerCase().includes('healthcare')) {
      return [
        ...baseServices,
        { name: 'Patient Records System', type: 'application', criticality: 10, description: 'Electronic health records' },
        { name: 'Medical Imaging Server', type: 'server', criticality: 8, description: 'DICOM imaging storage' },
        { name: 'Pharmacy System', type: 'application', criticality: 8, description: 'Prescription management' },
        { name: 'Lab Results Service', type: 'service', criticality: 8, description: 'Laboratory information system' },
      ];
    }

    if (scenarioType.toLowerCase().includes('finance') || scenarioType.toLowerCase().includes('bank')) {
      return [
        ...baseServices,
        { name: 'Transaction Processing', type: 'service', criticality: 10, description: 'Core banking transactions' },
        { name: 'Payment Gateway', type: 'service', criticality: 10, description: 'Payment processing system' },
        { name: 'Fraud Detection', type: 'service', criticality: 9, description: 'Real-time fraud monitoring' },
        { name: 'Customer Portal', type: 'application', criticality: 8, description: 'Online banking interface' },
      ];
    }

    if (scenarioType.toLowerCase().includes('retail') || scenarioType.toLowerCase().includes('ecommerce')) {
      return [
        ...baseServices,
        { name: 'Inventory System', type: 'application', criticality: 9, description: 'Stock management system' },
        { name: 'Shopping Cart', type: 'service', criticality: 9, description: 'E-commerce cart service' },
        { name: 'Payment Processing', type: 'service', criticality: 10, description: 'Order payment handling' },
        { name: 'Shipping Integration', type: 'service', criticality: 7, description: 'Logistics and delivery tracking' },
      ];
    }

    return baseServices;
  }

  /**
   * Update a single service status manually
   */
  async updateServiceStatus(
    serviceId: string,
    newStatus: 'operational' | 'degraded' | 'down'
  ): Promise<void> {
    const result = await this.pool.query(
      `UPDATE configuration_items
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING game_id, name, status`,
      [newStatus, serviceId]
    );

    if (result.rows.length > 0) {
      logger.info(`Service ${result.rows[0].name} manually updated to ${newStatus}`);
    }
  }
}
