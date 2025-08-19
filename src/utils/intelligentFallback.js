/**
 * Intelligent Fallback Content Generator
 * Creates meaningful course content from source material when AI is unavailable
 */

import { 
  createProfessionalLesson, 
  calculateOptimalLessons, 
  generateMultimediaContent 
} from './contentFormatter';

/**
 * Extract key information from source content using text analysis
 * @param {string} content - Source content to analyze
 * @returns {Object} Extracted information
 */
export const extractContentInsights = (content) => {
  if (!content || typeof content !== 'string') {
    return {
      keyTerms: [],
      concepts: [],
      examples: [],
      sections: [],
      wordCount: 0
    };
  }

  const text = content.toLowerCase();
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const words = text.split(/\s+/).filter(w => w.length > 3);
  
  // Extract key terms (words that appear frequently)
  const wordFreq = {};
  words.forEach(word => {
    const clean = word.replace(/[^\w]/g, '');
    if (clean.length > 3) {
      wordFreq[clean] = (wordFreq[clean] || 0) + 1;
    }
  });
  
  const keyTerms = Object.entries(wordFreq)
    .filter(([word, freq]) => freq > 2 && word.length > 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  // Extract potential concepts (capitalized terms, technical terms)
  const conceptPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  const concepts = [...new Set((content.match(conceptPattern) || [])
    .filter(term => term.length > 3 && term.length < 50))]
    .slice(0, 15);

  // Extract examples (sentences with "example", "for instance", etc.)
  const exampleKeywords = ['example', 'for instance', 'such as', 'like', 'including'];
  const examples = sentences.filter(sentence => 
    exampleKeywords.some(keyword => sentence.toLowerCase().includes(keyword))
  ).slice(0, 5);

  // Extract sections (look for headers, numbered items, etc.)
  const sectionPattern = /^(?:\d+\.|\*|\-|#)\s*(.+)$/gm;
  const sections = [...new Set((content.match(sectionPattern) || [])
    .map(match => match.replace(/^(?:\d+\.|\*|\-|#+)\s*/, '').trim()))]
    .slice(0, 8);

  return {
    keyTerms,
    concepts,
    examples,
    sections,
    wordCount: words.length,
    sentenceCount: sentences.length
  };
};

/**
 * Generate structured learning content from source material
 * @param {string} sourceContent - Original source content
 * @param {Object} insights - Extracted insights from content
 * @param {string} moduleTitle - Module title
 * @param {number} lessonNumber - Lesson number
 * @returns {string} Generated lesson content
 */
export const generateIntelligentFallback = (sourceContent, insights, moduleTitle, lessonNumber) => {
  const { keyTerms, concepts, examples, sections, wordCount } = insights;
  
  // Determine content complexity and structure
  const isComplex = wordCount > 500;
  const hasStructure = sections.length > 3;
  
  // Create content sections based on available material
  const contentSections = [];
  
  // Introduction section
  contentSections.push(`## Introduction

This lesson covers key concepts from the source material${concepts.length > 0 ? `, focusing on ${concepts.slice(0, 3).join(', ')}` : ''}.

**Learning Objectives:**
1. Understand the main concepts presented in the source material
2. Identify key terminology and definitions
3. Apply the concepts through practical exercises
${examples.length > 0 ? '- Analyze real-world examples and applications' : ''}
`);

  // Key Concepts section
  if (concepts.length > 0) {
    contentSections.push(`## Key Concepts

The following important concepts are covered in this lesson:

${concepts.slice(0, 8).map((concept, index) => 
  `**${index + 1}. ${concept}**\n   - Review this concept in the source material\n   - Consider how it relates to your learning goals`
).join('\n\n')}
`);
  }

  // Content Overview section
  if (hasStructure && sections.length > 0) {
    contentSections.push(`## Content Structure

The source material is organized around these main topics:

${sections.map((section, index) => `${index + 1}. ${section}`).join('\n')}

**Study Approach:** Work through each topic systematically, taking notes on key points and questions that arise.
`);
  }

  // Source Content section (chunked appropriately)
  const contentChunk = sourceContent.substring(0, isComplex ? 2000 : 1200);
  const hasMore = sourceContent.length > contentChunk.length;
  
  contentSections.push(`## Source Material Analysis

${contentChunk}${hasMore ? '\n\n*[Content continues - see full source material for complete information]*' : ''}

### Analysis Questions:
1. What are the main arguments or points presented?
2. How does this information connect to your existing knowledge?
3. What practical applications can you identify?
4. What questions does this material raise for further exploration?
`);

  // Examples section
  if (examples.length > 0) {
    contentSections.push(`## Examples and Applications

The source material includes these relevant examples:

${examples.map((example, index) => 
  `**Example ${index + 1}:** ${example.trim()}`
).join('\n\n')}

**Reflection:** Consider how these examples illustrate the key concepts and how you might apply similar approaches in your own context.
`);
  }

  // Key Terms section
  if (keyTerms.length > 0) {
    contentSections.push(`## Important Terminology

Key terms to understand from this lesson:

${keyTerms.slice(0, 8).map(term => `- **${term}**: Review how this term is used in the source material`).join('\n')}

**Activity:** Create your own definitions for these terms based on their usage in the source material.
`);
  }

  // Practice Activities section
  contentSections.push(`## Learning Activities

Complete these activities to deepen your understanding:

### 1. Concept Mapping
Create a visual map connecting the main concepts from this lesson. Show relationships and dependencies between ideas.

### 2. Summary Writing
Write a 200-word summary of the key points, using your own words to demonstrate understanding.

### 3. Application Thinking
Identify 2-3 ways you could apply the concepts from this lesson in:
- Your current work or studies
- A project you're working on
- A problem you need to solve

### 4. Question Generation
Develop 3 thoughtful questions about the material that could lead to deeper exploration or discussion.
`);

  // Assessment section
  contentSections.push(`## Knowledge Check

Test your understanding with these self-assessment questions:

1. **Comprehension:** Can you explain the main concepts in your own words?
2. **Analysis:** How do the different ideas in this lesson connect to each other?
3. **Application:** Where might you use this knowledge in real situations?
4. **Evaluation:** What aspects of this material are most/least convincing or useful?

**Self-Rating:** On a scale of 1-5, how well do you understand the material? What areas need more review?
`);

  // Next Steps section
  contentSections.push(`## Next Steps and Resources

**For Deeper Learning:**
- Review the complete source material for additional details
- Research related topics that were mentioned but not fully explored
- Seek out additional examples or case studies
- Connect with others who have experience in this area

**Note:** This lesson was created from your uploaded content when AI processing was temporarily unavailable. The content is based directly on your source material to ensure accuracy and relevance.
`);

  // Create raw content without hash tags
  const rawContent = contentSections.join('\n\n');
  
  // Use professional formatter to create well-structured lesson
  return createProfessionalLesson(
    rawContent, 
    `${moduleTitle} - Lesson ${lessonNumber}`,
    20
  );
};

/**
 * Create enhanced fallback course structure
 * @param {string} sourceContent - Source content
 * @param {Object} formData - Course form data
 * @param {Object} questionAnswers - User questionnaire answers
 * @param {Object} error - Error details
 * @returns {Object} Enhanced fallback analysis
 */
export const createEnhancedFallback = (sourceContent, formData, questionAnswers, error) => {
  const insights = extractContentInsights(sourceContent);
  
  // Use optimal lesson calculation based on content size
  const optimalStructure = calculateOptimalLessons(sourceContent, 3);
  const estimatedModules = optimalStructure.modulesCount;
  const lessonsPerModule = optimalStructure.lessonsPerModule;
  
  return {
    sourceAnalysis: {
      keyClaims: insights.concepts.slice(0, 5).length > 0 ? insights.concepts.slice(0, 5) : ['Key concepts identified from source material'],
      keyTerms: insights.keyTerms.slice(0, 8).length > 0 ? insights.keyTerms.slice(0, 8) : ['Important terminology extracted'],
      frameworks: insights.sections.length > 0 ? insights.sections.slice(0, 3) : ['Structured approach identified'],
      examples: insights.examples.length > 0 ? insights.examples.slice(0, 3) : ['Practical examples noted in source material'],
      authorVoice: 'Professional and informative based on source content'
    },
    courseBlueprint: {
      targetAudience: questionAnswers?.targetAudience || formData?.targetAudience || 'Learners seeking to understand the source material',
      prerequisites: questionAnswers?.prerequisites || ['Basic understanding of the subject matter'],
      learningOutcomes: [
        'Understand and explain the key concepts from the source material',
        'Apply the principles and methods presented in practical scenarios',
        'Analyze and evaluate the information critically',
        'Connect the learning to real-world applications'
      ],
      syllabus: insights.sections.length > 0 ? insights.sections.slice(0, 6) : [
        'Foundation concepts and terminology',
        'Core principles and methods',
        'Practical applications and examples',
        'Advanced techniques and best practices'
      ]
    },
    contentGaps: {
      missingConcepts: ['Additional context may enhance understanding'],
      needsVerification: ['Source verification and fact-checking recommended'],
      suggestedAdditions: ['Industry examples', 'Current best practices', 'Interactive exercises']
    },
    scopeOptions: {
      lite: {
        duration: `${estimatedModules * lessonsPerModule * 15} minutes`,
        modules: estimatedModules,
        focus: 'Essential concepts from source material'
      },
      core: {
        duration: `${estimatedModules * lessonsPerModule * 25} minutes`,
        modules: estimatedModules,
        focus: 'Comprehensive coverage with practical applications'
      }
    },
    contentInsights: insights,
    error: error.message,
    fallback: true,
    enhanced: true,
    timestamp: new Date().toISOString()
  };
};
