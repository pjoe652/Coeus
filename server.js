const express = require('express'); //Allows CRUD operations
const Sentiment = require('sentiment');
const sentiment = new Sentiment();
const bodyParser = require('body-parser'); // Parse json recieved
const cors = require('cors');
const knex = require('knex');
const nodemailer = require('nodemailer');
require('dotenv').config()

const bayes = require('./controllers/bayeslearning');
const emailParser = require('./controllers/emailParser');
const signin = require('./controllers/signin');
const email = require('./controllers/email');

const db = knex({
	client: 'pg',
	connection: {
		host: process.env.DB_HOST,
		user: process.env.DB_USERNAME,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_DATABASE,
	}
});

callUpdater();
setInterval(callUpdater, 10000);

function callUpdater() {
	let updatePromise = emailParser.autoEmailUpdater(sentiment, db, bayes);
	updatePromise.then(()=> {
		console.log("Database updated!")
	})
	.catch(() => {
		console.log("Database is up to date!")
	})
}


//Initialize learning
bayes.bayesLearn();

const app = express();
app.use(bodyParser.json());
app.use(cors());

// app.get('/update', (req, res) => { emailParser.getEmail(req, res, sentiment, db, bayes) })

app.post('/allocate', (req, res) => { bayes.handleAllocate(req, res) })

app.post('/signin', (req, res) => { signin.signin(req, res, db) })

app.post('/email', (req, res) => { email.getEmails(req, res, db) })

app.post('/reply', (req, res) => { email.replyEmail(req, res, db, nodemailer) })

app.put('/emailStatus', (req, res) => { email.statusChange(req, res, db) })

app.put('/emailAssign', (req, res) => { email.assignChange(req, res, db) })

app.listen(10002, () => {
    console.log("Server is on port 10002")
});