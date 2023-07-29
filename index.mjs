import { OpenAI } from "langchain/llms/openai";
import { PromptTemplate } from "langchain/prompts";
import { LLMChain } from "langchain/chains";
import 'zx/globals'

/**
 * Creates and returns an OpenAI instance.
 *
 * Tries to initialize an OpenAI instance using the provided API key and parameters. 
 * If successful, returns the OpenAI instance. If not, catches and logs any errors.
 * 
 * @returns {OpenAI} - The initialized OpenAI instance if successful, undefined otherwise.
 */
const model = () => {
  try {
    return new OpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      azureOpenAIApiKey: undefined,
      azureOpenAIApiInstanceName: undefined,
      azureOpenAIApiDeploymentName: undefined,
      azureOpenAIApiVersion: undefined,
      // modelName: "text-davinci-003", // Defaults to "text-davinci-003" if no model provided.
      modelName: "gpt-3.5-turbo",
      temperature: 0,
      maxTokens: 500
    });

  }
  catch (e) {
    console.log('ERROR', e)
  }

}

/**
 * Generates a conventional commit message from input text.
 * 
 * @param {string} inputText - The input text to generate the commit message from.
 * @param {string} [file] - Optional file name to include in commit scope.
 * @returns {Promise<string>} - A Promise that resolves to the generated commit message. 
 * @throws {Error} - Throws any errors encountered while generating the commit message.
 */
async function conventionalCommit(inputText, file) {
  try {
    // Use LangChain to generate a conventional commit message

    // Create a prompt with a placeholder for the commit message
    // The placeholder #~commit_message~# will be replaced with the actual commit message later
    const prompt = PromptTemplate.fromTemplate(`
    translate text provided by developer using conventional commit format following rules below
    * if text contains a file, add it as scope of the commit
    * for each period add a newline into commit.
    * if user put suffix "as <text>" the <text> must considered the commit's topic
    * answer must contain only the commit text
    
    as developer: {file} {inputText}  
  `);

    const getCommitText = new LLMChain({
      llm: model(),
      prompt,
      outputKey: "text", // For readability - otherwise the chain output will default to a property named "text"
    });

    // Generate the commit message template with the placeholder
    const result = await getCommitText.call({
      inputText: inputText,
      file: file ?? ""
    });

    return result.text;
  } catch (error) {
    console.error('Error generating the commit message:', error);
    throw error
  }
}

/**
 * Gets a list of files changed in the latest commit.
 * 
 * Calls `git diff` to get the names of changed files.
 *
 * @returns {Promise<string[]>} - A promise that resolves to an array of changed file names.
 */
const getFilesUpdated = async () => {

  const result = await $`git diff HEAD  --name-only`
  return result.stdout
            .split('\n')
            .map( file => file.trimEnd() )
            .filter(file => file.length > 0 )

}

const main = async () => { 

  if( argv._.length === 0  ) throw "Please provide input text"

  const inputText = argv._[0]
  
  $.verbose = false

  const result = await getFilesUpdated()

  if( result && result.length === 1 ) {

    const commitMessage = await conventionalCommit(inputText, `concern file ${result[0]}, ` );

    return commitMessage;
  
  }

  const commitMessage = await conventionalCommit(inputText);

  return commitMessage;

}

main()
  .then( result => console.log( result ))
  .catch( error => console.log( error))