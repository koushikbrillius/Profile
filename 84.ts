// 8084 For Recruit AI
 
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
import { toast } from "sonner";
import OpenAI from "openai";

const OPENAI_API_KEY = "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";

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Added this option to allow browser usage
});

export type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export const generateResponse = async (
  messages: Message[], 
  activePage: string, 
  fileContent?: string,
  userInput?: string
): Promise<string> => {
  try {
    // Prepare messages with system prompt
    let messagesWithSystemPrompt: Message[];
    
    if (activePage === 'resume-screening' || activePage === 'evaluate-applicants') {
      // For these pages, use the messages directly (which will contain the full prompt)
      messagesWithSystemPrompt = [...messages];
      
      // If there's content, append it to the prompt
      const lastUserMessageIndex = messagesWithSystemPrompt
        .map((msg, i) => msg.role === 'user' ? i : -1)
        .filter(i => i !== -1)
        .pop();
        
      if (lastUserMessageIndex !== undefined) {
        // Use the existing prompt (which should be the full prompt from getButtonPrompt)
        const basePrompt = messagesWithSystemPrompt[lastUserMessageIndex].content;
        
        // Combine the prompt with the file content and user input
        let combinedPrompt = basePrompt;
        
        // Add file content if available (these are the resumes for evaluate-applicants)
        if (fileContent && fileContent.trim() !== '') {
          combinedPrompt += `\n\n### Uploaded Resumes:\n${fileContent}`;
        }
        
        // Add user input if available (this is the job description)
        if (userInput && userInput.trim() !== '') {
          combinedPrompt += `\n\n### Job Description:\n${userInput}`;
        }
        
        messagesWithSystemPrompt[lastUserMessageIndex].content = combinedPrompt;
      }
    } else {
      // For other pages, the messages should already contain the full prompt from the button
      messagesWithSystemPrompt = [...messages];
      
      // Get the last user message to add the file content and user input
      const lastUserMessageIndex = messagesWithSystemPrompt
        .map((msg, i) => msg.role === 'user' ? i : -1)
        .filter(i => i !== -1)
        .pop();
        
      if (lastUserMessageIndex !== undefined) {
        let combinedPrompt = messagesWithSystemPrompt[lastUserMessageIndex].content;
        
        // Add file content if available
        if (fileContent && fileContent.trim() !== '') {
          combinedPrompt += `\n\nUploaded File Content:\n${fileContent}`;
        }
        
        // Add user input if available
        if (userInput && userInput.trim() !== '') {
          combinedPrompt += `\n\nUser Input Text:\n${userInput}`;
        }
        
        messagesWithSystemPrompt[lastUserMessageIndex].content = combinedPrompt;
      }
    }

    console.log('Prompt Sent:', JSON.stringify(messagesWithSystemPrompt, null, 2));

    // Using the OpenAI SDK instead of raw fetch
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messagesWithSystemPrompt,
      temperature: getTemperature(activePage),
      max_tokens: 1024,
      top_p: 1,
      frequency_penalty: 0.2,
      presence_penalty: 0
    });

    console.log('Response:', response);

    return response.choices[0].message.content || "No response from assistant.";
  } catch (error: any) {
    console.error('Error generating response:', error);
    
    // Handle rate limit errors
    if (error.status === 429) {
      toast.error('Rate limit hit. Please try again shortly.');
      return 'Rate limit exceeded. Please try again shortly.';
    }

    toast.error('Failed to generate response. Please try again.');
    return 'Sorry, I encountered an error. Please try again.';
  }
};

// Enhanced prompts for each section type - but resume-screening will NEVER use these
const getSystemPrompt = (activePage: string): string => {
  switch (activePage) {
    case 'recruiter-assistant':
      return `You are an expert resume and job description evaluator.

                From the input below:
                
                ### Step 1
                Extract and list all **key skills** mentioned in the **Job Description (JD)**.
                Label the section as: **resume requirements**
                
                ### Step 2
                Extract and list all **technical and soft skills** mentioned in the **Resume**.
                Label the section as: **candidate skills**
                
                ### Step 3
                Compare both lists and provide the following two categories:
                - ⚠️ Partially matched or related skills of candidate from JD
                - ❌ Not matched skills of candidate from JD
                
                Label the section as: **Partially matched and not matched skills of candidate from the JD**
                
                **Only output these three sections and nothing else. Do not include any introduction, explanation, commentary, or markdown formatting. Just list items under the three headings.**
                
                Important:
                - Do **not hallucinate** or assume any extra information that is not present in the input.
                - Use **only** the content provided in the Job Description and Resume.
                - If formatting is inconsistent or unstructured, extract meaningful skills as best as possible.`;
      
    case 'create-search-strings':
      return `You are an AI HR assistant specializing in creating Boolean search strings for job descriptions.
When given a job description, create effective Boolean search strings for LinkedIn, job boards, and recruiting databases.
Format your response with clear sections and examples. Keep responses concise and actionable.
For each platform, tailor the search string to its specific syntax and capabilities.
If given a resume, suggest search strings to find similar candidates.`;

    case 'resume-screening':
      // Resume-screening now NEVER uses this - only button prompts
      return '';

    case 'evaluate-applicants':
      return `You are a hiring assistant ranking candidates.
Given the job description and multiple resumes, rank them from best to worst with detailed explanations.
Highlight key strengths and weaknesses for each candidate relative to the job requirements.
Provide clear recommendations for which candidates should move forward in the process.
Create a comparison matrix of candidates vs key job requirements.
Offer suggested interview questions for each candidate based on their profile.`;

    case 'interview-prep':
      return `You are an AI HR assistant specializing in interview preparation and compliance.
When given a job description, suggest interview questions tailored to the role requirements.
Ensure questions are compliant with employment laws and best practices.
Provide guidance on evaluation criteria for candidate responses.
Include a mix of technical, behavioral, and situational questions.
If given candidate information, tailor interview questions to probe areas needing clarification.
Suggest a structured interview format with time allocations for different question types.`;
      
    case 'immigration-assistant':
      return `You are an AI assistant specializing in immigration processes and documentation.
Provide clear guidance on visa applications, requirements, and processes.
Help with understanding immigration laws, timelines, and best practices.
Format responses with clear sections and practical steps.
If presented with specific documentation, review for completeness and suggest improvements.
Be specific about required forms and evidence for different visa types.
Include information about processing times and potential challenges.`;
      
    case 'finance-assistant':
      return `You are an AI finance assistant helping with financial matters.
Provide guidance on budgeting, financial analysis, and financial planning.
Help with understanding financial concepts, reports, and calculations.
Format responses with clear sections and practical advice.
If given financial data, analyze and explain key insights.
Suggest action steps for financial improvement based on the context.
Consider tax implications and regulatory requirements in your advice.`;
      
    case 'draft-emails':
      return `You are an AI assistant specializing in drafting professional emails and communications.
When given a request, draft clear, concise, and professional emails or other communications.
Tailor the tone and content to the specific audience and purpose.
Format responses with subject lines and professional email structure.
If given previous communications, maintain consistency in tone and messaging.
Suggest alternatives for sensitive or potentially confusing language.
Format emails with appropriate greetings, body content, and closings.`;
      
    case 'chatgpt':
      return `You are an AI assistant helping with various queries and tasks.
Provide helpful, accurate, and concise responses to any questions.
Tailor your answers to be practical and actionable when possible.
Format responses with clear structure for readability.
If presented with documents or data, analyze thoroughly and provide insights.
Be conversational but professional in your responses.
Clarify assumptions when information is incomplete.`;

    default:
      return `You are an AI HR assistant helping with recruitment and hiring processes.
Provide clear, concise, and helpful responses to questions about recruiting, hiring, and HR tasks.
If given documents or specific requests, process them thoroughly and provide tailored insights.`;
  }
};

// Button-specific prompts for each section - THESE are what will be used in API calls
export const getButtonPrompt = (buttonTitle: string, pageId: string): string => {
  // Create Search Strings section
  if (pageId === 'create-search-strings' || pageId === 'recruiter-assistant') {
    switch (buttonTitle) {
      case 'Generate LinkedIn Search String':
        return `You are an expert technical recruiter skilled in crafting Boolean search strings for platforms like LinkedIn Recruiter.

                From the input below, create an optimized Boolean search string using the provided Job Description (JD).
                
                ### Objective
                Generate a precise Boolean search string that helps identify ideal candidates based on the JD. Focus on including relevant:
                - **Key skills**
                - **Technologies**
                - **Roles**
                - **Qualifications or certifications**
                - **Relevant job titles or industries**
                
                ### Guidelines
                - Use appropriate Boolean operators: **AND**, **OR**, **NOT**, and **parentheses**.
                - Avoid overly restrictive terms that could limit good candidates.
                - Group synonymous skills or roles together using **OR**.
                - Ensure the query is clean and formatted for **direct use in LinkedIn’s search bar**.
                
                ### Output
                Only output the **final Boolean string** in plain text, ready for copy-paste into LinkedIn. Do not include explanations, headers, or commentary.`;
      
      case 'Indeed/Glassdoor Search String':
        return  `You are an expert recruitment sourcer skilled at building keyword searches for job boards.

                  From the input below, create an optimized search string that works for **both** Indeed and Glassdoor.
                  
                  ### Objective
                  Generate a concise, copy-ready query that captures the core requirements of the Job Description (JD), including:
                  - **Key skills & technologies**
                  - **Essential qualifications / certifications**
                  - **Relevant job titles or seniority levels**
                  
                  ### Guidelines
                  1. Tailor the syntax to Indeed / Glassdoor (use quotes for multi-word phrases and parentheses for grouping).
                  2. Combine synonymous terms with **OR** to broaden results.
                  3. Use **AND** to link mandatory skills or titles.
                  4. Exclude obvious false-positive terms with **NOT** where appropriate.
                  5. Keep the string readable and avoid unnecessary nesting.
                  
                  ### Output
                  Provide **one plain‐text line** ready to paste into both Indeed and Glassdoor.  
                  Do **not** include any explanations, headers, or formatting—only the final query.`;
      
      case 'Generic Boolean String':
        return  `You are a sourcing expert specializing in Boolean search string creation for recruiting platforms.

                  From the input below, create a **comprehensive Boolean search string** that can be used across **multiple platforms** (e.g., LinkedIn, Indeed, Glassdoor).
                  
                  ### Objective
                  Construct a search string that captures all **essential skills**, **experience levels**, and **qualifications** outlined in the provided Job Description (JD).
                  
                  ### Guidelines
                  - Use Boolean operators: **AND**, **OR**, **NOT**, and **parentheses** to structure the logic.
                  - Group related titles, skills, or technologies using **OR**.
                  - Link mandatory criteria using **AND**.
                  - Exclude irrelevant or misleading terms using **NOT** if necessary.
                  - Optimize the string for compatibility across most major platforms (LinkedIn, Indeed, Glassdoor).
                  
                  ### Output
                  Provide a single **plain-text Boolean string** ready for copy-paste use in search bars.  
                  Do **not** include any explanation, commentary, or formatting—only the final query.`;
      
      case 'Optimize JD for ATS':
        return `You are an expert in recruitment content optimization, specializing in enhancing Job Descriptions (JDs) for Applicant Tracking Systems (ATS).

                From the input below, perform a detailed review and optimization.
                
                ### Objective
                - Analyze the Job Description and identify areas for improvement with respect to ATS compatibility, clarity, and inclusivity.
                
                ### Tasks
                1. **Highlight** all **key skills** and **requirements** that should be emphasized for better ATS parsing.
                2. **Suggest improvements** to make the JD more **scannable**, structured, and recruiter-friendly.
                3. **Identify and flag any potentially biased language**, offering neutral alternatives where applicable.
                
                ### Output
                - Provide an **optimized version** of the JD.
                - Include a **summary section** listing:
                  - Key skills and qualifications
                  - Structural enhancements
                  - Biased terms (if any) with suggested replacements
                
                ### Rules
                - Maintain professional tone and clarity.
                - Use only the content provided—do not add or assume information.
                - Output should be clean, concise, and ready for direct use in job postings.`;
      
      default:
        return `You are an expert recruitment strategist skilled in creating effective candidate sourcing queries.

                ### Objective
                Help generate effective, flexible search strings based on the provided Job Description (JD), suitable for identifying qualified candidates across platforms like LinkedIn, Indeed, and others.
                
                ### Tasks
                1. Extract the **key skills**, **titles**, and **qualifications** from the JD.
                2. Construct a **general-purpose Boolean search string** that balances relevance and reach.
                3. Format the search string with standard Boolean operators (AND, OR, NOT, parentheses) for easy adaptation across sourcing platforms.
                
                ### Output
                - Provide the **Boolean search string**.
                - Optionally suggest tips for tweaking or customizing the string based on sourcing needs.
                
                ### Rules
                - Keep the search string **platform-agnostic** but broadly compatible.
                - Do not include overly restrictive filters unless clearly present in the JD.
                - Focus on **skills, titles, and relevant experience keywords**.`;
    }
  }
  
  // Resume Screening section - ONLY THESE PROMPTS will be used for resume screening
  else if (pageId === 'resume-screening') {
    switch (buttonTitle) {
      case 'Skill Match Assessment':
        return `You are a recruitment analyst. Analyze the candidate's resume against the provided job description. Focus on how well the candidate's *skills, experience, tools, and certifications* match the job requirements. 

Return your analysis using the following structure:



📊 *1. Overall Skill Match Rating*
 - Choose one: *Excellent, **Good, **Fair, or **Poor*
 - Justify your rating briefly



🔍 *2. Matching Skills and Experience*
 - Only list skills that appear in *both* the resume *and* the job description
 - For each skill, include:
 - ✅ *Skill Name*
 - 🏢 *Company Name(s)* where it was used
 - 📅 *Total Years of Experience*



Example:
 - Python - 2 years at ABC Corp
 - AWS - 1.5 years at XYZ Ltd



🚫 *3. Notable Gaps or Missing Skills*
 - List any *key JD skills* that are *not found* in the resume
 - Mention any important experience or certifications that are missing



📈 *4. Skill Match Score*
 - Provide a percentage score *(0-100%)* based on how well the resume aligns with the JD


🎯 *5. Candidate Fit Status*
 - Use the following scale:
 - *Below 60%* → Not Fit ❌
  - *60–85%* → Partially Fit ⚠️
  - *Above 85%* → Perfect Fit ✅



📝 Be concise, structured, and directly tie your points to the job description. Use bullet points or numbered lists for clarity.`;
      
      case 'Experience Verification':
        return `You are an expert in resume verification. Analyse the candidate's resume and extract accurate employment history.  

 IMPORTANT: Today's current date is ${new Date().toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'})} (${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}).  

 📝 Output:

 Present the employment history in the following table format:

 | 🏢 Company Name | 💼 Job Title | 📅 Start Date – End Date | ⏳ Duration |
 |----------------|--------------|---------------------------|--------------|
 | [Company]      | [Title] | [Month/Year – Month/Year] | [X years Y months] |

 - Use Month/Year format for all dates.
 - If the end date is written as "Present" or similar, use ${new Date().toLocaleDateString('en-US', {month: 'long', year: 'numeric'})} as the end date.
 - Calculate the precise duration for each role using actual start and end dates — no rounding.

 ---

 🔎 Employment Gap Analysis:

 - Analyze every transition from one job to the next — starting from the earliest role in the resume to the most recent.
 - For each transition, mention:
 - The end month of the previous job
 - The start month of the next job
 - The exact gap duration in months
 - Output even zero-month gaps, clearly marked as such (e.g., “0 months – No gap”).

 ✅ Example format:
 - Gap between April 2019 and May 2019 - 1 month
 - Gap between March 2022 and March 2022 - 0 months (No gap, as the transition is within the same month)
 - Gap between June 2024 and July 2024 - 1 month

 Provide all results in a clean, structured format.`;
      
      case 'Resume Summarization':
        return  `You are a hiring assistant. Review the candidate's resume and generate a structured summary for a senior IT recruiter.

 1. Start with a 2-line executive summary highlighting:
  - Current or most recent job title and employer
  - Total years of experience
  - General industry and technical focus

 2. Then, display a table with the following fields for quick review:

 | Category       | Details                                      |
 |----------------|----------------------------------------------|
 | Job Title      | [Most recent or current job title]           |
 | Employer       | [Current or most recent company]             |
 | Experience     | [Total years of experience]                  |
 | Industries     | [Key industries worked in]                   |
 | Core Skills    | [Main tools, technologies, and methodologies]|

 🎯 Keep the tone professional and concise. Do not copy text from the resume — summarize it as if briefing a hiring manager for shortlisting.`;
      
      case 'Requirement Matching':
        return "Requirement vs Skill Match Analysis (Heading in Bold) Create a 🔎 Summary Table of Key Matches and Gaps with these columns: Requirement Match Status (Yes/No/Partial) Candidate Evidence (e.g., tool, skill, company, duration) Calculate and display a 📊 Match Score (%) out of 100. Determine and display the 📌 Fit Status based on this logic: Below 60% = Not Fit 60–85% = Partially Fit 85%+ = Perfect Fit Use the following key aspects for requirement matching , Analysis of job description Skill matching Experience comparison Fit with company culture Qualification and certification Use of technology Provide the answer directly in the specified format without additional explanations or commentary.";
      
      default:
        return "Please help me analyze this resume against the job requirements.";
    }
  }
  
  // Evaluate Applicants section
  else if (pageId === 'evaluate-applicants') {
    switch (buttonTitle) {
      case 'Compare Resumes with JD':
        return `You are an expert recruitment analyst specializing in resume and job description alignment.

                From the input below, perform the following analysis:
                
                ### Objective
                Analyze every resume in the uploaded batch and compare each one to the provided Job Description (JD). For each candidate:
                
                1. Extract and list the key skills, qualifications, and experience that match the JD requirements.
                2. Clearly highlight **direct overlaps** between the resume and the JD.
                
                ### Output Format
                Present your analysis in a  tablular ormat  with the following columns:
                - **Candidate** (Name of the candidates )
                - **Skills Overlap**
                - **Education Match**
                - **Experience Match**
                - **Summary**
                
                After the table, provide a **brief bullet-pointed alignment summary** for each candidate, based only on the content provided.
                
                ### Rules
                - Do **not hallucinate** or assume the presence of multiple resumes unless more than one resume is uploaded.
                - If only one resume is present, only that resume should be analyzed.
                - Ensure output remains **consistent and deterministic** for the same input.
                - Use **only** the information from the JD and resumes.
                - Be comprehensive and neutral in tone.`;
      
      case 'Rank & Recommend Best Fit':
        return "You are an expert recruiter. Given the Job Description (JD) and a dataset of applicant resumes, perform the following steps:\nExtract all required and preferred skills, years of experience, and qualifications from the JD.\nClearly identify each candidate by name from their resume.\nEvaluate every applicant (do not skip any):\nScore Skills Match: +1 for each exact JD skill match, +0.5 for related skills, -1 for missing required skills.\nScore Experience: 1–5 based on years and relevance (5 = exceeds JD requirements).\nScore Qualifications: +2 for each must-have credential, -2 if missing.\nCalculate a Total Score (1–10) for each candidate.\nNote key highlights (unique strengths) and key gaps versus the JD.\nReview each resume for accuracy, completeness, and consistency.\nOutput all findings in a single markdown table with these columns: Rank, Candidate, Total Score, Skills Match, Experience, Qualifications, Key Highlights, Key Gaps vs. JD, Resume Findings.\nAdd a recommendations table: Action, Candidates, Reason.\nOutput must be complete, clear, and repeatable for identical input. Do not generate text outside the tables.";
      
      case 'Highlight Missing Skills':
        return "For each resume, identify and list the skills or qualifications required by the Job Description that are missing or insufficiently demonstrated in the applicant's profile. Make sure to properly identify each candidate by name from their resume. Present the missing skills clearly for each candidate to help assess gaps. Ensure that every resume is reviewed and included in the output. Output must be clear, comprehensive, and consistent for identical input.";
      
      case 'Summarize All':
        return "Generate a concise summary for each applicant, clearly identifying them by name from their resume. Outline their overall fit for the Job Description, including strengths, relevant experience, and any notable gaps. Provide an overall assessment for each candidate to assist in quick decision-making. Review all resumes in the batch-do not skip any. Ensure the summary is clear, complete, and consistent for identical input.";
      
      default:
        return "Please help me evaluate these applicants against the job requirements.";
    }
  }
  
  // Interview Prep section
  else if (pageId === 'interview-prep') {
    switch (buttonTitle) {
      case 'Generate Interview Questions (Resume + JD)':
        return "Based on this job description and candidate resume, please generate a set of tailored interview questions that will help assess the candidate's fit. Include technical, behavioral, and situational questions specific to their background and the role requirements.";
      
      case 'Clarify Tax & Visa Terms':
        return "Please provide clear explanations about tax implications and visa requirements that might be relevant to this role. Include standard language that could be used when discussing these topics with candidates.";
      
      case 'Provide Employment Category & Docs Checklist':
        return "Based on this job description, please create a checklist of employment categories and required documentation that would be needed for onboarding. Include explanations about classification (exempt/non-exempt, contractor/employee) and compliance requirements.";
      
      default:
        return "Please help me prepare for interviewing candidates for this role.";
    }
  }
  
  return "Please analyze the information provided and give me detailed insights.";
};

const getTemperature = (activePage: string): number => {
  switch (activePage) {
    case 'create-search-strings':
    case 'resume-screening':
    case 'evaluate-applicants':
      return 0.3;
    case 'interview-prep':
      return 0.2;
    case 'immigration-assistant':
    case 'finance-assistant':
      return 0.4;
    case 'draft-emails':
      return 0.5;
    case 'chatgpt':
      return 0.3;
    default:
      return 0.7;
  }
};
