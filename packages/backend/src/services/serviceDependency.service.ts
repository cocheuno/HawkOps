import { Pool } from 'pg';

interface ServiceDependency {
  id: string;
  gameId: string;
  serviceId: string;
  serviceName: string;
  dependsOnServiceId: string;
  dependsOnServiceName: string;
  dependencyType: 'hard' | 'soft';
  impactDelayMinutes: number;
}

interface DependencyImpact {
  serviceId: string;
  serviceName: string;
  currentStatus: string;
  impactedStatus: string;
  impactType: 'direct' | 'cascade';
  sourceServiceId: string;
  sourceServiceName: string;
}

interface DependencyGraph {
  services: {
    id: string;
    name: string;
    status: string;
    criticality: number;
    dependsOn: string[];
    dependedOnBy: string[];
  }[];
  edges: {
    from: string;
    to: string;
    type: 'hard' | 'soft';
  }[];
}

export class ServiceDependencyService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get all dependencies for a game
   */
  async getDependencies(gameId: string): Promise<ServiceDependency[]> {
    const result = await this.pool.query(
      `SELECT sd.id, sd.game_id as "gameId",
              sd.service_id as "serviceId", s1.name as "serviceName",
              sd.depends_on_service_id as "dependsOnServiceId", s2.name as "dependsOnServiceName",
              sd.dependency_type as "dependencyType",
              sd.impact_delay_minutes as "impactDelayMinutes"
       FROM service_dependencies sd
       JOIN services s1 ON sd.service_id = s1.id
       JOIN services s2 ON sd.depends_on_service_id = s2.id
       WHERE sd.game_id = $1
       ORDER BY s1.name, s2.name`,
      [gameId]
    );
    return result.rows;
  }

  /**
   * Get dependency graph for visualization
   */
  async getDependencyGraph(gameId: string): Promise<DependencyGraph> {
    // Get all services
    const servicesResult = await this.pool.query(
      `SELECT id, name, status, criticality FROM services WHERE game_id = $1`,
      [gameId]
    );

    // Get all dependencies
    const depsResult = await this.pool.query(
      `SELECT service_id, depends_on_service_id, dependency_type
       FROM service_dependencies WHERE game_id = $1`,
      [gameId]
    );

    const dependsOnMap: Record<string, string[]> = {};
    const dependedOnByMap: Record<string, string[]> = {};
    const edges: { from: string; to: string; type: 'hard' | 'soft' }[] = [];

    for (const dep of depsResult.rows) {
      if (!dependsOnMap[dep.service_id]) dependsOnMap[dep.service_id] = [];
      if (!dependedOnByMap[dep.depends_on_service_id]) dependedOnByMap[dep.depends_on_service_id] = [];

      dependsOnMap[dep.service_id].push(dep.depends_on_service_id);
      dependedOnByMap[dep.depends_on_service_id].push(dep.service_id);

      edges.push({
        from: dep.service_id,
        to: dep.depends_on_service_id,
        type: dep.dependency_type
      });
    }

    const services = servicesResult.rows.map((s: any) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      criticality: s.criticality,
      dependsOn: dependsOnMap[s.id] || [],
      dependedOnBy: dependedOnByMap[s.id] || []
    }));

    return { services, edges };
  }

  /**
   * Add a dependency between services
   */
  async addDependency(
    gameId: string,
    serviceId: string,
    dependsOnServiceId: string,
    dependencyType: 'hard' | 'soft' = 'hard',
    impactDelayMinutes: number = 0
  ): Promise<ServiceDependency> {
    // Prevent circular dependencies
    const wouldCreateCircle = await this.wouldCreateCircularDependency(
      gameId, serviceId, dependsOnServiceId
    );
    if (wouldCreateCircle) {
      throw new Error('This would create a circular dependency');
    }

    const result = await this.pool.query(
      `INSERT INTO service_dependencies
       (game_id, service_id, depends_on_service_id, dependency_type, impact_delay_minutes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (service_id, depends_on_service_id) DO UPDATE
       SET dependency_type = $4, impact_delay_minutes = $5
       RETURNING id`,
      [gameId, serviceId, dependsOnServiceId, dependencyType, impactDelayMinutes]
    );

    // Fetch the full dependency info
    const fullResult = await this.pool.query(
      `SELECT sd.id, sd.game_id as "gameId",
              sd.service_id as "serviceId", s1.name as "serviceName",
              sd.depends_on_service_id as "dependsOnServiceId", s2.name as "dependsOnServiceName",
              sd.dependency_type as "dependencyType",
              sd.impact_delay_minutes as "impactDelayMinutes"
       FROM service_dependencies sd
       JOIN services s1 ON sd.service_id = s1.id
       JOIN services s2 ON sd.depends_on_service_id = s2.id
       WHERE sd.id = $1`,
      [result.rows[0].id]
    );

    return fullResult.rows[0];
  }

  /**
   * Remove a dependency
   */
  async removeDependency(dependencyId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM service_dependencies WHERE id = $1`,
      [dependencyId]
    );
  }

  /**
   * Check if adding a dependency would create a circular reference
   */
  private async wouldCreateCircularDependency(
    gameId: string,
    serviceId: string,
    dependsOnServiceId: string
  ): Promise<boolean> {
    // Use recursive CTE to find if dependsOnServiceId eventually depends on serviceId
    const result = await this.pool.query(
      `WITH RECURSIVE dep_chain AS (
         SELECT depends_on_service_id as service_id
         FROM service_dependencies
         WHERE service_id = $2 AND game_id = $1

         UNION

         SELECT sd.depends_on_service_id
         FROM service_dependencies sd
         JOIN dep_chain dc ON sd.service_id = dc.service_id
         WHERE sd.game_id = $1
       )
       SELECT 1 FROM dep_chain WHERE service_id = $3 LIMIT 1`,
      [gameId, dependsOnServiceId, serviceId]
    );

    return result.rows.length > 0;
  }

  /**
   * Calculate cascade impact when a service goes down
   */
  async calculateCascadeImpact(serviceId: string): Promise<DependencyImpact[]> {
    // Get the service info
    const serviceResult = await this.pool.query(
      `SELECT id, name, game_id, status FROM services WHERE id = $1`,
      [serviceId]
    );

    if (serviceResult.rows.length === 0) {
      throw new Error('Service not found');
    }

    const sourceService = serviceResult.rows[0];
    const impacts: DependencyImpact[] = [];

    // Find all services that depend on this service (directly or indirectly)
    const cascadeResult = await this.pool.query(
      `WITH RECURSIVE cascade AS (
         SELECT
           sd.service_id,
           sd.dependency_type,
           1 as depth
         FROM service_dependencies sd
         WHERE sd.depends_on_service_id = $1

         UNION

         SELECT
           sd.service_id,
           sd.dependency_type,
           c.depth + 1
         FROM service_dependencies sd
         JOIN cascade c ON sd.depends_on_service_id = c.service_id
         WHERE c.depth < 10
       )
       SELECT DISTINCT c.service_id, c.dependency_type, c.depth, s.name, s.status
       FROM cascade c
       JOIN services s ON c.service_id = s.id
       ORDER BY c.depth`,
      [serviceId]
    );

    for (const row of cascadeResult.rows) {
      let impactedStatus: string;
      if (row.dependency_type === 'hard') {
        impactedStatus = 'down';
      } else {
        impactedStatus = 'degraded';
      }

      impacts.push({
        serviceId: row.service_id,
        serviceName: row.name,
        currentStatus: row.status,
        impactedStatus,
        impactType: row.depth === 1 ? 'direct' : 'cascade',
        sourceServiceId: serviceId,
        sourceServiceName: sourceService.name
      });
    }

    return impacts;
  }

  /**
   * Apply cascade impact to services (simulate failure propagation)
   */
  async applyCascadeImpact(serviceId: string): Promise<DependencyImpact[]> {
    const impacts = await this.calculateCascadeImpact(serviceId);

    for (const impact of impacts) {
      // Only update if the new status is worse
      const statusOrder = { 'operational': 0, 'degraded': 1, 'down': 2 };
      const currentOrder = statusOrder[impact.currentStatus as keyof typeof statusOrder] || 0;
      const impactOrder = statusOrder[impact.impactedStatus as keyof typeof statusOrder] || 0;

      if (impactOrder > currentOrder) {
        await this.pool.query(
          `UPDATE services SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [impact.serviceId, impact.impactedStatus]
        );
      }
    }

    return impacts;
  }

  /**
   * Initialize default dependencies based on service types
   */
  async initializeDefaultDependencies(gameId: string): Promise<number> {
    // Get services by type
    const servicesResult = await this.pool.query(
      `SELECT id, name, type FROM services WHERE game_id = $1`,
      [gameId]
    );

    const servicesByType: Record<string, any[]> = {};
    for (const service of servicesResult.rows) {
      if (!servicesByType[service.type]) servicesByType[service.type] = [];
      servicesByType[service.type].push(service);
    }

    let dependenciesCreated = 0;

    // Create logical dependencies
    // Application services depend on database and network
    for (const app of (servicesByType['application'] || [])) {
      for (const db of (servicesByType['database'] || [])) {
        try {
          await this.addDependency(gameId, app.id, db.id, 'hard', 0);
          dependenciesCreated++;
        } catch (e) { /* ignore duplicates */ }
      }
      for (const network of (servicesByType['network'] || [])) {
        try {
          await this.addDependency(gameId, app.id, network.id, 'hard', 0);
          dependenciesCreated++;
        } catch (e) { /* ignore duplicates */ }
      }
    }

    // Databases depend on storage
    for (const db of (servicesByType['database'] || [])) {
      for (const storage of (servicesByType['storage'] || [])) {
        try {
          await this.addDependency(gameId, db.id, storage.id, 'hard', 0);
          dependenciesCreated++;
        } catch (e) { /* ignore duplicates */ }
      }
    }

    // Security services are soft dependencies for most services
    for (const security of (servicesByType['security'] || [])) {
      for (const app of (servicesByType['application'] || [])) {
        try {
          await this.addDependency(gameId, app.id, security.id, 'soft', 5);
          dependenciesCreated++;
        } catch (e) { /* ignore duplicates */ }
      }
    }

    return dependenciesCreated;
  }
}
