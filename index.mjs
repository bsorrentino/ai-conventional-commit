import { OpenAI } from "langchain/llms/openai";
import { PromptTemplate } from "langchain/prompts";
import { LLMChain } from "langchain/chains";
import clipboard from 'node-clipboardy';

import 'zx/globals'


/**
 * prompt for question that require Yes or No. default is Yes
 * 
 * @param   {string}  message  message to display
 *
 * @return   {Promise<boolean>}         return true or false 
 */
export const askYesOrNo = async ( message ) => {
  const result = await question(`${message} (Y/n)? `)
  return (result !== 'n' && result !== 'N') 
} 

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
      maxTokens: 500,
      maxRetries: 2
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

  const fileRule = (file) ? `i have to commit file "${path.basename(file)}" ` : ''
  // const fileRule = (file) ? `* add "${path.basename(file)}" as commit's scope if no scope provided` : ''


  // * if commit file relate to documentation type is "docs"
  // * if commit file relate to code type is "feat"
  // * if commit file relate to configuration type is "build"
  // * if type is specified by developer override previous rules

  try {
    // Use LangChain to generate a conventional commit message

    // Create a prompt with a placeholder for the commit message
    // The placeholder #~commit_message~# will be replaced with the actual commit message later
    const prompt = PromptTemplate.fromTemplate(`
    translate text provided by developer using conventional commit format 
    
    <type>(<scope>): descriptions

    <type> = feat | fix | docs | style | refactor | perf | test | chore | build

    following rules below
    * scope is optional but can be specified by developer using text "(<scope>)"
    * type can be specified by developer using suffix "as <type>" or inferred based on file extension
    * for each period add a newline into commit.
    * answer must contain only the commit text
    
    as developer {file} "{inputText}"  
  `);

  const promptVars = {
    inputText: inputText,
    file: fileRule
  }

  if( argv.showPrompt ) {
    const p = await prompt.format( promptVars )
    console.log( chalk.blueBright(p) );
  }

    const getCommitText = new LLMChain({
      llm: model(),
      prompt,
      outputKey: "text", // For readability - otherwise the chain output will default to a property named "text"
    });

    // console.debug( file )

    // Generate the commit message template with the placeholder
    const result = await getCommitText.call(promptVars);

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
const getFilesToCommit = async () => {

  // const result = await $`git diff HEAD  --name-only`
  const result = await $`git diff --name-only --cached`
  
  return result.stdout
            .split('\n')
            .map( file => file.trimEnd() )
            .filter(file => file.length > 0 )

}

/**
 * @typedef {Object} CommitInfo
 * @property {boolean} commit - Whether a commit should be made
 * @property {string[]} files - Array of files to commit 
*/
/**
 * Gets information about whether a commit should be made and which files to include.
 * 
 * Checks the command line arguments to determine if a commit is requested and which files to commit.
 * 
 * @returns {Promise<CommitInfo>} - Commit information
 */
const getCommitInfo = async () => { 
  
  if (!(argv.c || argv.commit)) {
    return {
      commit: false,
      files: await getFilesToCommit()
    }
  }

  if( argv.c && typeof(argv.c)==='string' )  {
    return {
      commit: true,
      files: [argv.c]
    }
  }

  if( argv.commit && typeof(argv.commit)==='string' )  {
    return {
      commit: true,
      files: [argv.commit]
    }
  }

  return {
    commit: true,
    files: await getFilesToCommit()
  }

}

/**
 * Commits files to git with the given commit message.
 * 
 * @param {string} commitMessage - The commit message to use.
 * @param {string[]} files - Array of file paths to commit.
 * @returns {Promise} - A promise that resolves when commit is complete.
 */
const commitFiles = async (commitMessage, files) => {

  let args = [
    '-m', `"${commitMessage}"`
  ]

  if( files.length === 1 ) {
    args.push( files[0] )
  }

  await $`git commit ${args}`

}

/**
 * The main function that generates and commits a conventional commit message.
 * 
 * 1. Validates input text is provided.
 * 2. Gets commit info from getCommitInfo(). 
 * 3. Generates commit message from input text using conventionalCommit().
 * 4. Writes commit message to clipboard.
 * 5. Commits files if a commit is requested, otherwise logs commit message.
 * 
 * @returns {Promise<void>} A promise that resolves when done.
 */
const main = async () => { 

  // console.debug( argv );

  if( argv._.length === 0  ) throw "Please provide input text"

  const inputText = argv._[0]
  
  $.verbose = false

  const { commit:isCommit, files:filesToCommit }  = await getCommitInfo()

  if( filesToCommit.length === 0 ) {
    
    console.warn(chalk.yellow('no file to commit!')); 
    if( isCommit ) {
      return
    }
  }


  const file = ( filesToCommit.length === 1 ) ? filesToCommit[0]: undefined;

  const commitMessage = await conventionalCommit(inputText, file );

  // fix
  if( argv.clipboard || argv.cp ) {
    await clipboard.write( commitMessage )
  }

  $.verbose = true

  console.log( commitMessage );
  if( isCommit && await askYesOrNo( 'confirm commit') ) {
      await commitFiles( commitMessage, filesToCommit );
  }
}

main()
  .then( result => {/* do nothing */} )
  .catch( error => console.log( error))
