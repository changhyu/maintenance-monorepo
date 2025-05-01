import { GeoPoint, Node, RoadSegment } from '../../types';
import { trafficService, TrafficLevel } from '../traffic/TrafficService';
import { mapData } from '../../data/mapData';
import { calculateDistance } from '../NavigationService';

// Type definitions needed for the alternative route service
export interface RoadNode extends Node {
  visited: boolean;
  distance: number;
  previous?: RoadNode;
}

export interface Route {
  nodes: RoadNode[];
  segments: RoadSegment[];
  distance: number;
  duration: number;
  trafficLevel: number; // Average traffic level along the route
}

export interface RouteResult {
  mainRoute: Route;
  alternatives: Route[];
}

export interface AlternativeRoute {
  id: string;
  name: string;
  distance: number; // in meters
  duration: number; // in seconds
  trafficLevel: number; // 0-1 scale
  nodes: RoadNode[];
  segments: RoadSegment[];
}

export interface RoutePreference {
  avoidHighways?: boolean;
  avoidTolls?: boolean;
  avoidTraffic?: boolean;
  preferScenicRoute?: boolean;
  maxDetourPercentage?: number; // Maximum acceptable detour percentage (e.g. 20% longer than main route)
}

export class AlternativeRouteService {
  private readonly MAX_ALTERNATIVES = 3; // Maximum number of alternative routes to return
  private readonly DEFAULT_MAX_DETOUR = 30; // Default maximum detour percentage (30%)
  private readonly EMPTY_ROUTE: Route = {
    nodes: [],
    segments: [],
    distance: 0,
    duration: 0,
    trafficLevel: 0
  };

  /**
   * Find alternative routes between two points, considering traffic and preferences
   * @param start Starting geo point
   * @param end Ending geo point
   * @param preferences Route preferences
   * @returns Promise resolving to main route and alternatives
   */
  async findAlternativeRoutes(
    start: GeoPoint,
    end: GeoPoint,
    preferences: RoutePreference = {}
  ): Promise<RouteResult> {
    // Find the main route first (shortest or fastest depending on preferences)
    const mainRoute = await this.calculateRoute(start, end, preferences);
    
    // If we couldn't find a main route, return empty result
    if (!mainRoute) {
      return { mainRoute: this.EMPTY_ROUTE, alternatives: [] };
    }
    
    // Calculate alternative routes
    const alternatives: Route[] = await this.calculateAlternatives(mainRoute, preferences);
    
    return {
      mainRoute,
      alternatives
    };
  }

  /**
   * Calculate a single route between two points
   * @param start Starting geo point
   * @param end Ending geo point
   * @param preferences Route preferences
   * @returns Promise resolving to Route
   */
  private async calculateRoute(
    start: GeoPoint,
    end: GeoPoint,
    preferences: RoutePreference
  ): Promise<Route | null> {
    // Find closest nodes to start and end points
    const startNode = this.findNearestNode(start);
    const endNode = this.findNearestNode(end);
    
    if (!startNode || !endNode) {
      console.error('Failed to find nearest nodes for route calculation');
      return null;
    }
    
    // Convert Node to RoadNode for route calculation
    const roadNodes = this.prepareRoadNodes();
    
    // Find the RoadNode instances corresponding to the start and end nodes
    const sourceNode = roadNodes.find(n => n.id === startNode.id);
    const targetNode = roadNodes.find(n => n.id === endNode.id);
    
    if (!sourceNode || !targetNode) {
      console.error('Failed to convert to road nodes for route calculation');
      return null;
    }
    
    // Calculate shortest path using Dijkstra's algorithm
    const path = this.findShortestPath(roadNodes, sourceNode, targetNode, preferences);
    
    if (!path || path.length === 0) {
      console.error('No path found between given points');
      return null;
    }
    
    // Convert path to route with segments
    return this.pathToRoute(path, preferences);
  }

  /**
   * Convert a list of nodes to a complete route with segments
   * @param nodes List of nodes in the path
   * @param preferences Route preferences for traffic calculations
   * @returns Route object
   */
  private pathToRoute(nodes: RoadNode[], preferences: RoutePreference): Route {
    const segments: RoadSegment[] = [];
    let totalDistance = 0;
    let totalTrafficLevel = 0;
    
    // For each pair of consecutive nodes, find the connecting segment
    for (let i = 0; i < nodes.length - 1; i++) {
      const currentNode = nodes[i];
      const nextNode = nodes[i + 1];
      
      // Find segment connecting these two nodes
      const segment = mapData.roadSegments.find(s => 
        (s.startNodeId === currentNode.id && s.endNodeId === nextNode.id) || 
        (s.endNodeId === currentNode.id && s.startNodeId === nextNode.id && !s.oneWay)
      );
      
      if (segment) {
        segments.push(segment);
        totalDistance += segment.distance;
        
        // Add the traffic level for averaging later
        const trafficLevel = trafficService.getTrafficLevel(segment.id);
        if (trafficLevel !== TrafficLevel.CLOSED) {
          totalTrafficLevel += (trafficLevel >= 0 ? trafficLevel : 0);
        }
      }
    }
    
    // Calculate average traffic level
    const avgTrafficLevel = segments.length > 0 ? totalTrafficLevel / segments.length : 0;
    
    // Calculate duration with traffic
    const duration = this.calculateRouteDuration(segments);
    
    return {
      nodes,
      segments,
      distance: totalDistance,
      duration,
      trafficLevel: avgTrafficLevel
    };
  }

  /**
   * Calculate route duration considering traffic
   * @param segments Route segments
   * @returns Duration in seconds
   */
  private calculateRouteDuration(segments: RoadSegment[]): number {
    // Use the traffic service to estimate duration with traffic
    const segmentIds = segments.map(s => s.id);
    return trafficService.estimateRouteTime(segmentIds);
  }

  /**
   * Find the nearest road node to a given geo point
   * @param point Geo point to find nearest node for
   * @returns Nearest Node or null if none found
   */
  private findNearestNode(point: GeoPoint): Node | null {
    let nearestNode: Node | null = null;
    let minDistance = Number.MAX_VALUE;
    
    // Check all nodes to find the closest one
    for (const node of mapData.nodes) {
      const distance = calculateDistance(point, node.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearestNode = node;
      }
    }
    
    return nearestNode;
  }

  /**
   * Convert all nodes to RoadNodes for path calculation
   * @returns Array of RoadNode objects
   */
  private prepareRoadNodes(): RoadNode[] {
    return mapData.nodes.map(node => ({
      ...node,
      visited: false,
      distance: Infinity
    }));
  }

  /**
   * Find the shortest path between two nodes using Dijkstra's algorithm
   * @param nodes All road nodes in the network
   * @param startNode Starting node
   * @param endNode Target node
   * @param preferences Route preferences
   * @returns Array of nodes representing the path, or null if no path found
   */
  private findShortestPath(
    nodes: RoadNode[],
    startNode: RoadNode,
    endNode: RoadNode,
    preferences: RoutePreference
  ): RoadNode[] | null {
    // Reset all nodes
    this.resetNodes(nodes, startNode);
    
    // Create and initialize priority queue
    const queue = this.initializePriorityQueue(nodes);
    
    // Process the queue until it's empty or we've found the target
    return this.processNodeQueue(queue, endNode, preferences);
  }

  /**
   * Initialize a priority queue with all nodes
   * @param nodes All nodes in the network
   * @returns Array representing the priority queue
   */
  private initializePriorityQueue(nodes: RoadNode[]): RoadNode[] {
    return [...nodes];
  }

  /**
   * Process the node queue for Dijkstra's algorithm
   * @param queue Priority queue of nodes to process
   * @param endNode Target node
   * @param preferences Route preferences
   * @returns Path as array of nodes, or null if no path found
   */
  private processNodeQueue(
    queue: RoadNode[],
    endNode: RoadNode,
    preferences: RoutePreference
  ): RoadNode[] | null {
    while (queue.length > 0) {
      // Find node with shortest distance
      queue.sort((a, b) => a.distance - b.distance);
      const current = queue.shift();
      
      if (!current) {
        break;
      }
      
      // If we've reached the end node, we can reconstruct the path
      if (current.id === endNode.id) {
        return this.reconstructPath(current);
      }
      
      // Mark as visited
      current.visited = true;
      
      // Process all connections for this node
      this.processNodeConnections(current, queue, preferences);
    }
    
    // If we get here, no path was found
    return null;
  }

  /**
   * Process connections for a node in Dijkstra's algorithm
   * @param current Current node being processed
   * @param queue Priority queue of nodes
   * @param preferences Route preferences
   */
  private processNodeConnections(
    current: RoadNode,
    queue: RoadNode[],
    preferences: RoutePreference
  ): void {
    // Check all connected segments
    for (const connectionId of current.connections) {
      const segment = mapData.roadSegments.find(s => s.id === connectionId);
      
      // Skip invalid segments or segments that should be avoided
      if (!this.isValidSegment(segment, current, preferences)) {
        continue;
      }

      // Since isValidSegment ensures segment is valid, we know it's not undefined here
      if (segment) { // Explicit check instead of using type assertion
        const neighbor = this.getNeighborNode(segment, current, queue);
        
        // Skip invalid or already visited neighbors
        if (!neighbor) {
          continue;
        }
        
        // Calculate and potentially update the distance
        this.updateNeighborDistance(current, neighbor, segment, preferences);
      }
    }
  }

  /**
   * Check if a segment is valid for traversal
   * @param segment The segment to check
   * @param current The current node
   * @param preferences Route preferences
   * @returns Boolean indicating if the segment is valid
   */
  private isValidSegment(
    segment: RoadSegment | undefined,
    current: RoadNode,
    preferences: RoutePreference
  ): boolean {
    if (!segment) {
      return false;
    }
    
    // Skip if we should avoid highways and this is a highway
    if (preferences.avoidHighways && segment.roadType === 'highway') {
      return false;
    }
    
    // Skip if the road is closed due to traffic
    const trafficLevel = trafficService.getTrafficLevel(segment.id);
    if (trafficLevel === TrafficLevel.CLOSED) {
      return false;
    }
    
    // Skip if this is a one-way road and we're going the wrong way
    if (segment.oneWay && segment.endNodeId === current.id) {
      return false;
    }
    
    return true;
  }

  /**
   * Get the neighbor node for a segment
   * @param segment The road segment
   * @param current The current node
   * @param queue The queue of nodes
   * @returns The neighbor node or undefined if not found or already visited
   */
  private getNeighborNode(
    segment: RoadSegment,
    current: RoadNode,
    queue: RoadNode[]
  ): RoadNode | undefined {
    // Find the other node of this segment
    const otherNodeId = segment.startNodeId === current.id ? segment.endNodeId : segment.startNodeId;
    return queue.find(n => n.id === otherNodeId && !n.visited);
  }

  /**
   * Update the distance to a neighbor if a shorter path is found
   * @param current The current node
   * @param neighbor The neighbor node
   * @param segment The connecting segment
   * @param preferences Route preferences
   */
  private updateNeighborDistance(
    current: RoadNode,
    neighbor: RoadNode,
    segment: RoadSegment,
    preferences: RoutePreference
  ): void {
    // Calculate weight based on distance and traffic
    let weight = segment.distance;
    
    // Adjust weight based on traffic if we want to avoid traffic
    const trafficLevel = trafficService.getTrafficLevel(segment.id);
    if (preferences.avoidTraffic && trafficLevel > 0) {
      weight *= (1 + trafficLevel);
    }
    
    // Calculate total distance to this neighbor through current node
    const distance = current.distance + weight;
    
    // Update neighbor if we found a shorter path
    if (distance < neighbor.distance) {
      neighbor.distance = distance;
      neighbor.previous = current;
    }
  }

  /**
   * Reset nodes for path calculation
   * @param nodes All nodes in the network
   * @param startNode The starting node
   */
  private resetNodes(nodes: RoadNode[], startNode: RoadNode): void {
    // Reset all nodes
    nodes.forEach(node => {
      node.visited = false;
      node.distance = Infinity;
      node.previous = undefined;
    });
    
    // Set start node distance to 0
    startNode.distance = 0;
  }

  /**
   * Reconstruct path by following 'previous' references
   * @param endNode The end node to trace back from
   * @returns Array of nodes representing the path
   */
  private reconstructPath(endNode: RoadNode): RoadNode[] {
    const path: RoadNode[] = [];
    let current: RoadNode | undefined = endNode;
    
    // Trace back from end node to start node
    while (current) {
      path.unshift(current);
      current = current.previous;
    }
    
    return path;
  }

  /**
   * Calculate alternative routes by penalizing segments on the main route
   * @param mainRoute The main route to find alternatives for
   * @param preferences Route preferences
   * @returns Array of alternative routes
   */
  private async calculateAlternatives(
    mainRoute: Route,
    preferences: RoutePreference
  ): Promise<Route[]> {
    const alternatives: Route[] = [];
    const maxDetourPercentage = preferences.maxDetourPercentage ?? this.DEFAULT_MAX_DETOUR;
    
    // We need at least 2 nodes in the main route to find alternatives
    if (mainRoute.nodes.length < 2) {
      return alternatives;
    }
    
    // Get start and end points from main route
    const startPoint = mainRoute.nodes[0].position;
    const endPoint = mainRoute.nodes[mainRoute.nodes.length - 1].position;
    
    // Keep track of which segments we've avoided to generate unique alternatives
    const avoidedSegments: Set<string>[] = [];
    
    // Directly return the result of generating alternative routes
    return this.generateAlternativeRoutes(
      alternatives,
      mainRoute,
      startPoint,
      endPoint,
      avoidedSegments,
      maxDetourPercentage,
      preferences
    );
  }

  /**
   * Generate alternative routes with unique segment combinations
   * @param alternatives Array to store alternative routes
   * @param mainRoute The main route to find alternatives for
   * @param startPoint Start geo point
   * @param endPoint End geo point
   * @param avoidedSegments Sets of segments already avoided
   * @param maxDetourPercentage Maximum acceptable detour percentage
   * @param preferences Route preferences
   * @returns Array of alternative routes
   */
  private async generateAlternativeRoutes(
    alternatives: Route[],
    mainRoute: Route,
    startPoint: GeoPoint,
    endPoint: GeoPoint,
    avoidedSegments: Set<string>[],
    maxDetourPercentage: number,
    preferences: RoutePreference
  ): Promise<Route[]> {
    let attemptCount = 0;
    const maxAttempts = this.MAX_ALTERNATIVES * 2;
    
    for (let i = 0; i < this.MAX_ALTERNATIVES && attemptCount < maxAttempts; attemptCount++) {
      // Try to add an alternative route
      const added = await this.tryAddAlternativeRoute(
        alternatives,
        mainRoute,
        startPoint,
        endPoint,
        avoidedSegments,
        maxDetourPercentage,
        preferences
      );
      
      // If we could add a route, increment our success counter
      if (added) {
        i++;
      }
    }
    
    return alternatives;
  }

  /**
   * Try to add a new alternative route
   * @param alternatives Array to store alternative routes
   * @param mainRoute The main route to find alternatives for
   * @param startPoint Start geo point
   * @param endPoint End geo point
   * @param avoidedSegments Sets of segments already avoided
   * @param maxDetourPercentage Maximum acceptable detour percentage
   * @param preferences Route preferences
   * @returns Boolean indicating if a route was added
   */
  private async tryAddAlternativeRoute(
    alternatives: Route[],
    mainRoute: Route,
    startPoint: GeoPoint,
    endPoint: GeoPoint,
    avoidedSegments: Set<string>[],
    maxDetourPercentage: number,
    preferences: RoutePreference
  ): Promise<boolean> {
    // For each alternative, pick different segments to avoid from the main route
    const segmentsToAvoid = this.selectSegmentsToAvoid(mainRoute.segments, avoidedSegments);
    
    if (segmentsToAvoid.length === 0) {
      // No more unique segments to avoid, we can't find more alternatives
      return false;
    }
    
    avoidedSegments.push(new Set(segmentsToAvoid));
    
    // Calculate route avoiding these segments
    const altRoute = await this.calculateRouteAvoidingSegments(
      startPoint,
      endPoint,
      segmentsToAvoid,
      preferences
    );
    
    if (altRoute) {
      // Only add if it's a valid alternative (not too much longer than main route)
      const detourFactor = (altRoute.distance / mainRoute.distance) * 100 - 100;
      
      if (detourFactor <= maxDetourPercentage) {
        alternatives.push(altRoute);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Select segments from the main route to avoid when generating an alternative
   * @param mainRouteSegments Segments in the main route
   * @param alreadyAvoidedSegments Sets of segments already avoided in previous alternatives
   * @returns Array of segment IDs to avoid
   */
  private selectSegmentsToAvoid(
    mainRouteSegments: RoadSegment[],
    alreadyAvoidedSegments: Set<string>[]
  ): string[] {
    if (mainRouteSegments.length === 0) {
      return [];
    }
    
    // Start by selecting segments with highest traffic levels
    const segmentsWithTraffic = [...mainRouteSegments].sort((a, b) => {
      const trafficA = trafficService.getTrafficLevel(a.id);
      const trafficB = trafficService.getTrafficLevel(b.id);
      return (trafficB >= 0 ? trafficB : 0) - (trafficA >= 0 ? trafficA : 0);
    });
    
    // We want to avoid around 20-30% of the main route segments
    const numToAvoid = Math.max(1, Math.ceil(mainRouteSegments.length * 0.25));
    
    return this.collectSegmentsToAvoid(segmentsWithTraffic, numToAvoid, alreadyAvoidedSegments);
  }

  /**
   * Collect segments to avoid based on traffic
   * @param segmentsWithTraffic Segments sorted by traffic level
   * @param numToAvoid Number of segments to avoid
   * @param alreadyAvoidedSegments Sets of segments already avoided
   * @returns Array of segment IDs to avoid
   */
  private collectSegmentsToAvoid(
    segmentsWithTraffic: RoadSegment[],
    numToAvoid: number,
    alreadyAvoidedSegments: Set<string>[]
  ): string[] {
    // Collect segments to avoid, checking they haven't been used in same combination before
    const toAvoid: string[] = [];
    
    for (let i = 0; i < segmentsWithTraffic.length && toAvoid.length < numToAvoid; i++) {
      const segmentId = segmentsWithTraffic[i].id;
      
      // Check if this exact combination has already been used
      const wouldBeAvoidedSegments = new Set([...toAvoid, segmentId]);
      const alreadyUsed = this.isSegmentCombinationAlreadyUsed(wouldBeAvoidedSegments, alreadyAvoidedSegments);
      
      if (!alreadyUsed) {
        toAvoid.push(segmentId);
      }
    }
    
    return toAvoid;
  }

  /**
   * Check if a segment combination has already been used
   * @param candidateSet The set of segments to check
   * @param existingSets Existing sets of segments to compare against
   * @returns Boolean indicating whether the combination already exists
   */
  private isSegmentCombinationAlreadyUsed(
    candidateSet: Set<string>,
    existingSets: Set<string>[]
  ): boolean {
    for (const set of existingSets) {
      if (set.size !== candidateSet.size) {
        continue;
      }
      
      let allMatch = true;
      for (const id of candidateSet) {
        if (!set.has(id)) {
          allMatch = false;
          break;
        }
      }
      
      if (allMatch) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Calculate a route that avoids specific segments
   * @param start Starting geo point
   * @param end Ending geo point
   * @param segmentsToAvoid Segment IDs to avoid
   * @param preferences Route preferences
   * @returns Promise resolving to Route or null if no route found
   */
  private async calculateRouteAvoidingSegments(
    start: GeoPoint,
    end: GeoPoint,
    segmentsToAvoid: string[],
    preferences: RoutePreference
  ): Promise<Route | null> {
    // Clone preferences and add our segments to avoid
    const altPreferences = { ...preferences, avoidSegments: segmentsToAvoid };
    
    // Find closest nodes to start and end points
    const startNode = this.findNearestNode(start);
    const endNode = this.findNearestNode(end);
    
    if (!startNode || !endNode) {
      return null;
    }
    
    // Convert Node to RoadNode for route calculation
    const roadNodes = this.prepareRoadNodes();
    
    // Find the RoadNode instances corresponding to the start and end nodes
    const sourceNode = roadNodes.find(n => n.id === startNode.id);
    const targetNode = roadNodes.find(n => n.id === endNode.id);
    
    if (!sourceNode || !targetNode) {
      return null;
    }
    
    // Calculate path avoiding specified segments
    const path = this.findPathAvoidingSegments(roadNodes, sourceNode, targetNode, segmentsToAvoid, altPreferences);
    
    if (!path || path.length === 0) {
      return null;
    }
    
    // Convert path to route with segments
    return this.pathToRoute(path, altPreferences);
  }

  /**
   * Find path avoiding specific segments
   * @param nodes All road nodes in the network
   * @param startNode Starting node
   * @param endNode Target node
   * @param segmentsToAvoid Segment IDs to avoid
   * @param preferences Route preferences
   * @returns Array of nodes representing the path
   */
  private findPathAvoidingSegments(
    nodes: RoadNode[],
    startNode: RoadNode,
    endNode: RoadNode,
    segmentsToAvoid: string[],
    preferences: RoutePreference
  ): RoadNode[] | null {
    // Reset all nodes
    this.resetNodes(nodes, startNode);
    
    // Create and initialize priority queue
    const queue = this.initializePriorityQueue(nodes);
    
    // Process the queue until it's empty or we've found the target
    return this.processNodeQueueAvoidingSegments(queue, endNode, segmentsToAvoid, preferences);
  }

  /**
   * Process the node queue for Dijkstra's algorithm with segment avoidance
   * @param queue Priority queue of nodes to process
   * @param endNode Target node
   * @param segmentsToAvoid Segment IDs to avoid
   * @param preferences Route preferences
   * @returns Path as array of nodes, or null if no path found
   */
  private processNodeQueueAvoidingSegments(
    queue: RoadNode[],
    endNode: RoadNode,
    segmentsToAvoid: string[],
    preferences: RoutePreference
  ): RoadNode[] | null {
    while (queue.length > 0) {
      // Find node with shortest distance
      queue.sort((a, b) => a.distance - b.distance);
      const current = queue.shift();
      
      if (!current) {
        break;
      }
      
      // If we've reached the end node, we can reconstruct the path
      if (current.id === endNode.id) {
        return this.reconstructPath(current);
      }
      
      // Mark as visited
      current.visited = true;
      
      this.processNodeConnectionsAvoidingSegments(current, queue, segmentsToAvoid, preferences);
    }
    
    // If we get here, no path was found
    return null;
  }

  /**
   * Process connections for a node in path finding with segment avoidance
   * @param current Current node being processed
   * @param queue Priority queue of nodes
   * @param segmentsToAvoid Segment IDs to avoid
   * @param preferences Route preferences
   */
  private processNodeConnectionsAvoidingSegments(
    current: RoadNode,
    queue: RoadNode[],
    segmentsToAvoid: string[],
    preferences: RoutePreference
  ): void {
    // Check all connected segments
    for (const connectionId of current.connections) {
      // Skip segments we want to avoid
      if (segmentsToAvoid.includes(connectionId)) {
        continue;
      }
      
      const segment = mapData.roadSegments.find(s => s.id === connectionId);
      
      // Skip invalid segments or segments that should be avoided
      if (!this.isValidSegment(segment, current, preferences)) {
        continue;
      }

      // Since isValidSegment ensures segment is valid, we know it's not undefined here
      if (segment) { // Explicit check instead of using type assertion
        const neighbor = this.getNeighborNode(segment, current, queue);
        
        // Skip invalid or already visited neighbors
        if (!neighbor) {
          continue;
        }
        
        // Calculate and potentially update the distance
        this.updateNeighborDistance(current, neighbor, segment, preferences);
      }
    }
  }
}

// Singleton instance
export const alternativeRouteService = new AlternativeRouteService();
export default alternativeRouteService;