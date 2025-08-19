// FILE: src/editor/commands.ts (new)
export function insertTemplate(editor: any, type: "LO"|"Content"|"Activity"|"Reflection"|"Quiz"){
  const templates = {
    LO: `<h3>Learning Objectives</h3>
<ol>
<li>Understand the key concepts covered in this section</li>
<li>Apply practical skills in real-world scenarios</li>
<li>Demonstrate mastery through hands-on activities</li>
</ol>`,

    Content: `<h2>Lesson Content</h2>
<p>This section introduces the main concepts and ideas that form the foundation of this lesson.</p>
<p>Start by explaining the core concept clearly and concisely. Use examples and analogies to help students understand complex ideas.</p>
<p>Build upon the basic concepts with more detailed explanations, supporting evidence, and real-world applications.</p>
<p>Conclude this section by summarizing the key points and connecting them to the learning objectives.</p>
<p></p>`,

    Activity: `<h2>Practice Activity</h2>
<p><strong>Instructions:</strong> Complete the following activity to reinforce your understanding of the lesson content.</p>
<p><strong>Task:</strong> Describe the specific task or exercise students should complete.</p>
<p><strong>Time Required:</strong> Approximately 10-15 minutes</p>
<p><strong>Materials Needed:</strong> List any resources or materials required</p>
<p></p>`,

    Reflection: `<h2>Reflection Questions</h2>
<p>Take a few minutes to reflect on what you've learned by answering these questions:</p>
<ol>
<li>What was the most important concept you learned in this lesson?</li>
<li>How can you apply this knowledge in real-world situations?</li>
<li>What questions do you still have about this topic?</li>
</ol>
<p></p>`,

    Quiz: `<h2>Knowledge Check</h2>
<p><strong>Question 1:</strong> What is the main concept covered in this lesson?</p>
<ul>
<li>A. Option one</li>
<li>B. Option two</li>
<li>C. Option three</li>
<li>D. Option four</li>
</ul>
<p><strong>Answer:</strong> [Provide correct answer and brief explanation]</p>
<p></p>`
  };
  
  const template = templates[type];
  editor.chain().focus().insertContent(template).run();
}
