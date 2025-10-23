// AI-powered utility functions for lead analysis

/**
 * Automatically determine lead priority based on notes and context
 * Returns: 'high' | 'medium' | 'low'
 */
export function determineLeadPriority(notes: string | null, status?: string): 'high' | 'medium' | 'low' {
  if (!notes) return 'medium';

  const lowerNotes = notes.toLowerCase();
  let score = 0;

  // High priority indicators (+3 points each)
  const highPriorityKeywords = [
    'urgent', 'asap', 'immediately', 'right away', 'critical',
    'as soon as possible', 'time sensitive', 'deadline'
  ];
  highPriorityKeywords.forEach(keyword => {
    if (lowerNotes.includes(keyword)) score += 3;
  });

  // Meeting scheduled is high priority (+4 points)
  if (lowerNotes.includes('meeting scheduled') || lowerNotes.includes('call scheduled')) {
    score += 4;
  }

  // Budget/money mentioned indicates serious interest (+2 points)
  const budgetKeywords = ['budget', 'investment', 'pricing', 'quote', 'proposal', 'contract'];
  budgetKeywords.forEach(keyword => {
    if (lowerNotes.includes(keyword)) score += 2;
  });

  // High engagement indicators (+2 points)
  const engagementKeywords = [
    'very interested', 'excited', 'ready to move forward',
    'want to proceed', 'let\'s do this', 'sign up', 'get started'
  ];
  engagementKeywords.forEach(keyword => {
    if (lowerNotes.includes(keyword)) score += 2;
  });

  // Pain points indicate urgency (+2 points)
  const painKeywords = [
    'struggling', 'frustrated', 'problem', 'issue', 'challenge',
    'need help', 'losing', 'difficult'
  ];
  painKeywords.forEach(keyword => {
    if (lowerNotes.includes(keyword)) score += 2;
  });

  // Timeline mentioned (+1 point)
  const timelineKeywords = [
    'this week', 'next week', 'this month', 'by end of',
    'within', 'before'
  ];
  timelineKeywords.forEach(keyword => {
    if (lowerNotes.includes(keyword)) score += 1;
  });

  // Decision maker involvement (+2 points)
  const decisionMakerKeywords = [
    'owner', 'ceo', 'president', 'director', 'vp',
    'decision maker', 'authorized', 'c-suite'
  ];
  decisionMakerKeywords.forEach(keyword => {
    if (lowerNotes.includes(keyword)) score += 2;
  });

  // Status-based adjustment
  if (status === 'meeting_scheduled' || status === 'proposal' || status === 'negotiation') {
    score += 3;
  } else if (status === 'qualified') {
    score += 1;
  }

  // Low priority indicators (negative points)
  const lowPriorityKeywords = [
    'just browsing', 'not sure', 'maybe later', 'thinking about',
    'no rush', 'no hurry', 'eventually', 'someday'
  ];
  lowPriorityKeywords.forEach(keyword => {
    if (lowerNotes.includes(keyword)) score -= 2;
  });

  // Determine priority based on score
  if (score >= 6) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

/**
 * Generate AI insights from notes
 */
export function generateInsights(notes: string | null): string[] {
  if (!notes) return [];

  const insights: string[] = [];
  const lowerNotes = notes.toLowerCase();

  // Check for meeting scheduled
  if (lowerNotes.includes('meeting scheduled') || lowerNotes.includes('call scheduled')) {
    const dateMatch = notes.match(/\d{4}-\d{2}-\d{2}/);
    if (dateMatch) {
      insights.push(`📅 Meeting scheduled for ${new Date(dateMatch[0]).toLocaleDateString()}`);
    } else {
      insights.push('📅 Meeting scheduled');
    }
  }

  // Check for specific interests
  if (lowerNotes.includes('crm') || lowerNotes.includes('lead tracking')) {
    insights.push('💼 Interested in CRM and lead tracking solutions');
  }
  if (lowerNotes.includes('automation') || lowerNotes.includes('ai')) {
    insights.push('🤖 Looking for AI automation solutions');
  }

  // Check for pain points
  if (lowerNotes.includes('frustrated') || lowerNotes.includes('struggling')) {
    insights.push('⚠️ Customer experiencing pain points - follow up priority');
  }

  // Check for positive engagement
  if (lowerNotes.includes('excited') || lowerNotes.includes('interested')) {
    insights.push('✨ High engagement level - strong conversion potential');
  }

  // Check for budget/pricing discussion
  if (lowerNotes.includes('budget') || lowerNotes.includes('pricing') || lowerNotes.includes('quote')) {
    insights.push('💰 Budget discussion in progress');
  }

  // Check for timeline
  if (lowerNotes.includes('urgent') || lowerNotes.includes('asap') || lowerNotes.includes('immediately')) {
    insights.push('⏰ Time-sensitive opportunity');
  }

  // Check for decision maker
  if (lowerNotes.includes('owner') || lowerNotes.includes('ceo') || lowerNotes.includes('decision maker')) {
    insights.push('👔 Speaking with decision maker');
  }

  return insights;
}
