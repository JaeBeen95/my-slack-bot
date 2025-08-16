## 1. Readability

Make code clear and easy to understand.

### Replace Magic Numbers with Named Constants

Rule: Replace numbers with unclear meaning (magic numbers) with named constants.

Project Example: Values like Slack API's 3-second response timeout or maximum text length for AI requests should be defined as constants to clarify code intent.

### Abstract Implementation Details

Rule: Complex API integrations or logic should be abstracted into separate functions or modules.

Project Example: The complex process of creating a Notion page should be separated into a module like notionService. This way, main logic only needs to call a simple command like "create summary page in Notion", making the code cleaner.

### Separate Code Paths for Conditional Logic

Rule: If logic varies significantly based on where to save results (Slack, Notion, S3), separate into different functions.

Project Example: Rather than handling multiple destinations with if/else in one function, create dedicated functions like postToSlack, saveToNotion, uploadToS3 for each destination.

### Name Complex Conditionals

Rule: When checking multiple conditions before requesting AI summary, create variables for each condition to improve readability.

Project Example: Assign meaningful variable names for conditions like whether thread length is sufficient, if requesting user has permissions, if bot is active in the channel. Then combine these variables to determine final execution, making conditional logic immediately comprehensible.

## 2. Predictability

Make code behavior predictable from just names and parameters.

### Standardize Return Types

Rule: Functions calling external APIs should have consistent return types (e.g., success/failure objects).

Project Example: Design functions calling Slack, OpenAI, Notion APIs to all return identical success/failure structured objects. This enables consistent handling of success and failure regardless of which service API is called.

### Expose Hidden Logic (Single Responsibility Principle)

Rule: Functions should perform only the single function their name implies. Don't create hidden side effects.

Project Example: A function named fetchThreadMessages should only fetch messages. It shouldn't suddenly include hidden actions like sending AI summary requests. Main logic should explicitly call each step.

### Use Unique and Descriptive Names

Rule: When using multiple API clients, use clear names like slackApi.get or notionApi.create instead of ambiguous names like http.get.

Project Example: Objects or functions communicating with external services should have names clearly indicating which service they interact with. This makes data flow easily predictable just from reading code.

## 3. Cohesion

Keep related code together.

### Organize Code by Feature/Domain

Rule: Rather than organizing folders by code type (services, utils), organize by feature/domain (slack, notion, openai).

Project Example: All Slack-related code including API calls and message parsing should be in a slack folder. Similarly, Notion-related code should be in a notion folder, making it easy to find and modify files related to specific functionality.

### Increase Module Cohesion

Rule: Each module (file) should have one clear responsibility. Don't collect unrelated miscellaneous functions in files like utils.ts.

Project Example: Unrelated functions like date formatting, Slack message parsing, and Notion block conversion should be separated into files matching their responsibilities: dateUtils.ts, slackParser.ts, notionFormatter.ts.

## 4. Coupling

Minimize dependencies between different parts of code.

### Narrow State Management Scope

Rule: Don't create one giant config object with all settings and pass it to every function. Each function should receive only the minimal dependencies it needs.

Project Example: A function calling Notion API only needs the Notion client and database ID. Don't pass a giant config object containing API keys for Slack and OpenAI as well.

### Avoid Premature Abstraction

Rule: Even if logic looks similar now, don't hastily combine logic that might evolve differently in the future. Some duplication is better than wrong abstraction.

Project Example: "Save to Notion" and "Save to S3" both involve 'saving', but their implementations are completely different. Trying to abstract these into one save function prematurely will only increase complexity and coupling. Keeping them as separate functions is more flexible and manageable.

### Avoid Unnecessary Argument Tunneling

Rule: Don't make intermediate functions accept arguments solely for passing to other functions.

Project Example: Consider a process that summarizes and posts results to Slack. A summarizeAndPost function shouldn't accept channelId as an argument just to pass it to postToSlack if it doesn't use channelId directly. Instead, the summary function should only return summary results, and upper-level main logic should receive those results and call postToSlack with channelId.
