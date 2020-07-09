const Discord = require("discord.js");
const enums = require("./enums");

/**
 * @typedef {{name:string,question:string,timeout?:number,validate?:function(string),invalid?:string}} Question
 */


 /**
  * @param {Object} options
  * @param {Array<Question>} options.questions
  * @param {Discord.TextChannel|Discord.NewsChannel} options.channel
  * @param {Object} options.validation
  * @param {function(string): boolean} options.validation.validate
  * @param {String} options.validation.invalid Variables: {user} | Enums: INVALID_THROW
  * @param {Number} options.timeout
  * @param {Discord.User} options.user
  * @param {String} options.messageTemplate Variables: {user}, {question}
  * @param {Array<String>} options.interruptKeys List of words for interrupting the prompt
  * @param {Boolean} options.deleteAfterResponse
  * 
  * @throws
  */
async function textQuestion(options = {}) {
    if (!(options.channel instanceof Discord.TextChannel || options.channel instanceof Discord.NewsChannel)) throw "ERRICT: Invalid channel type";
    if (!(options.user instanceof Discord.User)) throw "ERRIU: Invalid user";
    if (String.call(this, options.validation) != "[object Object]") options.validation = options.validation || {};
    if (typeof options.validation.validate != "function") options.validation.validate = (i)=>()=>/.+/gm.test(i);
    if (typeof options.validation.invalid != "string") options.validation.invalid = "{user}, Invalid input.";
    if (typeof options.timeout != "number") options.timeout = 30000;
    if (typeof options.messageTemplate != "string") options.messageTemplate = "❓ {user}: {question}";
    if ((options.interruptKeys || []).length == 0) options.interruptKeys = [":exit"];
    if (typeof options.deleteAfterResponse != "boolean") options.deleteAfterResponse = false;

    let channel = options.channel;
    let currentQuestionIndex = 0;
    let results = {};
    
    async function ask() {
        let question = options.questions[currentQuestionIndex];
        if (typeof question.question == "undefined") throw "ERRIQ: Invalid question";
        if (typeof question.name == "undefined") throw "ERRIQN: Invalid question name";
        question.timeout = question.timeout || options.timeout;
        question.invalid = question.invalid || options.validation.invalid;
        if (typeof question.validate != "function") question.validate = options.validation.validate;

        let questionMessageText = options.messageTemplate.replace("{user}", options.user);
        questionMessageText = questionMessageText.replace("{question}",question.question);

        let questionMessage = await channel.send(questionMessageText);
        const responseMessage = (await channel.awaitMessages((m)=>m.author.id==options.user.id, {max: 1, time: question.timeout})).first();
        
        if (options.deleteAfterResponse) {
            if (questionMessage.deletable) questionMessage.delete();
            if (responseMessage.deletable) responseMessage.delete();
        }

        if (options.interruptKeys.some(i=>i.toLowerCase()==responseMessage.content.toLowerCase())) {
            throw "ERRIBU: Interrupted by user";
        } else {
            if (question.validate(responseMessage.content)) {
                results[question.name] = responseMessage;
                if (currentQuestionIndex+1 >= options.questions.length) {
                    return results;
                } else {
                    currentQuestionIndex++;
                    return await ask();
                }
            } else {
                if (question.invalid === enums.INVALID_THROW) throw "ERRIUI: Invalid user input.";
                let invalidMessage = await channel.send(question.invalid.replace("{user}", responseMessage.author));
                if (invalidMessage.deletable) invalidMessage.delete(5000).catch();
                return await ask();
            }
        }
        
    }

    return await ask();
}

module.exports = textQuestion;