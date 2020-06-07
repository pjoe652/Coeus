const getEmails = (req, res, db) => {

	const { user } = req.body;

	db.select('*').from('staff')
	.where('email', '=', user)
	.then(data => {
		db.select('*').from('email')
		.where('department_primary', '=', data[0].department)
		.orWhere('department_secondary', '=', data[0].department)
		.then(data => {
			res.json(data);
		})
	})
}

const assignChange = (req, res, db) => {

	console.log('Assignment change received')
	const { id, changedAssigned } = req.body;
	db('email').where({ email_id : id })
	.update({
		assigned: changedAssigned
	})
	.then(update => {
		console.log("An email assigned updated")
		res.json("Successfully assignment updated")
	})
	.catch(err => {
		console.log(err)
		res.status(400).json(err)
	})

}

const statusChange = (req, res, db) => {

	console.log('Email status change received')
	const { id, changedStatus } = req.body;
	db('email').where({ email_id : id })
	.update({
		status: changedStatus
	})
	.then(update => {
		console.log("An email status updated")
		res.json("Successfully status updated")
	})
	.catch(err => {
		console.log(err)
		res.status(400).json(err)
	})

}

const replyEmail = (req, res, db, nodemailer) => {

	console.log("Reply request received")

	const { status, priority, subject, reply_id, content, assigned, client, department_primary, department_secondary } = req.body;

	let transporter = nodemailer.createTransport('smtps://testitservice123%40gmail.com:testingservices123@smtp.gmail.com');

	const email = client.split('<').pop().split('>')[0]

	let mailOptions = {
	    from: "IT Support <testitservice123@gmail.com>", // sender address
	    to: email, // list of receivers
	    subject: `RE: ${subject}`, // Subject line
	    text: content, // plaintext body
	    html: content // html body
	}

	transporter.sendMail(mailOptions, function(error, response){
		const date = new Date();
	    if(error){
	        console.log(error);
	        res.status(400).json("Your reply could not be sent")
	    }else{
	        console.log("Message sent: " + response.message);
	        
			const year = date.getFullYear();

			let month = date.getMonth();
			month++;
			if (month < 10) {
				month = '0' + month;
			}

			let day = date.getDate();
			if (day < 10) {
				day = '0' + day;
			}

			let hour = date.getHours();
			hour++;
			if (hour < 10) {
				hour = '0' + hour;
			}

			let minute = date.getMinutes();
			if (minute < 10) {
				minute = '0' + minute;
			}

			let seconds = date.getSeconds();
			if (seconds < 10) {
				seconds = '0' + seconds;
			}

			let offset = (date.getTimezoneOffset() - 60)/(-60);
			if (offset >= 0) {
				offset = '+' + offset
			}

			const dbDate = `${year}-${month}-${day} ${hour}:${minute}:${seconds}${offset}`

			console.log(dbDate)

			db('email').insert({
				status: status,
				priority: priority,
				subject: 'Re: ' + subject,
				reply_id: reply_id,
				content: content,
				sender: "IT Support <testitservice123@gmail.com>",
				positivity_rating: 0,
				assigned: assigned,
				client: client,
				time: dbDate,
				department_primary: department_primary,
				department_secondary: department_secondary
			})
			.then(update => {
				res.json("Reply Posted")
			})
			.catch(err => {
				res.status(400).json(err)
			})
	    }
	});
}


module.exports = {
	getEmails : getEmails,
	assignChange : assignChange,
	statusChange : statusChange,
	replyEmail : replyEmail
}