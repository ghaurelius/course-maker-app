export function runChecks(md: string){
  const issues: string[] = [];
  
  // Check for required sections
  if (!/Learning Objectives/i.test(md)) issues.push("Missing Learning Objectives section.");
  if (!/Lesson Content/i.test(md)) issues.push("Missing Lesson Content section.");
  if (!/Practice Activity/i.test(md)) issues.push("Missing Practice Activity section.");
  if (!/Reflection/i.test(md)) issues.push("Missing Reflection section.");
  
  // Check paragraph length in content sections
  const paragraphs = md.split("\n\n");
  paragraphs.forEach(p => {
    const sentences = (p.match(/[.!?]\s/g) || []).length + 1;
    if (p.trim() && sentences > 4 && !/^#/.test(p.trim())) {
      issues.push("A paragraph exceeds 4 sentences. Consider splitting for better readability.");
    }
  });
  
  // Check for empty sections
  const sections = md.split(/(?=^#)/m);
  sections.forEach(section => {
    if (section.includes('Learning Objectives') && section.split('\n').length < 4) {
      issues.push("Learning Objectives section appears too short. Add more specific objectives.");
    }
    if (section.includes('Lesson Content') && section.split('\n').length < 6) {
      issues.push("Lesson Content section appears too short. Add more detailed content.");
    }
  });
  
  return issues;
}
