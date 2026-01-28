import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * AI Service for agent decision making
 * Uses Gemini API to generate decisions based on game context
 */
export class AIService {
  private client: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'gemini-2.0-flash-lite') {
    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  /**
   * Generate a text response
   */
  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: this.modelName,
      ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      },
    });

    return result.response.text();
  }

  /**
   * Generate a JSON response
   */
  async generateJSON<T = any>(prompt: string, systemPrompt?: string): Promise<T> {
    const fullPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON, no markdown, no explanation.`;

    const response = await this.generate(fullPrompt, systemPrompt);

    // Strip markdown code blocks if present
    let jsonText = response.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    try {
      return JSON.parse(jsonText) as T;
    } catch (error) {
      console.error('Failed to parse AI JSON response:', jsonText.substring(0, 500));
      throw new Error('AI response was not valid JSON');
    }
  }

  /**
   * Generate an implementation plan for an incident
   */
  async generateImplementationPlan(incident: {
    title: string;
    description: string;
    priority: string;
    severity: string;
  }): Promise<{
    title: string;
    description: string;
    rootCauseAnalysis: string;
    implementationSteps: Array<{ step: number; description: string }>;
    riskLevel: string;
    riskMitigation: string;
    rollbackPlan: string;
    estimatedEffortHours: number;
  }> {
    const prompt = `Generate an implementation plan for this IT incident:

Title: ${incident.title}
Description: ${incident.description}
Priority: ${incident.priority}
Severity: ${incident.severity}

Create a professional ITSM implementation plan. Return as JSON with these fields:
- title: Brief plan title
- description: Overall approach (2-3 sentences)
- rootCauseAnalysis: Analysis of why this occurred (2-3 sentences)
- implementationSteps: Array of {step: number, description: string} with 5-7 steps
- riskLevel: "low", "medium", "high", or "critical"
- riskMitigation: How to minimize risks (1-2 sentences)
- rollbackPlan: How to undo changes if needed (1-2 sentences)
- estimatedEffortHours: Number between 1 and 8`;

    return this.generateJSON(prompt, 'You are an expert IT Service Management practitioner creating implementation plans.');
  }

  /**
   * Evaluate a change request for CAB approval
   */
  async evaluateChangeRequest(change: {
    changeNumber: string;
    title: string;
    description: string;
    changeType: string;
    riskLevel: string;
    implementationPlan: string | null;
    rollbackPlan: string | null;
    affectedServices: string[] | null;
    technicalReviewNotes: string | null;
  }): Promise<{
    approve: boolean;
    notes: string;
    reasoning: string;
  }> {
    const prompt = `Evaluate this IT change request as a CAB (Change Advisory Board) member:

Change Request: ${change.changeNumber}
Title: ${change.title}
Description: ${change.description}
Type: ${change.changeType}
Risk Level: ${change.riskLevel}
Implementation Plan: ${change.implementationPlan || 'Not provided'}
Rollback Plan: ${change.rollbackPlan || 'Not provided'}
Affected Services: ${change.affectedServices?.join(', ') || 'Not specified'}
${change.technicalReviewNotes ? `Technical Review Notes: ${change.technicalReviewNotes}` : ''}

Consider:
1. Is the risk assessment accurate?
2. Is the implementation plan thorough?
3. Is the rollback plan adequate?
4. Are there any compliance concerns?

Return JSON: { "approve": boolean, "notes": "approval/rejection notes", "reasoning": "brief explanation" }`;

    return this.generateJSON(prompt, 'You are an experienced IT manager on a Change Advisory Board.');
  }

  /**
   * Generate a stakeholder response
   */
  async generateStakeholderResponse(context: {
    stakeholderName: string;
    stakeholderRole: string;
    originalMessage: string;
    incidentTitle: string;
    incidentStatus: string;
  }): Promise<{
    response: string;
    tone: string;
  }> {
    const prompt = `Generate a professional response to this stakeholder inquiry:

Stakeholder: ${context.stakeholderName} (${context.stakeholderRole})
Their Message: ${context.originalMessage}
Related Incident: ${context.incidentTitle}
Current Status: ${context.incidentStatus}

Write a professional, empathetic response that:
1. Acknowledges their concern
2. Provides a clear status update
3. Sets appropriate expectations
4. Offers next steps if applicable

Return JSON: { "response": "the full response text", "tone": "professional|empathetic|urgent" }`;

    return this.generateJSON(prompt, 'You are a skilled IT Service Desk professional.');
  }
}
