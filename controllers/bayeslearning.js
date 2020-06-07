const BayesClassifier = require('bayes-classifier');
const classifier = new BayesClassifier();
const keyword_extractor = require("keyword-extractor");
var fs = require('fs');

const bayesLearn = () => {

    const files = ['Incident', 'Problem', 'Configuration', 'Change']
    const params = {
        Incident : [],
        Problem : [],
        Configuration : [],
        Change : []
    }

    // Get keywords
    var fs = require("fs");
    files.forEach((item) => {
        var text = fs.readFileSync(item + '.txt', "utf-8");

        var textByLine = text.split("\r\n");
        textByLine.forEach((line) => {
            const keywords = keyword_extractor.extract(line, { language:"english", remove_digits: true, return_changed_case:true, remove_duplicates: false });
            keywords.forEach((keyword) => {
                params[item].push(keyword);
            })
        })
    })


    // Bayes Learning
    var fs = require("fs");
    var phrases = fs.readFileSync('Sentences.txt', 'utf-8');
    var textByLine = phrases.split("\r\n");
    files.forEach((subject) => {
        const learnedItems = [];
            textByLine.forEach((phrase) => {
            params[subject].forEach((keywords) => {
                let learnedPhrase = phrase.replace("X", keywords)
                learnedItems.push(learnedPhrase)
            })
        })
        classifier.addDocuments(learnedItems, subject)
    })

    classifier.train()

}

const handleAllocate = (message) => {

    const relatedDepartments = [];
    classifier.getClassifications(message).forEach((department, i) => {
        if (i < 2) {
            relatedDepartments.push(department.label)
        }
    })

    return relatedDepartments;

}

module.exports = {
    bayesLearn: bayesLearn,
    handleAllocate : handleAllocate
}